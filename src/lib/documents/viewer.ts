// What the document viewer can show for a file, and from which URL. Pure, client-safe, unit tested.
//   pdf   → browser PDF viewer (iframe)          image → <img>
//   doc   → fetched: Avocat's .doc is HTML (rendered in a sandboxed iframe); a binary Word 97
//           .doc can't be shown → download        docx → converted to HTML with mammoth
//   text  → <pre>                                none / too-big → download only

import { FONT_CATALOG } from '@/lib/branding';
import { primitives } from '@/lib/tokens';

export type ViewerKind = 'pdf' | 'image' | 'doc' | 'docx' | 'text' | 'none' | 'too-big';

export interface ViewerDoc {
  name: string;
  type: string;
  size: number;
  downloadUrl: string;
  pdfDownloadUrl?: string;
}

/** Files we read into memory to render (Word, text) above this size are offered as a download. */
export const VIEWER_MAX_FETCH_BYTES = 15 * 1024 * 1024;

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const TEXT = new Set(['txt', 'csv', 'md', 'json', 'xml']);

const extOf = (d: ViewerDoc) => (d.type || d.name.split('.').pop() || '').toLowerCase().replace(/^\./, '');

export function viewerKind(d: ViewerDoc): { kind: ViewerKind; url: string; ext: string } {
  const ext = extOf(d);
  // A generated document keeps a PDF twin: it's the most faithful view.
  if (d.pdfDownloadUrl) return { kind: 'pdf', url: d.pdfDownloadUrl, ext: 'pdf' };
  if (ext === 'pdf') return { kind: 'pdf', url: d.downloadUrl, ext };
  if (IMAGE.has(ext)) return { kind: 'image', url: d.downloadUrl, ext };
  const fetched: Partial<Record<string, ViewerKind>> = { doc: 'doc', docx: 'docx' };
  const kind = fetched[ext] ?? (TEXT.has(ext) ? 'text' : null);
  if (!kind) return { kind: 'none', url: d.downloadUrl, ext };
  if (d.size > VIEWER_MAX_FETCH_BYTES) return { kind: 'too-big', url: d.downloadUrl, ext };
  return { kind, url: d.downloadUrl, ext };
}

/** Avocat's Word export is HTML saved as .doc (src/lib/agent-export.ts buildWordBlob). */
export function isHtmlDoc(text: string): boolean {
  return /^\s*(<!DOCTYPE html|<html)/i.test(text.replace(/^﻿/, ''));
}

/** mammoth's HTML fragment → a standalone page with document typography (rendered sandboxed). */
export function wrapFragment(html: string, title: string): string {
  const safe = title.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
  // Paper look (white page, document serif) whatever the app theme — like the exported documents.
  const ink = primitives['neutral-900'], paper = primitives['neutral-0'], rule = primitives['neutral-300'];
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${safe}</title><style>
body{font-family:${FONT_CATALOG.times.css};font-size:12pt;line-height:1.5;color:${ink};background:${paper};margin:0;padding:2cm 2.2cm;max-width:21cm}
h1,h2,h3{line-height:1.25}table{border-collapse:collapse}td,th{border:1px solid ${rule};padding:4px 6px}img{max-width:100%}
</style></head><body>${html}</body></html>`;
}

/** Previous / next document in the visible list (wraps around; null if the list has one item). */
export function neighbour<T extends { id: string }>(list: T[], id: string, dir: 1 | -1): T | null {
  const i = list.findIndex(d => d.id === id);
  if (i < 0 || list.length < 2) return null;
  return list[(i + dir + list.length) % list.length];
}
