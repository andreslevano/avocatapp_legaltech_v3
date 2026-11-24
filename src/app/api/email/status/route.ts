import { NextRequest, NextResponse } from 'next/server';
import { emailErrorResponse, emailStatus, requireEmailCaller } from '@/lib/email/server';

export const dynamic = 'force-dynamic';

// GET /api/email/status — connected mail accounts (Gmail / Outlook) and the provider of the login
// email, so Revisión de Email proposes connecting that one by default. No tokens.
export async function GET(req: NextRequest) {
  const c = await requireEmailCaller(req);
  if (c instanceof NextResponse) return c;
  try { return NextResponse.json(await emailStatus(c)); } catch (err) { return emailErrorResponse(err); }
}
