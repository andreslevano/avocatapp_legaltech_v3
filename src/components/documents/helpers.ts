import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';

// ── Doc type inference ────────────────────────────────────────────

export const DOC_TIPOS = ['NDA','Demanda','Contrato','Recurso','Análisis','Reclamación','Mandato','Extracción','Otro'] as const;
export type DocTipo = (typeof DOC_TIPOS)[number];

export function inferDocType(name: string): DocTipo {
  const n = name.toLowerCase();
  if (/\bnda\b|confidencial/.test(n))      return 'NDA';
  if (/demanda/.test(n))                   return 'Demanda';
  if (/contrato/.test(n))                  return 'Contrato';
  if (/recurso/.test(n))                   return 'Recurso';
  if (/an[aá]lisis/.test(n))              return 'Análisis';
  if (/reclamaci[oó]n/.test(n))           return 'Reclamación';
  if (/mandato/.test(n))                   return 'Mandato';
  if (/extracci[oó]n|extraccion/.test(n)) return 'Extracción';
  return 'Otro';
}

export const DOC_ESTADOS = ['Borrador','Generado','Firmado','Enviado'] as const;
export type DocEstado = (typeof DOC_ESTADOS)[number];

export function inferStatus(d: DocumentRecord): DocEstado {
  if (d.status) return d.status as DocEstado;
  return d.source === 'generated' ? 'Generado' : 'Borrador';
}

// ── Styling maps ─────────────────────────────────────────────────

export const STATUS_STYLE: Record<string, string> = {
  Borrador: 'bg-[#252218] text-[#6b6050] border-[#2e2b20]',
  Generado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Firmado:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Enviado:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const TIPO_STYLE: Record<string, string> = {
  NDA:         'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Demanda:     'bg-red-500/10 text-red-400 border-red-500/20',
  Contrato:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Recurso:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Análisis:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Reclamación: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Mandato:     'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Extracción:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Otro:        'bg-[#252218] text-[#6b6050] border-[#2e2b20]',
};

const FILE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
};
export function fileIcon(ext: string): string { return FILE_ICON[ext?.toLowerCase()] ?? '📎'; }

// ── Date helpers ─────────────────────────────────────────────────

export function tsSeconds(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return (ts as { seconds: number }).seconds;
  return 0;
}

export function formatDate(ts: unknown): string {
  const s = tsSeconds(ts);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Lookup helpers ───────────────────────────────────────────────

export function getCaseForDoc(d: DocumentRecord, cases: CaseDoc[]): CaseDoc | null {
  return d.caseId ? (cases.find(c => c.id === d.caseId) ?? null) : null;
}

export function getClientForDoc(d: DocumentRecord, cases: CaseDoc[], clients: ClientDoc[]): ClientDoc | null {
  if (d.clientId) return clients.find(c => c.id === d.clientId) ?? null;
  const caseDoc = getCaseForDoc(d, cases);
  if (caseDoc?.clientId) return clients.find(c => c.id === caseDoc.clientId) ?? null;
  return null;
}

// ── Filtering & sorting ──────────────────────────────────────────

export type SortCol = 'name' | 'tipo' | 'caso' | 'cliente' | 'fecha' | 'status';
export type SortDir = 'asc' | 'desc';

export interface DocFilters {
  search:    string;
  caseId:    string;
  clientId:  string;
  tipo:      string;
  dateRange: 'all' | '7d' | '30d' | '90d';
  status:    string;
}

export const EMPTY_FILTERS: DocFilters = {
  search: '', caseId: '', clientId: '', tipo: '', dateRange: 'all', status: '',
};

export function activeFilterCount(f: DocFilters): number {
  return [f.search, f.caseId, f.clientId, f.tipo, f.dateRange !== 'all' ? '1' : '', f.status].filter(Boolean).length;
}

export function applyFilters(
  docs: DocumentRecord[], f: DocFilters, cases: CaseDoc[], clients: ClientDoc[],
): DocumentRecord[] {
  const now = Date.now() / 1000;
  const cutoff: Record<string, number> = { '7d': now - 604800, '30d': now - 2592000, '90d': now - 7776000 };
  return docs.filter(d => {
    if (f.search && !d.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.caseId === '__none__' && d.caseId) return false;
    if (f.caseId && f.caseId !== '__none__' && d.caseId !== f.caseId) return false;
    if (f.clientId && getClientForDoc(d, cases, clients)?.id !== f.clientId) return false;
    if (f.tipo && inferDocType(d.name) !== f.tipo) return false;
    if (f.dateRange !== 'all' && tsSeconds(d.createdAt) < (cutoff[f.dateRange] ?? 0)) return false;
    if (f.status && inferStatus(d) !== f.status) return false;
    return true;
  });
}

export function sortDocs(
  docs: DocumentRecord[], col: SortCol, dir: SortDir, cases: CaseDoc[], clients: ClientDoc[],
): DocumentRecord[] {
  return [...docs].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    if (col === 'name')    { va = a.name.toLowerCase();                                        vb = b.name.toLowerCase(); }
    if (col === 'tipo')    { va = inferDocType(a.name);                                        vb = inferDocType(b.name); }
    if (col === 'caso')    { va = (getCaseForDoc(a, cases)?.title ?? '').toLowerCase();        vb = (getCaseForDoc(b, cases)?.title ?? '').toLowerCase(); }
    if (col === 'cliente') { va = (getClientForDoc(a, cases, clients)?.name ?? '').toLowerCase(); vb = (getClientForDoc(b, cases, clients)?.name ?? '').toLowerCase(); }
    if (col === 'fecha')   { va = tsSeconds(a.createdAt);                                      vb = tsSeconds(b.createdAt); }
    if (col === 'status')  { va = inferStatus(a);                                              vb = inferStatus(b); }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
