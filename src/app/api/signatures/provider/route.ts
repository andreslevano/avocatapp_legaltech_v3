import { NextRequest, NextResponse } from 'next/server';
import { requireDocusignUser } from '@/lib/docusign/route-helpers';
import { chooseProvider } from '@/lib/signatures/server';
import { docusignEnabled, yousignConfigured } from '@/lib/signatures/providers/yousign/config';

export const dynamic = 'force-dynamic';

// GET /api/signatures/provider — the default provider for new requests and which ones the lawyer
// may choose in "Firmar y enviar" (Yousign when configured; DocuSign when enabled). No secrets.
export async function GET(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  // Both available → the sheet lets the lawyer choose per document (default first).
  return NextResponse.json({ provider: chooseProvider(), docusignAvailable: docusignEnabled(), yousignAvailable: yousignConfigured() });
}
