import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface EmailAnalysisResult {
  categoria: string;
  urgencia: 'alta' | 'media' | 'baja';
  resumen: string;
  partesInvolucradas: string[];
  fechasClave: string[];
  accionesRequeridas: string[];
  riesgoLegal: string;
  adjuntosRelevantes: string[];
  sugerenciaCaso: {
    titulo: string;
    tipo: 'civil' | 'laboral' | 'contractual' | 'familia' | 'penal' | 'sucesoral' | 'otro';
    notas: string;
    cliente: string;
  };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await authAdmin().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { subject, from, to, date, body, attachments = [] } = (await req.json()) as {
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    attachments?: string[];
  };

  const prompt = `Analiza el siguiente email con perspectiva jurídica y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "categoria": "tipo de email (notificación legal, demanda, contrato, comunicación comercial, requerimiento, etc.)",
  "urgencia": "alta | media | baja",
  "resumen": "resumen en 2-3 frases del contenido y contexto jurídico",
  "partesInvolucradas": ["nombre o entidad 1", "nombre o entidad 2"],
  "fechasClave": ["fecha o plazo relevante mencionado"],
  "accionesRequeridas": ["acción concreta 1", "acción 2"],
  "riesgoLegal": "descripción del riesgo legal, o 'Sin riesgo aparente'",
  "adjuntosRelevantes": ["nombre de adjunto relevante"],
  "sugerenciaCaso": {
    "titulo": "título propuesto para el expediente",
    "tipo": "civil | laboral | contractual | familia | penal | sucesoral | otro",
    "notas": "notas relevantes para el caso extraídas del email",
    "cliente": "nombre del cliente o contraparte principal"
  }
}

Email:
De: ${from}
Para: ${to}
Fecha: ${date}
Asunto: ${subject}
${attachments.length ? `Adjuntos: ${attachments.join(', ')}` : ''}

Cuerpo:
${body.slice(0, 6000)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result: EmailAnalysisResult = JSON.parse(clean);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
