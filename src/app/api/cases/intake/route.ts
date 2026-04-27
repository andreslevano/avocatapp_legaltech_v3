import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Types ──────────────────────────────────────────────────────────

type ExtractionStrategy = 'text-pdf' | 'sparse-pdf' | 'image-pdf' | 'txt';

interface PDFExtractionResult {
  text: string;
  strategy: ExtractionStrategy;
  pageCount: number;
  charCount: number;
  metadata: Record<string, string>;
}

// ── Text quality thresholds ────────────────────────────────────────

const GOOD_TEXT_THRESHOLD   = 200;  // chars — reliable text extraction
const SPARSE_TEXT_THRESHOLD = 30;   // chars — some text, might be mixed

function scoreText(raw: string): number {
  // Only count alphanumeric characters (ignore whitespace/noise)
  return (raw.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g) || []).length;
}

function formatPDFDate(raw: string): string {
  // PDF dates: "D:20250115120000" → "2025-01-15"
  if (!raw) return '';
  const m = raw.replace('D:', '').match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw;
}

// ── PDF extraction with metadata ───────────────────────────────────

async function extractFromPDF(buffer: Buffer, fileName: string): Promise<PDFExtractionResult> {
  let parsed: Awaited<ReturnType<typeof pdfParse>> | null = null;

  try {
    parsed = await pdfParse(buffer, {
      // Keep the default renderer — do NOT use custom pagerender to avoid issues
      max: 0, // parse all pages
    });
  } catch (err) {
    console.error(`[intake] pdf-parse error for "${fileName}":`, err instanceof Error ? err.message : err);
  }

  // Extract PDF metadata (available even for image PDFs)
  const rawMeta = parsed?.info ?? {};
  const metadata: Record<string, string> = {};
  if (rawMeta.Title)        metadata.title        = String(rawMeta.Title);
  if (rawMeta.Author)       metadata.author       = String(rawMeta.Author);
  if (rawMeta.Subject)      metadata.subject      = String(rawMeta.Subject);
  if (rawMeta.Creator)      metadata.creator      = String(rawMeta.Creator);
  if (rawMeta.Producer)     metadata.producer     = String(rawMeta.Producer);
  if (rawMeta.CreationDate) metadata.createdAt    = formatPDFDate(String(rawMeta.CreationDate));
  if (rawMeta.ModDate)      metadata.modifiedAt   = formatPDFDate(String(rawMeta.ModDate));

  const rawText  = parsed?.text ?? '';
  const pageCount = parsed?.numpages ?? 1;
  const score     = scoreText(rawText);

  let strategy: ExtractionStrategy;
  if (score >= GOOD_TEXT_THRESHOLD) {
    strategy = 'text-pdf';
  } else if (score >= SPARSE_TEXT_THRESHOLD) {
    strategy = 'sparse-pdf';
  } else {
    strategy = 'image-pdf';
  }

  console.log(`[intake] file="${fileName}" strategy="${strategy}" chars=${score} pages=${pageCount} meta=${JSON.stringify(metadata)}`);

  return { text: rawText, strategy, pageCount, charCount: score, metadata };
}

// ── Build document context block for GPT-4o ───────────────────────

function buildDocumentBlock(result: PDFExtractionResult, fileName: string, fileSize: number): string {
  const lines: string[] = [`=== ${fileName} (${(fileSize / 1024).toFixed(1)} KB, ${result.pageCount} p.) ===`];

  // Always include metadata if available
  if (Object.keys(result.metadata).length > 0) {
    lines.push('[Metadatos PDF]');
    for (const [k, v] of Object.entries(result.metadata)) {
      lines.push(`  ${k}: ${v}`);
    }
  }

  if (result.strategy === 'image-pdf') {
    lines.push('[TIPO: PDF de imagen escaneada — sin capa de texto]');
    lines.push('[EXTRACCIÓN: Solo metadatos y nombre de archivo disponibles]');
    if (result.text.trim().length > 0) {
      // Include any sparse text we did find (headers, footers, etc.)
      lines.push('[Fragmentos de texto detectados]');
      lines.push(result.text.trim().slice(0, 500));
    }
  } else if (result.strategy === 'sparse-pdf') {
    lines.push(`[TIPO: PDF mixto — texto parcial (${result.charCount} caracteres útiles)]`);
    lines.push('[Texto extraído]');
    lines.push(result.text.trim().slice(0, 8000));
  } else {
    // text-pdf: full content
    lines.push('[Texto extraído]');
    lines.push(result.text.trim().slice(0, 8000));
  }

  return lines.join('\n');
}

// ── GPT-4o system prompt variants ────────────────────────────────

function buildSystemPrompt(hasImagePDFs: boolean): string {
  const base = `Eres un abogado experto analizando documentos para abrir un caso legal.
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones):
{
  "titulo": "Título conciso y descriptivo del caso (máx. 80 caracteres)",
  "tipo": "civil | laboral | contractual | familia | penal | sucesoral | otro",
  "cliente": "Nombre del cliente o parte que iniciará el caso (inferido del nombre del archivo o metadatos si no hay texto)",
  "deadline": "YYYY-MM-DD si hay fecha límite legal o procesal importante, o null",
  "notas": "Resumen de hechos principales en 2-3 párrafos para el expediente. Si el documento es imagen, indica qué tipo de documento parece ser y qué información pudo inferirse.",
  "resumen": "Resumen ejecutivo del caso en 2-3 frases",
  "partes": ["nombre parte 1", "nombre parte 2"],
  "riesgos": ["Riesgo o punto de atención 1", "Riesgo 2"],
  "puntosClave": ["Punto jurídico relevante 1", "Punto 2"],
  "fechasClave": ["fecha o plazo relevante 1"]
}
Extrae entre 2 y 6 riesgos y 2 y 6 puntos clave. Sé específico y accionable.`;

  if (hasImagePDFs) {
    return base + `

INSTRUCCIONES ADICIONALES para documentos de imagen:
- Si solo tienes metadatos y nombre de archivo, infiere el tipo de documento y caso a partir de ellos
- Para el campo "notas", indica explícitamente: "Documento escaneado sin OCR disponible — [descripción inferida del tipo de documento]"
- Para "riesgos", incluye siempre: "Documento en formato imagen — requiere OCR para extracción completa"
- Para "puntosClave", describe el tipo de documento inferido y la información disponible
- Haz tu mejor estimación basada en nombre del archivo, metadatos y fragmentos de texto disponibles`;
  }

  return base;
}

// ── Main route ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 });
    }

    console.log(`[intake] processing ${files.length} file(s): ${files.map(f => `${f.name}(${(f.size/1024).toFixed(1)}KB)`).join(', ')}`);

    // ── Extract text from each file ──────────────────────────────

    const extractions: Array<{ block: string; strategy: ExtractionStrategy; fileName: string }> = [];
    let hasImagePDFs = false;

    for (const file of files) {
      const arrayBuf = await file.arrayBuffer();
      const buffer   = Buffer.from(arrayBuf);
      const nameLc   = file.name.toLowerCase();

      if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
        const result = await extractFromPDF(buffer, file.name);
        const block  = buildDocumentBlock(result, file.name, file.size);
        extractions.push({ block, strategy: result.strategy, fileName: file.name });
        if (result.strategy === 'image-pdf') hasImagePDFs = true;

      } else if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) {
        const text = buffer.toString('utf-8');
        extractions.push({
          block: `=== ${file.name} ===\n${text.slice(0, 8000)}`,
          strategy: 'txt',
          fileName: file.name,
        });
        console.log(`[intake] file="${file.name}" strategy="txt" chars=${text.length}`);

      } else if (
        nameLc.endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // DOCX: try to extract text from the XML inside the ZIP
        let docxText = '';
        try {
          // DOCX is a ZIP containing word/document.xml with text in <w:t> tags
          const textContent = buffer.toString('latin1');
          const matches = textContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
          docxText = matches
            .map(m => m.replace(/<[^>]+>/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        } catch {
          docxText = '';
        }
        const quality = scoreText(docxText);
        console.log(`[intake] file="${file.name}" strategy="${quality > GOOD_TEXT_THRESHOLD ? 'text-docx' : 'image-docx'}" chars=${quality}`);

        extractions.push({
          block: `=== ${file.name} ===\n${docxText.length > 50 ? docxText.slice(0, 8000) : `[Documento Word: ${file.name} — extracción limitada]`}`,
          strategy: quality > GOOD_TEXT_THRESHOLD ? 'text-pdf' : 'image-pdf',
          fileName: file.name,
        });
        if (quality <= SPARSE_TEXT_THRESHOLD) hasImagePDFs = true;

      } else {
        extractions.push({
          block: `=== ${file.name} (${file.type || 'tipo desconocido'}) ===\n[Formato no procesable para extracción de texto]`,
          strategy: 'image-pdf',
          fileName: file.name,
        });
        hasImagePDFs = true;
        console.log(`[intake] file="${file.name}" strategy="unsupported-format"`);
      }
    }

    const combinedContext = extractions.map(e => e.block).join('\n\n');
    const strategies = extractions.map(e => ({ file: e.fileName, strategy: e.strategy }));

    console.log(`[intake] strategies: ${JSON.stringify(strategies)} hasImagePDFs=${hasImagePDFs}`);

    // ── Call GPT-4o ──────────────────────────────────────────────

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(hasImagePDFs) },
        { role: 'user',   content: `Documentos del caso:\n\n${combinedContext}` },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw   = completion.choices[0]?.message?.content ?? '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(clean);

    const elapsed = Date.now() - startTime;
    console.log(`[intake] done in ${elapsed}ms tokens=${completion.usage?.total_tokens ?? 0} requiresOcr=${hasImagePDFs}`);

    return NextResponse.json({
      result,
      // Metadata for the client to display appropriate messages
      meta: {
        strategies,
        requiresOcr: hasImagePDFs,
        extractionQuality: hasImagePDFs ? 'partial' : 'full',
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[intake] error: ${msg}`);
    return NextResponse.json(
      { error: 'Error al procesar los documentos. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
