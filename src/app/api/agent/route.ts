import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import type { UserPlan } from '@/lib/auth';
import { buildSystemPrompt } from '@/lib/agent-prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ImageAttachment {
  name: string;
  mimeType: string;
  base64: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, attachments, caseContext, history, userPlan } = (await req.json()) as {
      message: string;
      attachments?: ImageAttachment[];
      caseContext?: object;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
      userPlan: UserPlan;
    };

    if (!message?.trim() && !attachments?.length) {
      return new Response('Missing message', { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(userPlan ?? 'Autoservicio', caseContext);

    // Build the current user message — plain text or multi-part for vision
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'auto' } };

    const imageAttachments = (attachments ?? []).filter(a => a.mimeType.startsWith('image/'));

    const userContent: string | ContentPart[] =
      imageAttachments.length > 0
        ? [
            { type: 'text', text: message || 'Analiza la imagen adjunta.' },
            ...imageAttachments.map(a => ({
              type: 'image_url' as const,
              image_url: { url: `data:${a.mimeType};base64,${a.base64}`, detail: 'auto' as const },
            })),
          ]
        : message;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history ?? []),
        { role: 'user', content: userContent },
      ],
      max_tokens: 2000,
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
