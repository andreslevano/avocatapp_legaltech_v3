import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── System prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un abogado experto analizando documentos para abrir un caso legal.
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones):
{
  "titulo": "Título conciso y descriptivo del caso (máx. 80 caracteres)",
  "tipo": "civil | laboral | contractual | familia | penal | sucesoral | otro",
  "cliente": "Nombre del cliente o parte que iniciará el caso",
  "deadline": "YYYY-MM-DD si hay fecha límite legal o procesal importante, o null",
  "notas": "Resumen de hechos principales en 2-3 párrafos para el expediente",
  "resumen": "Resumen ejecutivo del caso en 2-3 frases",
  "partes": ["nombre parte 1", "nombre parte 2"],
  "riesgos": ["Riesgo o punto de atención 1", "Riesgo 2"],
  "puntosClave": ["Punto jurídico relevante 1", "Punto 2"],
  "fechasClave": ["fecha o plazo relevante 1"]
}
Extrae entre 2 y 6 riesgos y 2 y 6 puntos clave. Sé específico y accionable.`;

// ── Route handler — accepts pre-extracted text from client ────────

interface IncomingDocument {
  name: string;
  text: string;
  size: number;
  strategy: string; // 'text-pdf' | 'ocr' | 'txt' | 'docx' | 'unsupported'
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json() as { documents: IncomingDocument[] };
    const { documents } = body;

    if (!documents?.length) {
      return NextResponse.json({ error: 'No se recibieron documentos' }, { status: 400 });
    }

    console.log(`[intake] ${documents.length} doc(s): ${documents.map(d => `${d.name}[${d.strategy}]`).join(', ')}`);

    // Build context sections
    const sections = documents.map(d => {
      const sizeKb = (d.size / 1024).toFixed(1);
      const lines = [`=== ${d.name} (${sizeKb} KB · ${d.strategy}) ===`];
      const text = d.text?.trim();
      if (text && text.length > 20) {
        lines.push(text.slice(0, 8000));
      } else {
        lines.push('[Sin texto extraíble]');
      }
      return lines.join('\n');
    });

    const combinedContext = sections.join('\n\n');
    const totalChars = documents.reduce((sum, d) => sum + (d.text?.length ?? 0), 0);

    console.log(`[intake] total chars=${totalChars} strategies=${JSON.stringify(documents.map(d => d.strategy))}`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Documentos del caso:\n\n${combinedContext}` },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw   = completion.choices[0]?.message?.content ?? '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(clean);

    console.log(`[intake] done in ${Date.now() - startTime}ms tokens=${completion.usage?.total_tokens ?? 0}`);

    return NextResponse.json({ result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[intake] error: ${msg}`);
    return NextResponse.json({ error: 'Error al analizar los documentos.' }, { status: 500 });
  }
}
