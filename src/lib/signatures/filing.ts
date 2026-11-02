// Where and under which name the signed PDF is filed (Phase 4). Pure — unit tested.

/** "NDA_MFW_MDC.doc" → "NDA_MFW_MDC_firmado.pdf" */
export function signedFileName(originalName: string): string {
  const base = (originalName || 'Documento').replace(/\.[^./\\]+$/, '').replace(/_firmado$/i, '');
  return `${base}_firmado.pdf`;
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
