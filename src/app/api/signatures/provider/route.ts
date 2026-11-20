import { NextRequest, NextResponse } from 'next/server';
import { requireDocusignUser } from '@/lib/docusign/route-helpers';
import { chooseProvider } from '@/lib/signatures/server';
import { docusignEnabled } from '@/lib/signatures/providers/yousign/config';

export const dynamic = 'force-dynamic';

// GET /api/signatures/provider — which provider "Firmar y enviar" uses for new requests (Yousign by
// default; DocuSign only when enabled). No secrets: just the choice.
export async function GET(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  return NextResponse.json({ provider: chooseProvider(), docusignAvailable: docusignEnabled() });
}
