import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { FieldValue } from 'firebase-admin/firestore';
import { db, authAdmin } from '@/lib/firebase-admin';
import { generateEmbedding } from '@/lib/vertex-embeddings';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NDA_SYSTEM_PROMPT = `Eres un experto redactor de Acuerdos de Confidencialidad (NDA / Acuerdo de No Divulgación) para operaciones empresariales internacionales.
Tu función es generar NDAs completos, profesionales y listos para firma, adaptados a la jurisdicción y el derecho local indicado.

REGLA CRÍTICA:
- SIEMPRE genera el NDA COMPLETO en tu respuesta — nunca resumas ni omitas cláusulas.
- Usa # para el título principal y ## para cada cláusula numerada.
- Usa **negrita** para los nombres de las partes, fechas, plazos e importes clave.
- Donde falten datos específicos, usa [COMPLETAR].
- El documento debe ser firmable directamente sin necesidad de edición adicional.
- Adapta la terminología y las referencias normativas a la jurisdicción indicada.`;

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

function buildPrompt(body: NdaBody, existingNdas: string[]): string {
  const { tipo, divulgante, receptora, objeto, duracion, jurisdiccion, noCompetencia, penalizacion } = body;

  const tipoLabel = tipo === 'bilateral'
    ? 'BILATERAL (ambas partes se obligan recíprocamente)'
    : 'UNILATERAL (solo la parte receptora queda obligada)';

  const parteDiv = [divulgante.nombre, divulgante.empresa, divulgante.cargo].filter(Boolean).join(' — ');
  const parteRec = [receptora.nombre, receptora.empresa, receptora.cargo].filter(Boolean).join(' — ');

  const extras = [
    noCompetencia && '- Cláusula de no competencia durante la vigencia del acuerdo',
    penalizacion  && '- Cláusula penal económica por incumplimiento',
  ].filter(Boolean).join('\n');

  const contextBlock = existingNdas.length > 0
    ? `\nEl usuario tiene NDAs previos en su repositorio (${existingNdas.join(', ')}). Toma su estructura y cláusulas como referencia y mejóralos para este nuevo acuerdo.\n`
    : '';

  return `Genera un ACUERDO DE CONFIDENCIALIDAD (NDA) de tipo ${tipoLabel}.

**PARTES:**
- Parte Divulgante: **${parteDiv || '[COMPLETAR]'}**
- Parte Receptora: **${parteRec || '[COMPLETAR]'}**

**OBJETO Y CONTEXTO:**
${objeto}

**DURACIÓN:** ${duracion}

**JURISDICCIÓN Y LEY APLICABLE:** ${jurisdiccion}
${extras ? `\n**CLÁUSULAS ADICIONALES REQUERIDAS:**\n${extras}` : ''}
${contextBlock}
Incluye TODAS las cláusulas estándar de un NDA profesional:
1. Objeto y definición de Información Confidencial
2. Obligaciones de confidencialidad y estándar de cuidado
3. Exclusiones de la obligación de confidencialidad
4. Limitación de uso — la información solo puede usarse para el propósito indicado
5. Vigencia y término del acuerdo
6. Devolución o destrucción de información
7. Ausencia de licencia o transferencia de derechos
8. Indemnización y responsabilidad por incumplimiento
${noCompetencia ? '9. No competencia\n' : ''}${penalizacion ? '10. Cláusula penal\n' : ''}
- Disposiciones generales (modificaciones, nulidad parcial, renuncia)
- Sección de firmas con espacio para nombre, cargo, fecha y firma de cada parte

Adapta todas las referencias legales (plazos de prescripción, normativa de protección de datos, régimen de daños) a la jurisdicción de **${jurisdiccion}**.`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return new Response('Unauthorized', { status: 401 });

  let uid: string;
  try {
    uid = (await authAdmin().verifyIdToken(idToken)).uid;
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const body = (await req.json()) as NdaBody;
  if (!body.objeto?.trim()) return new Response('Missing objeto', { status: 400 });

  // Search user's repository for existing NDAs to use as reference
  let existingNdas: string[] = [];
  try {
    const queryVector = await generateEmbedding(
      'NDA acuerdo de confidencialidad no divulgación secreto empresarial',
      'RETRIEVAL_QUERY',
    );
    const snap = await db()
      .collection('documents')
      .findNearest('embedding', FieldValue.vector(queryVector), {
        limit: 8,
        distanceMeasure: 'COSINE',
        distanceResultField: 'score',
      })
      .get();

    existingNdas = snap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .filter((d): d is Record<string, string> => d.userId === uid)
      .slice(0, 3)
      .map(d => d.name as string)
      .filter(Boolean);
  } catch {
    // Vector search unavailable — proceed without repository context
  }

  const prompt = buildPrompt(body, existingNdas);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Emit repository search result so the UI can show it
        emit({ type: 'repo_check', found: existingNdas.length, names: existingNdas });

        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
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
