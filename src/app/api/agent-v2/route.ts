import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { FieldValue } from 'firebase-admin/firestore';
import { db, authAdmin } from '@/lib/firebase-admin';
import { buildSystemPrompt } from '@/lib/agent-prompts';
import { generateEmbedding } from '@/lib/vertex-embeddings';

// ── CORS ─────────────────────────────────────────────────────────────────────
// agent-v2 is called directly from the browser to the Cloud Run URL (bypassing
// Firebase Hosting's 60-second proxy timeout). CORS headers are required.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Anthropic client ────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_casos',
    description:
      'Lista y busca los casos del usuario en Firestore. ' +
      'Pasa query="" o "todos" para obtener todos los casos. ' +
      'Pasa un término específico (cliente, tipo, referencia) para filtrar. ' +
      'El estado se devuelve en inglés (active, urgent, closed, archived) — tradúcelo al responder. ' +
      'Úsalo siempre que el usuario pregunte por sus casos o expedientes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda. Usa "" o "todos" para listar todos los casos sin filtrar.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_documentos_caso',
    description:
      'Recupera los documentos asociados a un caso específico del usuario (nombre, tipo, URL de descarga). ' +
      'Úsalo cuando necesites conocer qué documentos tiene un caso antes de redactar o analizar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso en Firestore (obtenido previamente con buscar_casos)',
        },
      },
      required: ['case_id'],
    },
  },
  {
    name: 'buscar_documentos_propios',
    description:
      'Busca en los documentos propios del usuario (subidos o generados por IA) usando similitud semántica. ' +
      'Devuelve fragmentos relevantes con nombre del archivo, caso asociado y extracto de contenido. ' +
      'Úsalo cuando el usuario pregunte por el contenido de sus propios documentos o archivos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Consulta en lenguaje natural sobre el contenido de los documentos',
        },
        case_id: {
          type: 'string',
          description: 'Filtrar solo por documentos de un caso específico (opcional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_normativa_jurisprudencia',
    description:
      'Busca normativa española (Código Civil, LEC, legislación laboral) y jurisprudencia del ' +
      'Tribunal Supremo relevante para la consulta. Filtra por jurisdicción ES y área legal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Consulta legal en lenguaje natural',
        },
        areas: {
          type: 'array',
          items: { type: 'string' },
          description: "Áreas a filtrar: 'civil', 'laboral', 'contractual'",
        },
      },
      required: ['query'],
    },
  },
];

// ── Tool executor ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  uid: string,
  userCountry: string = 'España',
): Promise<unknown> {
  try {
    switch (name) {
      case 'buscar_casos': {
        const q = String(input.query ?? '').toLowerCase().trim();

        // Spanish → English status synonyms so "activos"/"urgentes" etc. match stored values
        const STATUS_SYNONYMS: Record<string, string> = {
          activo: 'active', activos: 'active',
          urgente: 'urgent', urgentes: 'urgent',
          cerrado: 'closed', cerrados: 'closed',
          archivado: 'archived', archivados: 'archived',
        };

        const snap = await db().collection('cases').where('userId', '==', uid).get();
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Record<string, unknown>);

        // Broad terms → return all cases (let Claude filter by status/type)
        const BROAD_TERMS = ['todos', 'todas', 'mis casos', 'mis expedientes', 'lista', 'listar', ''];
        const isBroad = BROAD_TERMS.some(t => q === t) || q.length <= 2;

        const matches = (isBroad ? all : all.filter(c => {
          const statusEn = String(c.status ?? '').toLowerCase();
          const haystack = [c.title, c.type, c.client, c.notes, c.ref, statusEn]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return q.split(/\s+/).some(term => {
            const mapped = STATUS_SYNONYMS[term] ?? term;
            return haystack.includes(mapped) || haystack.includes(term);
          });
        }))
          .slice(0, 10)
          .map(c => ({
            id: c.id,
            title: c.title,
            type: c.type,
            status: c.status,
            client: c.client,
            ref: c.ref,
            deadline: c.deadline
              ? (c.deadline as { toDate: () => Date }).toDate().toISOString().split('T')[0]
              : null,
          }));
        if (matches.length === 0) {
          // Return all as fallback so Claude can reason about the empty state
          const fallback = all.slice(0, 10).map(c => ({
            id: c.id, title: c.title, type: c.type, status: c.status,
            client: c.client, ref: c.ref, deadline: null,
          }));
          return fallback.length > 0
            ? { note: `Sin coincidencias exactas para "${input.query}". Casos disponibles:`, cases: fallback }
            : { message: 'No se encontraron casos registrados para este usuario.' };
        }
        return matches;
      }

      case 'buscar_documentos_caso': {
        const caseId = String(input.case_id ?? '').trim();
        if (!caseId) return { error: 'case_id es requerido' };
        const snap = await db()
          .collection('documents')
          .where('userId', '==', uid)
          .where('caseId', '==', caseId)
          .get();
        const docs = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            type: data.type,
            size: data.size,
            downloadUrl: data.downloadUrl,
            source: data.source, // 'generated' | 'uploaded'
            createdAt: data.createdAt
              ? (data.createdAt as { toDate: () => Date }).toDate().toISOString().split('T')[0]
              : null,
          };
        });
        return docs.length > 0
          ? docs
          : { message: `No se encontraron documentos para el caso "${caseId}".` };
      }

      case 'buscar_documentos_propios': {
        const query = String(input.query ?? '').trim();
        if (!query) return { error: 'query es requerido' };

        try {
          const queryVector = await generateEmbedding(query, 'RETRIEVAL_QUERY');

          const vectorQuery = db()
            .collection('documents')
            .findNearest(
              'embedding',
              FieldValue.vector(queryVector),
              { limit: 10, distanceMeasure: 'COSINE', distanceResultField: 'score' },
            );

          const snap = await vectorQuery.get();
          if (snap.empty) {
            return { message: 'No se encontraron documentos relevantes.' };
          }

          // SECURITY: post-filter by owner — Admin SDK bypasses Firestore rules
          const caseFilter = input.case_id ? String(input.case_id) : null;
          const results = snap.docs
            .map(d => {
              const data = d.data();
              return {
                id: d.id,
                userId: data.userId as string,
                name: data.name as string,
                type: data.type as string,
                caseId: (data.caseId as string | null) ?? null,
                downloadUrl: data.downloadUrl as string,
                source: data.source as string,
                score: data.score as number | undefined,
              };
            })
            .filter(d => d.userId === uid)
            .filter(d => !caseFilter || d.caseId === caseFilter)
            .slice(0, 5)
            .map(({ userId: _u, ...rest }) => rest);

          return results.length > 0
            ? results
            : { message: 'No se encontraron documentos relevantes para esta consulta.' };
        } catch (ragErr) {
          const msg = (ragErr as Error).message ?? '';
          if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
            return {
              message:
                'El índice vectorial de documentos aún se está construyendo. ' +
                'Inténtalo de nuevo en unos minutos.',
            };
          }
          throw ragErr;
        }
      }

      case 'buscar_normativa_jurisprudencia': {
        const query = String(input.query ?? '').trim();
        if (!query) return { error: 'query es requerido' };

        try {
          // Generate query embedding via Vertex AI text-embedding-005
          const queryVector = await generateEmbedding(query, 'RETRIEVAL_QUERY');

          // Firestore Vector Search — top 20 by cosine similarity
          const vectorQuery = db()
            .collection('legal_chunks')
            .findNearest(
              'embedding',
              FieldValue.vector(queryVector),
              { limit: 20, distanceMeasure: 'COSINE', distanceResultField: 'similarity' },
            );

          const snap = await vectorQuery.get();
          if (snap.empty) {
            return {
              message: 'No se encontraron resultados en el corpus jurídico español para esta consulta.',
            };
          }

          // Post-filter by requested areas, return top 5
          const requestedAreas = Array.isArray(input.areas)
            ? (input.areas as string[])
            : [];

          const results = snap.docs
            .map(d => {
              const data = d.data();
              return {
                lawName: data.lawName as string,
                lawShort: data.lawShort as string,
                articleNumber: data.articleNumber as string,
                sectionTitle: data.sectionTitle as string,
                content: (data.content as string).slice(0, 800), // trim for context window
                sourceUrl: data.sourceUrl as string,
                sourceType: data.sourceType as string,
                areas: data.areas as string[],
                tribunal: data.tribunal as string | undefined,
                sala: data.sala as string | undefined,
                fecha: data.fecha as string | undefined,
                ecli: data.ecli as string | undefined,
                similarity: data.similarity as number | undefined,
              };
            })
            .filter(r =>
              requestedAreas.length === 0 ||
              r.areas.some(a => requestedAreas.includes(a)),
            )
            .slice(0, 5);

          // Country-awareness: warn if user's country is not Spain
          const SPAIN_VARIANTS = ['españa', 'spain', 'es'];
          const isSpain = SPAIN_VARIANTS.some(v =>
            (userCountry ?? '').toLowerCase().includes(v),
          );

          if (!isSpain) {
            return {
              aviso_pais: `Tu país de operación es **${userCountry}**. El corpus jurídico de Avocat cubre actualmente solo legislación y jurisprudencia española. Los resultados siguientes son de derecho español, que puede diferir significativamente del ordenamiento jurídico de ${userCountry}. Se añadirá documentación legal local para tu país próximamente.`,
              resultados_espana: results,
            };
          }

          return results;
        } catch (ragErr) {
          const msg = (ragErr as Error).message ?? '';
          // If vector index not yet built, return helpful message
          if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
            return {
              message:
                'El índice vectorial de Firestore aún se está construyendo (~30 min). ' +
                'Inténtalo de nuevo en unos minutos.',
            };
          }
          // If no chunks ingested yet
          if (msg.includes('collection') || msg.includes('not found')) {
            return {
              message:
                'El corpus jurídico español aún no ha sido ingestado. ' +
                'Ejecuta: npx ts-node --project tsconfig.scripts.json scripts/ingest-spain-legal.ts',
            };
          }
          throw ragErr;
        }
      }

      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (err) {
    console.error(`[agent-v2] tool ${name} error:`, err);
    return { error: `Error ejecutando ${name}: ${(err as Error).message}` };
  }
}

// ── Firestore helpers ───────────────────────────────────────────────────────

interface StoredToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result: string; // JSON string
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  rawContentJson?: string; // JSON of Anthropic.ContentBlock[] for assistant turns with tools
  toolUses?: StoredToolUse[];
  timestamp: FirebaseFirestore.FieldValue | { seconds: number };
}

// Reconstructs Claude message params from persisted history.
// We use plain text for all turns — avoids tool_use_id mismatches when the
// final assistant text is stored without the intermediate tool_use blocks.
function buildClaudeMessages(stored: StoredMessage[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  for (const msg of stored) {
    // Skip empty content (can happen if a turn had only tool calls and no text)
    const text = msg.content?.trim() ?? '';
    if (!text) continue;
    result.push({ role: msg.role, content: text });
  }
  return result;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
  }

  let uid: string;
  try {
    const decoded = await authAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return new Response('Invalid token', { status: 401, headers: CORS_HEADERS });
  }

  const { message, caseId, convId, documents } = (await req.json()) as {
    message: string;
    caseId?: string;
    convId?: string;
    documents?: { name: string; mimeType: string; base64: string }[];
  };

  if (!message?.trim() && !documents?.length) {
    return new Response('Missing message', { status: 400, headers: CORS_HEADERS });
  }

  // Extract text from any binary docs sent from the client (PDF/DOCX)
  let fullMessage = message?.trim() ?? '';
  if (documents?.length) {
    for (const doc of documents) {
      const buffer = Buffer.from(doc.base64, 'base64');
      const ext = doc.name.split('.').pop()?.toLowerCase() ?? '';
      let extracted = '';
      try {
        if (doc.mimeType === 'application/pdf' || ext === 'pdf') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          extracted = ((await pdfParse(buffer)).text ?? '').slice(0, 12000);
        } else if (doc.mimeType.includes('word') || ['docx', 'doc'].includes(ext)) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mammoth = require('mammoth');
          extracted = ((await mammoth.extractRawText({ buffer })).value ?? '').slice(0, 12000);
        } else if (doc.mimeType.includes('sheet') || doc.mimeType.includes('excel') || ['xlsx', 'xls'].includes(ext)) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const XLSX = require('xlsx');
          const wb = XLSX.read(buffer, { type: 'buffer' });
          for (const name of wb.SheetNames) {
            extracted += `[Hoja: ${name}]\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}\n\n`;
          }
          extracted = extracted.slice(0, 12000);
        }
      } catch { /* extraction failed — skip */ }
      if (extracted.trim()) fullMessage += `\n\n[Documento adjunto: ${doc.name}]\n${extracted}`;
    }
  }

  // Load user plan + country from Firestore (don't trust client-supplied values)
  const userSnap = await db().collection('users').doc(uid).get();
  const userData = userSnap.data() ?? {};
  const userPlan = (userData.plan as 'Abogados' | 'Estudiantes' | 'Autoservicio') ?? 'Autoservicio';
  const userCountry = (userData.country as string) || 'España';

  // Load full case context when caseId is provided
  let fullCaseContext: object | null = null;
  if (caseId) {
    try {
      const caseSnap = await db().collection('cases').doc(caseId).get();
      if (caseSnap.exists && caseSnap.data()?.userId === uid) {
        const cd = caseSnap.data()!;
        fullCaseContext = {
          id: caseId,
          ref: cd.ref ?? null,
          title: cd.title ?? null,
          type: cd.type ?? null,
          status: cd.status ?? null,
          client: cd.client ?? null,
          deadline: cd.deadline?.toDate?.()?.toISOString?.().split('T')[0] ?? null,
          notes: cd.notes ?? null,
        };
      }
    } catch {
      fullCaseContext = { id: caseId };
    }
  }

  // Load or create conversation
  const convsRef = db().collection('users').doc(uid).collection('conversations');
  let convRef: FirebaseFirestore.DocumentReference;
  let storedMessages: StoredMessage[] = [];

  if (convId) {
    convRef = convsRef.doc(convId);
    const snap = await convRef.get();
    if (snap.exists) {
      storedMessages = (snap.data()?.messages as StoredMessage[]) ?? [];
    }
  } else {
    convRef = convsRef.doc();
    await convRef.set({
      uid,
      caseId: caseId ?? null,
      agentVersion: 'v2',
      title: (message || fullMessage).slice(0, 60),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      messages: [],
    });
  }

  // Append user message to stored messages (optimistic write)
  const userMsg: StoredMessage = {
    role: 'user',
    content: fullMessage,
    timestamp: FieldValue.serverTimestamp(),
  };
  storedMessages = [...storedMessages, userMsg];

  // Build system prompt and initial Claude messages
  const systemPrompt = buildSystemPrompt(userPlan, fullCaseContext, userCountry);
  let claudeMessages: Anthropic.MessageParam[] = [
    ...buildClaudeMessages(storedMessages.slice(0, -1)), // history without new user msg
    { role: 'user', content: fullMessage },
  ];

  // SSE streaming
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        let fullText = '';
        const allToolUses: StoredToolUse[] = [];
        let finalRawContent: Anthropic.ContentBlock[] = [];
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            system: systemPrompt,
            tools: TOOLS,
            messages: claudeMessages,
          });

          // Track pending tool uses during streaming
          const pendingToolUses: { id: string; name: string; inputJson: string }[] = [];
          let currentTU: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of stream) {
            if (
              event.type === 'content_block_start' &&
              event.content_block.type === 'tool_use'
            ) {
              currentTU = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: '',
              };
              emit({ type: 'tool_start', id: currentTU.id, name: currentTU.name });
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                fullText += event.delta.text;
                emit({ type: 'text', delta: event.delta.text });
              } else if (event.delta.type === 'input_json_delta' && currentTU) {
                currentTU.inputJson += event.delta.partial_json;
              }
            } else if (event.type === 'content_block_stop' && currentTU) {
              pendingToolUses.push(currentTU);
              currentTU = null;
            }
          }

          const finalMsg = await stream.finalMessage();
          finalRawContent = finalMsg.content;

          // No tools called → done
          if (pendingToolUses.length === 0) break;

          // Execute tools and build tool_result messages
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of pendingToolUses) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(tu.inputJson || '{}');
            } catch {
              parsedInput = {};
            }
            const result = await executeTool(tu.name, parsedInput, uid, userCountry);
            const resultStr = JSON.stringify(result);

            emit({ type: 'tool_end', id: tu.id, name: tu.name, result: resultStr });

            allToolUses.push({ id: tu.id, name: tu.name, input: parsedInput, result: resultStr });
            toolResults.push({
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content: resultStr,
            });
          }

          // Continue conversation with tool results
          claudeMessages = [
            ...claudeMessages,
            { role: 'assistant' as const, content: finalRawContent },
            { role: 'user' as const, content: toolResults },
          ];
        }

        // Persist assistant message to Firestore
        const assistantMsg: StoredMessage = {
          role: 'assistant',
          content: fullText,
          rawContentJson: allToolUses.length > 0 ? JSON.stringify(finalRawContent) : undefined,
          toolUses: allToolUses.length > 0 ? allToolUses : undefined,
          timestamp: FieldValue.serverTimestamp(),
        };

        await convRef.update({
          messages: FieldValue.arrayUnion(
            { ...userMsg, timestamp: new Date() },
            { ...assistantMsg, timestamp: new Date() },
          ),
          updatedAt: FieldValue.serverTimestamp(),
          ...(storedMessages.length <= 1 ? { title: message.slice(0, 60) } : {}),
        });

        emit({ type: 'done', convId: convRef.id });
      } catch (err) {
        console.error('[api/agent-v2]', err);
        emit({ type: 'error', message: (err as Error).message ?? 'Internal error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  });
}
