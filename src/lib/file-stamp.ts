// Date-time stamp in file names, so versions of the same document are told apart at a glance.
// Pure — unit tested. Madrid time, same as the signed PDFs (Phase 4).

/** "YYYY-MM-DD_HH-MM" in Madrid time — no colons, so the name is valid on every OS. */
export function fileStamp(at: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}`;
}

/** A trailing "_YYYY-MM-DD_HH-MM" (before the extension, if any). */
export const STAMP_SUFFIX_RE = /_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;

/** "NDA_MFW_MCC.doc" → "NDA_MFW_MCC_2026-11-02_21-40.doc"; an existing stamp is replaced, not doubled. */
export function stampedFileName(name: string, at: Date): string {
  const m = /^(.*?)(\.[^./\\]+)?$/.exec(name || 'Documento')!;
  const base = (m[1] || 'Documento').replace(STAMP_SUFFIX_RE, '');
  return `${base}_${fileStamp(at)}${m[2] ?? ''}`;
}
