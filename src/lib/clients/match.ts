// Match a client name (typed, or proposed by the case analysis) against the user's clients, so a
// case is linked to the right client — or a new one is proposed. Pure, client-safe. Unit tested.

export interface MatchableClient { id: string; name: string; company?: string; email?: string; companyTaxId?: string; idNumber?: string }

// Legal-form words that don't identify a company ("Acme S.L." = "ACME, Sociedad Limitada").
const LEGAL_WORDS = new Set([
  'sa', 'sl', 'slu', 'sau', 'sll', 'slp', 'sc', 'scp', 'sca', 'spa', 'srl', 'ltda', 'ltd', 'llc', 'inc', 'corp', 'cb', 'eirl', 'spa',
  'sociedad', 'anonima', 'limitada', 'unipersonal', 'cooperativa', 'compania', 'cia', 'y', 'de', 'del', 'la', 'el', 'los', 'las',
]);

/** "Sociedad Concesionaria Salud Siglo XXI S.A." → "concesionaria salud siglo xxi". */
export function normalizeName(raw: string): string {
  return (raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b([a-z])\.(?=[a-z]\.?)/g, '$1')       // s.a. → sa, s.l.u. → slu
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w && !LEGAL_WORDS.has(w))
    .join(' ')
    .trim();
}

const SOCIEDAD_RE = /\b(s\.?\s?a\.?|s\.?\s?l\.?(\s?u\.?)?|s\.?\s?a\.?\s?u\.?|sociedad|ltda\.?|ltd\.?|llc|inc\.?|corp\.?|s\.?\s?c\.?|s\.?\s?r\.?\s?l\.?|cooperativa|compa[ñn][ií]a|spa)\s*$|\bsociedad\b/i;

/** A company name (legal form in it) → 'sociedad'; otherwise a natural person. */
export const guessPersonType = (name: string): 'persona' | 'sociedad' => (SOCIEDAD_RE.test((name || '').trim()) ? 'sociedad' : 'persona');

/** 0..1: exact (normalised) = 1; one contains the other = 0.9; otherwise word overlap. */
export function nameScore(a: string, b: string): number {
  const x = normalizeName(a), y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return Math.min(x.length, y.length) >= 4 ? 0.9 : 0.5;
  const wx = new Set(x.split(' ')), wy = new Set(y.split(' '));
  const common = [...wx].filter(w => wy.has(w) && w.length > 1).length;
  return common / Math.max(wx.size, wy.size);
}

export interface ClientMatch<C> { client: C; score: number }

/** Clients that may be this name (name, company or tax id), best first. */
export function matchClients<C extends MatchableClient>(query: string, clients: C[], min = 0.5): ClientMatch<C>[] {
  const q = (query || '').trim();
  if (!q) return [];
  const id = q.replace(/[\s.-]/g, '').toUpperCase();
  return clients
    .map(c => {
      const ids = [c.companyTaxId, c.idNumber].filter(Boolean).map(v => v!.replace(/[\s.-]/g, '').toUpperCase());
      const score = ids.includes(id) && id.length >= 6 ? 1 : Math.max(nameScore(q, c.name), c.company ? nameScore(q, c.company) : 0);
      return { client: c, score };
    })
    .filter(m => m.score >= min)
    .sort((a, b) => b.score - a.score || a.client.name.localeCompare(b.client.name));
}

/** The client to link without asking: one clear match (≥ 0.9, and no other as good). */
export function confidentMatch<C extends MatchableClient>(query: string, clients: C[]): C | null {
  const m = matchClients(query, clients, 0.9);
  if (!m.length) return null;
  return m.length === 1 || m[0].score > m[1].score ? m[0].client : null;
}
