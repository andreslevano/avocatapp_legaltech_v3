import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import type { UserPlan } from '@/lib/auth';
import { buildSystemPrompt } from '@/lib/agent-prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FilePayload { name: string; mimeType: string; base64: string; }

async function extractDocumentText(doc: FilePayload): Promise<string> {
  const buffer = Buffer.from(doc.base64, 'base64');
  const ext = doc.name.split('.').pop()?.toLowerCase() ?? '';

  try {
    if (doc.mimeType === 'application/pdf' || ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return result.text?.slice(0, 12000) ?? '';
    }

    if (doc.mimeType.includes('word') || ['docx', 'doc'].includes(ext)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result.value ?? '').slice(0, 12000);
    }

    if (doc.mimeType.includes('sheet') || doc.mimeType.includes('excel') || ['xlsx', 'xls'].includes(ext)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        text += `[Hoja: ${sheetName}]\n${csv}\n\n`;
      }
      return text.slice(0, 12000);
    }
  } catch {
    // extraction failed — fall through to filename-only fallback
  }

  return `[${doc.name} — no se pudo extraer el texto]`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, attachments, documents, caseContext, history, userPlan } =
      (await req.json()) as {
        message: string;
        attachments?: FilePayload[];   // images → vision
        documents?: FilePayload[];    // PDF/DOCX/XLSX → text extraction
        caseContext?: object;
        history: Array<{ role: 'user' | 'assistant'; content: string }>;
        userPlan: UserPlan;
      };

    if (!message?.trim() && !attachments?.length && !documents?.length) {
      return new Response('Missing message', { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(userPlan ?? 'Autoservicio', caseContext);

    // Extract text from binary documents server-side and append to message
    let fullMessage = message ?? '';
    if (documents?.length) {
      const extracted = await Promise.all(documents.map(extractDocumentText));
      for (let i = 0; i < documents.length; i++) {
        fullMessage += `\n\n[Documento adjunto: ${documents[i].name}]\n${extracted[i]}`;
      }
    }

    // Build user content — text only or multi-part with vision images
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'auto' } };

    const imageAttachments = (attachments ?? []).filter(a => a.mimeType.startsWith('image/'));

    const userContent: string | ContentPart[] =
      imageAttachments.length > 0
        ? [
            { type: 'text', text: fullMessage || 'Analiza la imagen adjunta.' },
            ...imageAttachments.map(a => ({
              type: 'image_url' as const,
              image_url: { url: `data:${a.mimeType};base64,${a.base64}`, detail: 'auto' as const },
            })),
          ]
        : fullMessage;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history ?? []),
        { role: 'user', content: userContent },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  } catch (err) {
    console.error('[api/agent]', err);
    return new Response('Internal server error', { status: 500 });
  }
}
