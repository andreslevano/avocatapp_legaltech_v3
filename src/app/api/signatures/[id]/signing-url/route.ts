import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { resumeOwnerSigning } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/[id]/signing-url  { embedOrigin? } — fresh embedded signing URL ("Continuar firma").
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    const body = await req.json().catch(() => null) as { embedOrigin?: unknown } | null;
    const embedOrigin = typeof body?.embedOrigin === 'string' ? body.embedOrigin : null;
    return NextResponse.json(await resumeOwnerSigning(uid, params.id, embedOrigin));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
