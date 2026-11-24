import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, isProvider, requireEmailCaller } from '@/lib/email/server';
import { saveAttachment } from '@/lib/email/assistant-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/email/assist/attachment { provider, messageId, attachmentId, caseId?, clientId? }
// → { documentId, name }. Copies one attachment into Documentos (optionally linked).
export async function POST(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return c;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isProvider(b.provider) || typeof b.messageId !== 'string' || typeof b.attachmentId !== 'string') {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }
  const id = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : null);
  try {
    return NextResponse.json(await saveAttachment(c, b.provider, { messageId: b.messageId, attachmentId: b.attachmentId, caseId: id(b.caseId), clientId: id(b.clientId) }));
  } catch (err) { return emailErrorResponse(err); }
}
