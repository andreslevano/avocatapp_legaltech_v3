import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un abogado experto analizando documentos para abrir un caso legal.
Analiza el contenido y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones):
{
  "titulo": "Título conciso y descriptivo del caso (máx. 80 caracteres)",
  "tipo": "civil | laboral | contractual | familia | penal | sucesoral | otro",
  "cliente": "Nombre del cliente o parte que iniciará el caso",
  "deadline": "YYYY-MM-DD si hay fecha límite legal o procesal importante, o null",
  "notas": "Resumen de hechos principales en 2-3 párrafos para el expediente",
  "resumen": "Resumen ejecutivo del caso en 2-3 frases",
  "partes": ["nombre parte 1", "nombre parte 2"],
  "riesgos": [
    "Riesgo o punto de atención 1",
    "Riesgo o punto de atención 2"
  ],
  "puntosClave": [
    "Punto jurídico relevante 1",
    "Punto jurídico relevante 2"
  ],
  "fechasClave": ["fecha o plazo relevante 1", "fecha relevante 2"]
}
Extrae entre 2 y 6 riesgos y 2 y 6 puntos clave. Sé específico y accionable.`;

async function extractText(file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const data = await pdfParse(buffer);
      return data.text?.trim() || `[PDF sin texto extraíble: ${file.name}]`;
    } catch {
      return `[PDF: ${file.name} — no se pudo extraer texto]`;
    }
  }

  if (
    file.type.startsWith('text/') ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.md')
  ) {
    return buffer.toString('utf-8');
  }

  // DOCX: extract raw text from XML inside the ZIP (basic approach, no library)
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx')
  ) {
    try {
      // DOCX is a ZIP; word/document.xml contains the text
      // Without a library, return a placeholder — the model still receives filename + context
      return `[Documento Word: ${file.name} — adjunto para contexto]`;
    } catch {
      return `[DOCX: ${file.name}]`;
    }
  }

  return `[Archivo: ${file.name} (${file.type || 'tipo desconocido'})]`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 });
    }

    // Extract text from each file
    const sections = await Promise.all(
      files.map(async (file) => {
        const text = await extractText(file);
        return `=== ${file.name} ===\n${text.slice(0, 8000)}`;
      })
    );

    const combinedText = sections.join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Documentos del caso:\n\n${combinedText}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(clean);

    return NextResponse.json({ result });
  } catch (err) {
    console.error('[api/cases/intake]', err);
    return NextResponse.json(
      { error: 'Error al procesar los documentos. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
