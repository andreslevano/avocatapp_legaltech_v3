import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un experto jurídico. Analiza el documento proporcionado y devuelve un JSON con la siguiente estructura exacta (sin markdown):
{
  "resumen": "Resumen ejecutivo del documento en 2-3 párrafos",
  "tipo": "Tipo de documento legal",
  "partes": ["parte 1", "parte 2"],
  "fechasClave": ["fecha relevante 1", "fecha relevante 2"],
  "riesgos": ["riesgo o punto de atención 1", "riesgo 2"],
  "recomendaciones": ["recomendación 1", "recomendación 2"],
  "clausulasClave": ["cláusula o artículo importante 1", "cláusula 2"]
}
Si algún campo no aplica o no se puede determinar, usa un array vacío [] o string vacío.`;

export async function POST(req: NextRequest) {
  try {
    const { text, fileName } = await req.json() as { text: string; fileName?: string };
    if (!text?.trim()) return NextResponse.json({ error: 'No se proporcionó texto' }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Documento: ${fileName ?? 'Sin nombre'}\n\n${text.slice(0, 12000)}` },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(clean);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('[api/tools/analisis]', err);
    return NextResponse.json({ error: 'Error al analizar el documento' }, { status: 500 });
  }
}
