// NDA negotiation — split a template's markdown into its numbered clauses and put it back together.
// Pure, client-safe. Unit tested on real renderMfwNda output.
//
//   preamble  everything before "## CLÁUSULA 1." (header, REUNIDAS, EXPONEN, "## CLÁUSULAS")
//   clauses   "## CLÁUSULA N. TÍTULO" + its text, N = 1, 2, 3… in order
//   tail      from the closing formula ("En prueba de conformidad…") or the next non-clause "## "
//             heading (FIRMAS, ANEXO I): never negotiated, so nobody can touch the signature block.
//
// assemble(splitClauses(md)) === md, byte for byte.

export interface SplitClause {
  /** 'c1' … 'cN' */
  key: string;
  n: number;
  heading: string;
  /** The clause text without its heading, trimmed (what the parties read and edit). */
  text: string;
  /** Whitespace around the text in the source, so the round trip is exact. Default "\n\n" / "\n\n". */
  lead?: string;
  trail?: string;
}

export interface SplitDocument { preamble: string; clauses: SplitClause[]; tail: string }

export type SplitResult = ({ ok: true } & SplitDocument) | { ok: false; error: string };

const CLAUSE_RE = /^## CLÁUSULA (\d+)\.[ \t]+(.+?)[ \t]*$/gm;
const TAIL_RE = /^(?:## (?!CLÁUSULA \d)|En prueba de conformidad)/m;

export const clauseKey = (n: number) => `c${n}`;

export function splitClauses(markdown: string, expectedCount?: number): SplitResult {
  if (typeof markdown !== 'string' || !markdown.trim()) return { ok: false, error: 'El documento está vacío.' };
  const md = markdown.replace(/\r\n/g, '\n');
  const heads = [...md.matchAll(CLAUSE_RE)].map(m => ({ at: m.index!, end: m.index! + m[0].length, n: Number(m[1]), heading: m[2] }));
  if (heads.length === 0) return { ok: false, error: 'No se encontraron cláusulas («## CLÁUSULA 1. …»).' };
  for (let i = 0; i < heads.length; i++) {
    if (heads[i].n !== i + 1) return { ok: false, error: `Las cláusulas no están en orden: se esperaba la ${i + 1} y aparece la ${heads[i].n}.` };
  }
  if (expectedCount !== undefined && heads.length !== expectedCount) {
    return { ok: false, error: `Se esperaban ${expectedCount} cláusulas y hay ${heads.length}.` };
  }

  const last = heads[heads.length - 1];
  const afterLast = md.slice(last.end);
  const t = TAIL_RE.exec(afterLast);
  const tailAt = t ? last.end + t.index : md.length;

  const clauses: SplitClause[] = heads.map((h, i) => {
    const bodyEnd = i + 1 < heads.length ? heads[i + 1].at : tailAt;
    const raw = md.slice(h.end, bodyEnd);
    const text = raw.trim();
    const lead = text ? raw.slice(0, raw.indexOf(text)) : raw;
    const trail = text ? raw.slice(raw.indexOf(text) + text.length) : '';
    return {
      key: clauseKey(h.n), n: h.n, heading: h.heading, text,
      ...(lead !== '\n\n' ? { lead } : {}), ...(trail !== '\n\n' ? { trail } : {}),
    };
  });
  return { ok: true, preamble: md.slice(0, heads[0].at), clauses, tail: md.slice(tailAt) };
}

/** Clause texts back into the document (preamble and tail untouched). */
export function assemble(doc: SplitDocument): string {
  return doc.preamble
    + doc.clauses.map(c => `## CLÁUSULA ${c.n}. ${c.heading}${c.lead ?? '\n\n'}${c.text}${c.trail ?? '\n\n'}`).join('')
    + doc.tail;
}
