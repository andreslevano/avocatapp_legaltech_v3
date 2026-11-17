import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireCaller } from '@/lib/data-requests/server';
import { startContractOnSigning } from '@/lib/contracts/server';
import { signatureTitleFromName } from '@/lib/signatures/eligibility';

export const dynamic = 'force-dynamic';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

// POST /api/signatures/manual/returned { documentId, uploadedDocumentId }
// "Subir copia firmada": the copy the other party signed by hand and sent back was uploaded by the
// owner (client SDK); here it becomes the signed version of the original — same client, case and
// folder, kind 'signed' (a server-only field) — and the original is marked Firmado. If the original
// has a contract record (NDA / contrato de servicios), its term starts on the signing date.
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const documentId = typeof b.documentId === 'string' && ID.test(b.documentId) ? b.documentId : '';
  const uploadedId = typeof b.uploadedDocumentId === 'string' && ID.test(b.uploadedDocumentId) ? b.uploadedDocumentId : '';
  if (!documentId || !uploadedId || documentId === uploadedId) return NextResponse.json({ error: 'Faltan los documentos.' }, { status: 400 });

  const docs = db().collection('documents');
  const [orig, up] = await Promise.all([docs.doc(documentId).get(), docs.doc(uploadedId).get()]);
  if (!orig.exists || orig.get('userId') !== caller.uid || !up.exists || up.get('userId') !== caller.uid) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }
  if (!orig.get('manualSignature')) return NextResponse.json({ error: 'Este documento no se envió para firma manuscrita.' }, { status: 409 });

  const signedAt = new Date().toISOString();
  const clientId = (orig.get('clientId') as string | null) ?? null;
  const caseId = (orig.get('caseId') as string | null) ?? null;
  const folderId = (orig.get('folderId') as string | null) ?? null;
  const title = signatureTitleFromName(String(orig.get('name') ?? 'Documento'));
  const ext = String(up.get('type') ?? 'pdf').toLowerCase();
  const name = `${title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '_') || 'Documento'}_firmado_por_todos.${ext}`;

  await Promise.all([
    up.ref.update({
      kind: 'signed', signedVia: 'manual', signedFromDocumentId: documentId, status: 'Firmado', name,
      clientId, caseId, folderId, updatedAt: FieldValue.serverTimestamp(),
    }),
    orig.ref.update({
      status: 'Firmado',
      'manualSignature.returnedDocumentId': uploadedId,
      'manualSignature.returnedAt': signedAt,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  ]);
  await startContractOnSigning(caller.uid, documentId, signedAt).catch(err => console.warn('[manual-returned] contract', (err as Error).message));

  let clientName: string | null = null;
  if (clientId) {
    const c = await db().collection('clients').doc(clientId).get();
    if (c.exists && c.get('userId') === caller.uid) clientName = String(c.get('name') ?? '') || null;
  }
  return NextResponse.json({ ok: true, documentId: uploadedId, name, clientId, clientName, caseId, folderId, signedAt });
}
