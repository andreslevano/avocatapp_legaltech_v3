import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { remindCounterparty } from '@/lib/signatures/server';

export const dynamic = 'force-dynamic';

// POST /api/signatures/[id]/remind — re-sends the DocuSign email to the counterparty (max 1/hour).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;
  try {
    return NextResponse.json(await remindCounterparty(uid, params.id));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
