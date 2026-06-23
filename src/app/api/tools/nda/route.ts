import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authAdmin } from '@/lib/firebase-admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NDA_SYSTEM_PROMPT = `Eres un experto redactor de Acuerdos de Confidencialidad (NDA).
Genera NDAs profesionales, completos y listos para firma, adaptados a la jurisdicción indicada.

REGLAS:
- Genera el NDA COMPLETO en tu respuesta — no omitas cláusulas.
- Usa # para el título y ## para cada cláusula numerada.
- Usa **negrita** para nombres, fechas, plazos e importes.
- Usa [COMPLETAR] donde falten datos.
- Sé conciso: incluye todas las cláusulas pero sin texto redundante.
- Adapta las referencias legales a la jurisdicción indicada.`;

interface NdaBody {
  tipo: 'unilateral' | 'bilateral';
  divulgante: { nombre: string; empresa: string; cargo: string };
  receptora: { nombre: string; empresa: string; cargo: string };
  objeto: string;
  duracion: string;
  jurisdiccion: string;
  noCompetencia: boolean;
  penalizacion: boolean;
}

function buildPrompt(body: NdaBody): string {
  const { tipo, divulgante, receptora, objeto, duracion, jurisdiccion, noCompetencia, penalizacion } = body;

  const tipoLabel = tipo === 'bilateral' ? 'BILATERAL (mutuo)' : 'UNILATERAL';
  const parteDiv = [divulgante.nombre, divulgante.empresa, divulgante.cargo].filter(Boolean).join(' — ') || '[COMPLETAR]';
  const parteRec = [receptora.nombre, receptora.empresa, receptora.cargo].filter(Boolean).join(' — ') || '[COMPLETAR]';

  const extras = [
    noCompetencia && '- No competencia',
    penalizacion  && '- Cláusula penal por incumplimiento',
  ].filter(Boolean).join('\n');

  return `Genera un NDA ${tipoLabel} completo y listo para firma.

PARTES: Divulgante: **${parteDiv}** | Receptora: **${parteRec}**
OBJETO: ${objeto}
DURACIÓN: ${duracion}
JURISDICCIÓN: ${jurisdiccion}
${extras ? `CLÁUSULAS ADICIONALES:\n${extras}` : ''}

Incluye: definición de información confidencial, obligaciones, exclusiones, limitación de uso, vigencia, devolución/destrucción de información, ausencia de licencia, indemnización${noCompetencia ? ', no competencia' : ''}${penalizacion ? ', cláusula penal' : ''}, disposiciones generales y sección de firmas.
Adapta referencias legales a la jurisdicción de ${jurisdiccion}.`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return new Response('Unauthorized', { status: 401 });

  try {
    await authAdmin().verifyIdToken(idToken);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const body = (await req.json()) as NdaBody;
  if (!body.objeto?.trim()) return new Response('Missing objeto', { status: 400 });

  const prompt = buildPrompt(body);
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2500,
          system: NDA_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            emit({ type: 'text', delta: event.delta.text });
          }
        }

        emit({ type: 'done' });
      } catch (err) {
        emit({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
