import { NextRequest, NextResponse } from 'next/server';
import { docusignErrorResponse, requireDocusignUser } from '@/lib/docusign/route-helpers';
import { startSignatureRequest } from '@/lib/signatures/server';
import { DEFAULT_SIGNATURE_OPTIONS, validateSignatureInput, type CreateSignatureInput, type PartyInput } from '@/lib/signatures/types';

export const dynamic = 'force-dynamic';

// POST /api/signatures — "Firmar y enviar": create the envelope, lock the document and return the
// owner's embedded signing URL. Body: CreateSignatureInput (or the pre-5b { counterparty }).
export async function POST(req: NextRequest) {
  const uid = await requireDocusignUser(req);
  if (typeof uid !== 'string') return uid;

  const body = await req.json().catch(() => null) as (Partial<CreateSignatureInput> & { counterparty?: PartyInput; embedOrigin?: string }) | null;
  const { counterparty, embedOrigin, ...rest } = body ?? {};
  const input: Partial<CreateSignatureInput> = {
    ...rest,
    // Pre-5b body shape: a single counterparty.
    signers: rest.signers ?? (counterparty ? [counterparty] : []),
    title: (body?.title ?? '').toString().trim().slice(0, 120) || 'Documento',
    message: (body?.message ?? '').toString(),
    options: { ...DEFAULT_SIGNATURE_OPTIONS, ...(body?.options ?? {}) },
  };
  const invalid = validateSignatureInput(input);
  if (invalid) return NextResponse.json({ error: invalid, code: 'invalid_input' }, { status: 400 });

  try {
    // embedOrigin: the page asks for Focused View (5c, desktop); the server checks the origin.
    return NextResponse.json(await startSignatureRequest(uid, input as CreateSignatureInput, typeof embedOrigin === 'string' ? embedOrigin : null));
  } catch (err) {
    return docusignErrorResponse(err);
  }
}
