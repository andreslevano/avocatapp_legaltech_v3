import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireCaller } from '@/lib/data-requests/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { emailConfigured, sendEmail, type EmailAttachment } from '@/lib/email';
import { manualSignedEmail, parseManualSend } from '@/lib/signatures/manual';
import { signatureTitleFromName } from '@/lib/signatures/eligibility';

export const dynamic = 'force-dynamic';

const STORAGE_URL = /^https:\/\/firebasestorage\.googleapis\.com\/[^\s"'<>]+$/;
const MAX_ATTACHMENT = 10 * 1024 * 1024;

async function fetchFile(url: unknown, filename: string, contentType: string): Promise<EmailAttachment | null> {
  if (typeof url !== 'string' || !STORAGE_URL.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const content = Buffer.from(await res.arrayBuffer());
  return content.length <= MAX_ATTACHMENT ? { filename, content, contentType } : null;
}

// POST /api/signatures/manual { documentId, signedDocumentId, recipients[], cc[], subject, message }
// "Firma manuscrita": the signed copy (owner's handwritten signature stamped, saved by the client)
// is emailed as a PDF to the recipients, with the owner in copy and as reply-to. Only the PDF: the
// Word copy stays in Documentos (a .doc would let the recipient edit the signed document).
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  if (!checkRateLimit(`manual-sign:${caller.uid}`).allowed) {
    return NextResponse.json({ error: 'Demasiados envíos seguidos. Espera un minuto.' }, { status: 429 });
  }
  const parsed = parseManualSend(await req.json().catch(() => null), caller.email);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { documentId, signedDocumentId, recipients, cc, subject, message } = parsed.input;
  if (!emailConfigured()) return NextResponse.json({ error: 'El envío de emails no está configurado.' }, { status: 503 });

  const docs = db().collection('documents');
  const [orig, signed, owner] = await Promise.all([
    docs.doc(documentId).get(), docs.doc(signedDocumentId).get(), db().collection('users').doc(caller.uid).get(),
  ]);
  if (!orig.exists || orig.get('userId') !== caller.uid || !signed.exists || signed.get('userId') !== caller.uid) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }

  const title = signatureTitleFromName(String(orig.get('name') ?? 'Documento'));
  const base = title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '_') || 'Documento';
  const pdf = await fetchFile(signed.get('pdfDownloadUrl'), `${base}_firmado.pdf`, 'application/pdf');
  if (!pdf) return NextResponse.json({ error: 'No se pudo adjuntar el PDF firmado.' }, { status: 502 });
  const attachments: EmailAttachment[] = [pdf];

  const u = owner.data() ?? {};
  const ownerName = String(u.legalCompanyName || u.displayName || u.name || caller.email || 'Avocat');
  const msg = manualSignedEmail({ ownerName, title, subject, message, recipientName: recipients.length === 1 ? recipients[0].name : '' });
  try {
    await sendEmail(recipients.map(r => r.email).join(', '), {
      ...msg,
      ...(caller.email ? { replyTo: caller.email } : {}),
      cc: [...cc.map(c => c.email), ...(caller.email ? [caller.email] : [])],
      attachments,
    });
  } catch (err) {
    console.error('[manual-sign] email', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo enviar el email. Intenta de nuevo.' }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const record = { signedDocumentId, sentAt, recipients: recipients.map(r => r.email), cc: cc.map(c => c.email) };
  await Promise.all([
    orig.ref.update({ status: 'Enviado', manualSignature: record, updatedAt: FieldValue.serverTimestamp() }),
    signed.ref.update({
      status: 'Enviado', manualSignedFrom: documentId,
      clientId: orig.get('clientId') ?? null, caseId: orig.get('caseId') ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  ]);
  return NextResponse.json({ ok: true, sentAt });
}
