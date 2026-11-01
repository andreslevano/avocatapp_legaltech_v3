import { NextRequest, NextResponse } from 'next/server';
import { requireDocusignUser } from '@/lib/docusign/route-helpers';
import { deleteConnection } from '@/lib/docusign/tokens';

// Per-request OAuth endpoint — never prerendered.
export const dynamic = 'force-dynamic';

// POST /api/integrations/docusign/disconnect — forgets the tokens. Signed documents and
// signature history stay in Avocat; envelopes already sent keep running in DocuSign.
export async function POST(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  await deleteConnection(uid);
  return NextResponse.json({ ok: true });
}
