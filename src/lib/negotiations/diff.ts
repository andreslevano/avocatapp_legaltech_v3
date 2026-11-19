// Word-level diff (current wording vs proposed) for the comparison view. Pure, no dependencies.
// Longest common subsequence over word tokens (whitespace kept as its own tokens so the output
// re-joins to the exact texts). Clauses are ≤ 4.000 characters, so O(n·m) is fine; above
// MAX_CELLS the diff degrades to "all removed / all added".

export type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

const MAX_CELLS = 4_000_000;

const tokens = (s: string) => s.split(/(\s+)/).filter(t => t !== '');

export function wordDiff(before: string, after: string): DiffPart[] {
  if (before === after) return before ? [{ type: 'same', text: before }] : [];
  const a = tokens(before), b = tokens(after);
  const out: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text; else out.push({ type, text });
  };
  if (a.length * b.length > MAX_CELLS) {
    if (before) push('del', before);
    if (after) push('add', after);
    return out;
  }
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const w = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * w + j] = a[i] === b[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('same', a[i]); i++; j++; }
    else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) push('del', a[i++]);
    else push('add', b[j++]);
  }
  while (i < a.length) push('del', a[i++]);
  while (j < b.length) push('add', b[j++]);
  return out;
}

/** True when the diff has changes (ignoring whitespace-only differences). */
export const hasChanges = (parts: DiffPart[]) => parts.some(p => p.type !== 'same' && p.text.trim() !== '');
