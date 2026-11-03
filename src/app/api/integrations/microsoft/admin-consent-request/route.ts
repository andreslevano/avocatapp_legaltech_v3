import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { adminConsentUrl, msServerConfig } from '@/lib/integrations/microsoft/config';
import { adminConsentEmail } from '@/lib/integrations/microsoft/consent-email';
import { emailConfigured, sendEmail } from '@/lib/email';
import { madridToday } from '@/lib/contracts/dates';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_DAY = 5;

// POST /api/integrations/microsoft/admin-consent-request { adminEmail, tid? } — "Enviar por email" on
// the admin-approval page: Avocat emails the approval link to the organisation's administrator
// (reply-to = the user). Server-sent, so it works without a desktop mail app. 5 per user per day.
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as { adminEmail?: unknown; tid?: unknown } | null;
  const adminEmail = typeof b?.adminEmail === 'string' ? b.adminEmail.trim() : '';
  if (!EMAIL_RE.test(adminEmail) || adminEmail.length > 200) return NextResponse.json({ error: 'Escribe un email válido.' }, { status: 400 });
  if (!emailConfigured()) return NextResponse.json({ error: 'El envío desde Avocat no está disponible. Envíalo tú con Outlook web o Gmail (enlaces de abajo).' }, { status: 503 });

  const ref = db().collection('users').doc(uid);
  const u = (await ref.get()).data() ?? {};
  const today = madridToday();
  const q = (u.msConsentRequests ?? {}) as { day?: string; count?: number };
  const count = q.day === today ? q.count ?? 0 : 0;
  if (count >= MAX_PER_DAY) return NextResponse.json({ error: 'Has enviado varias solicitudes hoy. Copia el enlace y envíalo tú.' }, { status: 429 });

  const requester = {
    name: String(u.displayName ?? u.name ?? '').trim(),
    email: String(u.email ?? '').trim(),
  };
  const tid = typeof b?.tid === 'string' ? b.tid : null;
  try {
    await sendEmail(adminEmail, {
      ...adminConsentEmail(requester, adminConsentUrl(msServerConfig(), tid)),
      ...(EMAIL_RE.test(requester.email) ? { replyTo: requester.email } : {}),
    });
    await ref.update({ msConsentRequests: { day: today, count: count + 1 } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[microsoft/admin-consent-request]', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo enviar desde Avocat. Envíalo tú con Outlook web o Gmail (enlaces de abajo).' }, { status: 502 });
  }
}
