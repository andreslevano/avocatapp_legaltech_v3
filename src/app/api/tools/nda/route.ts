import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authAdmin } from '@/lib/firebase-admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NDA_SYSTEM_PROMPT = {
  es: `Eres un experto redactor de Acuerdos de Confidencialidad (NDA).
Genera NDAs profesionales, completos y listos para firma, adaptados a la jurisdicción indicada.

REGLAS:
- Genera el NDA COMPLETO en tu respuesta — no omitas cláusulas ni la sección de firmas.
- Usa # para el título y ## para cada cláusula numerada.
- Usa **negrita** para nombres, fechas, plazos e importes.
- Usa [COMPLETAR] donde falten datos.
- Sé conciso: incluye todas las cláusulas pero sin texto redundante.
- Adapta las referencias legales a la jurisdicción indicada.
- SIEMPRE incluye al final un bloque de FIRMAS completo con: nombre, cargo, tipo y número de identificación, dirección y línea de firma para cada parte.`,

  en: `You are an expert drafter of Non-Disclosure Agreements (NDA).
Generate professional, complete, and execution-ready NDAs adapted to the specified jurisdiction.

RULES:
- Generate the COMPLETE NDA in your response — do not omit any clauses or the signature section.
- Use # for the title and ## for each numbered clause.
- Use **bold** for names, dates, terms, and amounts.
- Use [TO BE COMPLETED] where data is missing.
- Be concise: include all clauses without redundant text.
- Adapt legal references to the specified jurisdiction.
- ALWAYS include at the end a complete SIGNATURE BLOCK with: name, title, ID type and number, address, and signature line for each party.`,
};

interface Parte {
  nombre: string;
  empresa: string;
  cargo: string;
  idType?: string;
  idNumber?: string;
  address?: string;
}

interface NdaBody {
  tipo: 'unilateral' | 'bilateral';
  divulgante: Parte;
  receptora: Parte;
  objeto: string;
  duracion: string;
  jurisdiccion: string;
  noCompetencia: boolean;
  penalizacion: boolean;
  language?: 'es' | 'en';
  referenceDocUrl?: string;
  referenceDocName?: string;
}

function parteLabel(p: Parte, lang: 'es' | 'en'): string {
  const parts = [p.nombre, p.empresa, p.cargo].filter(Boolean);
  const base = parts.join(' — ') || (lang === 'en' ? '[TO BE COMPLETED]' : '[COMPLETAR]');
  const id = p.idType && p.idNumber ? `${p.idType} ${p.idNumber}` : '';
  const addr = p.address || '';
  return [base, id, addr].filter(Boolean).join(' | ');
}

function buildPrompt(body: NdaBody, referenceContext?: string): string {
  const { tipo, divulgante, receptora, objeto, duracion, jurisdiccion, noCompetencia, penalizacion } = body;
  const lang = body.language === 'en' ? 'en' : 'es';

  if (lang === 'en') {
    const tipoLabel = tipo === 'bilateral' ? 'BILATERAL (Mutual)' : 'UNILATERAL';
    const extras = [
      noCompetencia && '- Non-compete clause',
      penalizacion  && '- Liquidated damages / penalty clause',
    ].filter(Boolean).join('\n');

    const refSection = referenceContext
      ? `\n\nREFERENCE DOCUMENT (use as style/content reference — adapt for the parties below):\n---\n${referenceContext.slice(0, 3000)}\n---`
      : '';

    const signatureInstructions = `
SIGNATURE BLOCK — include at the very end, formatted as follows for each party:
**[PARTY NAME]**
Name: ${divulgante.nombre || '[NAME]'}
Title/Capacity: ${divulgante.cargo || '[TITLE]'}
${divulgante.idType ? `ID: ${divulgante.idType} ${divulgante.idNumber || '[NUMBER]'}` : 'ID: [TYPE] [NUMBER]'}
Address: ${divulgante.address || '[ADDRESS]'}
Date: ____________
Signature: ________________________

**[PARTY NAME]**
Name: ${receptora.nombre || '[NAME]'}
Title/Capacity: ${receptora.cargo || '[TITLE]'}
${receptora.idType ? `ID: ${receptora.idType} ${receptora.idNumber || '[NUMBER]'}` : 'ID: [TYPE] [NUMBER]'}
Address: ${receptora.address || '[ADDRESS]'}
Date: ____________
Signature: ________________________`;

    return `Generate a complete ${tipoLabel} Non-Disclosure Agreement ready for execution.${refSection}

PARTIES:
- Disclosing Party: **${parteLabel(divulgante, 'en')}**
- Receiving Party: **${parteLabel(receptora, 'en')}**

PURPOSE / SUBJECT MATTER: ${objeto}
DURATION: ${duracion}
JURISDICTION / GOVERNING LAW: ${jurisdiccion}
${extras ? `ADDITIONAL CLAUSES:\n${extras}` : ''}

Include: definition of confidential information, obligations of the receiving party, exclusions, permitted use, term, return/destruction of information, no license granted, indemnification${noCompetencia ? ', non-compete' : ''}${penalizacion ? ', liquidated damages' : ''}, general provisions, and the signature block below.
Adapt all legal references to the laws of ${jurisdiccion}.

${signatureInstructions}`;
  }

  // Spanish
  const tipoLabel = tipo === 'bilateral' ? 'BILATERAL (mutuo)' : 'UNILATERAL';
  const extras = [
    noCompetencia && '- No competencia',
    penalizacion  && '- Cláusula penal por incumplimiento',
  ].filter(Boolean).join('\n');

  const refSection = referenceContext
    ? `\n\nDOCUMENTO DE REFERENCIA (úsalo como referencia de estilo/contenido — adapta para las partes indicadas):\n---\n${referenceContext.slice(0, 3000)}\n---`
    : '';

  const signatureInstructions = `
BLOQUE DE FIRMAS — incluye al final, con este formato para cada parte:
**[NOMBRE DE LA PARTE]**
Nombre: ${divulgante.nombre || '[NOMBRE]'}
Cargo / Calidad: ${divulgante.cargo || '[CARGO]'}
${divulgante.idType ? `Identificación: ${divulgante.idType} ${divulgante.idNumber || '[NÚMERO]'}` : 'Identificación: [TIPO] [NÚMERO]'}
Domicilio: ${divulgante.address || '[DIRECCIÓN]'}
Fecha: ____________
Firma: ________________________

**[NOMBRE DE LA PARTE]**
Nombre: ${receptora.nombre || '[NOMBRE]'}
Cargo / Calidad: ${receptora.cargo || '[CARGO]'}
${receptora.idType ? `Identificación: ${receptora.idType} ${receptora.idNumber || '[NÚMERO]'}` : 'Identificación: [TIPO] [NÚMERO]'}
Domicilio: ${receptora.address || '[DIRECCIÓN]'}
Fecha: ____________
Firma: ________________________`;

  return `Genera un NDA ${tipoLabel} completo y listo para firma.${refSection}

PARTES:
- Divulgante: **${parteLabel(divulgante, 'es')}**
- Receptora: **${parteLabel(receptora, 'es')}**

OBJETO: ${objeto}
DURACIÓN: ${duracion}
JURISDICCIÓN: ${jurisdiccion}
${extras ? `CLÁUSULAS ADICIONALES:\n${extras}` : ''}

Incluye: definición de información confidencial, obligaciones, exclusiones, limitación de uso, vigencia, devolución/destrucción de información, ausencia de licencia, indemnización${noCompetencia ? ', no competencia' : ''}${penalizacion ? ', cláusula penal' : ''}, disposiciones generales y el bloque de firmas indicado a continuación.
Adapta referencias legales a la jurisdicción de ${jurisdiccion}.

${signatureInstructions}`;
}

async function extractTextFromDocUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value || null;
  } catch {
    return null;
  }
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

  const lang = body.language === 'en' ? 'en' : 'es';
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Extract reference doc text (with timeout) before LLM call
        let referenceContext: string | undefined;
        if (body.referenceDocUrl) {
          const text = await extractTextFromDocUrl(body.referenceDocUrl);
          if (text) referenceContext = text;
        }

        const prompt = buildPrompt(body, referenceContext);

        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2500,
          system: NDA_SYSTEM_PROMPT[lang],
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
