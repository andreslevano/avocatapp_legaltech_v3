// Where and under which name the signed PDF is filed (Phase 4). Pure — unit tested.

import { fileStamp } from '@/lib/file-stamp';

/** "NDA_MFW_MDC.doc" + signed at → "NDA_MFW_MDC_firmado_2026-11-02_15-34.pdf" (date avoids confusion between versions).
 *  The generated document's own stamp ("NDA_2026-11-02_21-40.doc") is dropped, not repeated. */
export function signedFileName(originalName: string, signedAt: Date): string {
  const base = (originalName || 'Documento').replace(/\.[^./\\]+$/, '').replace(/(_firmado)?(_\d{4}-\d{2}-\d{2}_\d{2}-\d{2})?$/i, '');
  return `${base}_firmado_${fileStamp(signedAt)}.pdf`;
}

/** Next to the original (same Storage folder, so case documents stay under casos/{caseId}). */
export function signedStoragePath(originalPath: string | undefined, uid: string, ts: number, fileName: string): string {
  const prefix = `users/${uid}/`;
  const dir = originalPath && originalPath.startsWith(prefix) && originalPath.includes('/', prefix.length)
    ? originalPath.slice(0, originalPath.lastIndexOf('/'))
    : `users/${uid}/documents`;
  return `${dir}/${ts}_${fileName}`;
}

/** Same URL shape getDownloadURL() returns, so the client treats it like any other document. */
export function firebaseDownloadUrl(bucket: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** A filing attempt older than this is considered dead (function killed) and may be retried. */
export const FILING_LEASE_MS = 5 * 60 * 1000;

/** "NDA_MFW.doc" + "Juan Pérez" → "NDA_MFW_registro_auditoria_Juan_Perez.pdf" (Yousign audit trail, one per signer). */
export function auditTrailFileName(originalName: string, signerName: string): string {
  const base = (originalName || 'Documento').replace(/\.[^./\\]+$/, '').replace(/(_firmado)?(_\d{4}-\d{2}-\d{2}_\d{2}-\d{2})?$/i, '');
  const who = signerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'firmante';
  return `${base}_registro_auditoria_${who}.pdf`;
}
