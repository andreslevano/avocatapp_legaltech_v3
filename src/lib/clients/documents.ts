// A client's documents (linked to the client directly or through one of their cases) and the ones
// that are about signature, with a readable status. Pure, unit tested.
import type { DocumentRecord } from '@/lib/storage-client';

type Doc = Pick<DocumentRecord, 'id' | 'caseId' | 'clientId' | 'status' | 'kind' | 'signatureStatus' | 'manualSignature' | 'manualSignedFrom' | 'signedVia'>;

export function clientDocuments<T extends Doc>(docs: T[], clientId: string, caseIds: string[]): T[] {
  const cases = new Set(caseIds);
  return docs.filter(d => d.clientId === clientId || (!!d.caseId && cases.has(d.caseId)));
}

const SIG_LABEL: Record<string, string> = {
  pending_owner: 'Pendiente de tu firma', sent: 'Enviado a firmar', delivered: 'Abierto por el firmante',
  completed: 'Firmado', declined: 'Rechazado', voided: 'Anulado', expired: 'Caducado', error: 'Error de firma',
};

/** null when the document has nothing to do with signature. */
export function signatureInfo(d: Doc): { label: string; tone: 'done' | 'pending' | 'problem' | 'info'; via: string } | null {
  if (d.kind === 'signed' && d.signedVia === 'manual') return { label: 'Copia firmada por todos', tone: 'done', via: 'Firma manuscrita' };
  if (d.kind === 'signed') return { label: 'PDF firmado', tone: 'done', via: 'DocuSign' };
  if (d.kind === 'certificate') return { label: 'Certificado de firma', tone: 'done', via: 'DocuSign' };
  if (d.signatureStatus) {
    const s = d.signatureStatus;
    return { label: SIG_LABEL[s] ?? s, tone: s === 'completed' ? 'done' : ['declined', 'voided', 'expired', 'error'].includes(s) ? 'problem' : 'pending', via: 'DocuSign' };
  }
  if (d.manualSignedFrom) return { label: 'Copia firmada por ti', tone: 'info', via: 'Firma manuscrita' };
  if (d.manualSignature?.returnedDocumentId) return { label: 'Firmado', tone: 'done', via: 'Firma manuscrita' };
  if (d.manualSignature) return { label: 'Enviado para firma manuscrita', tone: 'pending', via: 'Firma manuscrita' };
  if (d.status === 'Firmado') return { label: 'Firmado', tone: 'done', via: '' };
  if (d.status === 'Enviado') return { label: 'Enviado', tone: 'pending', via: '' };
  return null;
}

export const isSignatureDoc = (d: Doc) => signatureInfo(d) !== null;

/** "4 documentos · 2 de firma" */
export function docsSummary(all: Doc[]): { total: number; signature: number; signed: number } {
  const sig = all.filter(isSignatureDoc);
  return { total: all.length, signature: sig.length, signed: sig.filter(d => signatureInfo(d)!.tone === 'done').length };
}

/** Sent for handwritten signature and still waiting for the signed copy ("Subir copia firmada"). */
export const awaitingSignedCopy = (d: Doc) => !!d.manualSignature && !d.manualSignature.returnedDocumentId;
