import { NextRequest, NextResponse } from 'next/server';
import { isSandboxBase } from '@/lib/signatures/providers/yousign/config';
import { parseYousignEvent, verifyYousignSignature } from '@/lib/signatures/providers/yousign/webhook';
import { storeYousignEvent } from '@/lib/signatures/webhook-events';

export const dynamic = 'force-dynamic';

// POST /api/signatures/yousign/webhook — Yousign webhook subscription (plan §7). Must answer in < 1 s:
// verify the HMAC of the raw body, store the event once (event_id), return 200. All the work
// (status, emails, filing) happens in /api/signatures/yousign/process, triggered by the stored event.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';
  if (!verifyYousignSignature(raw, req.headers.get('x-yousign-signature-256'), secret)) {
    return new NextResponse(null, { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const ev = parseYousignEvent(body);
  if (!ev) return NextResponse.json({ ok: true, ignored: true });
  // A sandbox event never touches production data (and vice versa).
  if (ev.sandbox !== isSandboxBase(process.env.YOUSIGN_API_BASE ?? 'https://api-sandbox.yousign.app/v3')) {
    return NextResponse.json({ ok: true, ignored: 'environment' });
  }
  try {
    await storeYousignEvent(ev);              // false = a retry we already have: still 200
  } catch (err) {
    console.error('[yousign/webhook] store', (err as Error)?.message);
    return new NextResponse(null, { status: 500 });          // Yousign retries (auto_retry)
  }
  return NextResponse.json({ ok: true });
}
