// /documents navigation model, smart views and drag-and-drop payloads.
import type { DocumentRecord } from '@/lib/storage-client';

// ── Location (URL ⇄ state) ───────────────────────────────────────

// Smart views are virtual: computed from document fields, nothing is moved.
// "Contratos por vencer" joins this list with F0/F3 (contracts collection), not before.
export type SmartView = 'casos' | 'clientes' | 'microsoft' | 'firma';

export type DocsLocation =
  | { kind: 'folder'; folderId: string | null }
  | { kind: 'view'; view: SmartView; key: string | null };

export const ROOT_LOCATION: DocsLocation = { kind: 'folder', folderId: null };

export function parseLocation(params: URLSearchParams | null): DocsLocation {
  const view = params?.get('view');
  if (view && SMART_VIEWS.some(v => v.id === view)) {
    return { kind: 'view', view: view as SmartView, key: params?.get('key') || null };
  }
  return { kind: 'folder', folderId: params?.get('folder') || null };
}

export function locationHref(loc: DocsLocation): string {
  if (loc.kind === 'view') return `/documents?view=${loc.view}${loc.key ? `&key=${encodeURIComponent(loc.key)}` : ''}`;
  return loc.folderId ? `/documents?folder=${encodeURIComponent(loc.folderId)}` : '/documents';
}

// ── Smart views ──────────────────────────────────────────────────

const PENDING_SIGNATURE = new Set(['pending_owner', 'sent', 'delivered']);

export const SMART_VIEWS: {
  id: SmartView;
  label: string;
  grouped: boolean;                     // true → first level lists groups (cases / clients)
  match?: (d: DocumentRecord) => boolean;
}[] = [
  { id: 'casos',     label: 'Por caso',                grouped: true },
  { id: 'clientes',  label: 'Por cliente',             grouped: true },
  { id: 'microsoft', label: 'Importados de Microsoft', grouped: false, match: d => !!d.externalRef || d.source === 'microsoft' },
  { id: 'firma',     label: 'Pendientes de firma',     grouped: false, match: d => !!d.signatureStatus && PENDING_SIGNATURE.has(d.signatureStatus) },
];

/** Views whose data exists for this user (the others stay hidden). */
export function availableViews(docs: DocumentRecord[], hasCaseDocs: boolean, hasClientDocs: boolean) {
  return SMART_VIEWS.filter(v => {
    if (v.id === 'casos') return hasCaseDocs;
    if (v.id === 'clientes') return hasClientDocs;
    return docs.some(d => v.match!(d));
  });
}

// ── Drag and drop ────────────────────────────────────────────────

export const DND_MIME = 'application/x-avocat-items';

export interface DragPayload { docIds: string[]; folderIds: string[] }

export function setDragPayload(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

/** During dragover only the types are readable, not the data. */
export function isItemDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(DND_MIME);
}

export function isFileDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

export function readDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DND_MIME);
    if (!raw) return null;
    const p = JSON.parse(raw) as DragPayload;
    return Array.isArray(p.docIds) && Array.isArray(p.folderIds) ? p : null;
  } catch { return null; }
}
