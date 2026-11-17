// Formatting toolbar for plain textareas that feed documents (markdown subset of doc-html.ts):
// bold, italic, size (Normal / Subtítulo / Título) and bullet / numbered lists. Pure: text +
// selection in, text + new selection out. Unit tested.

export interface Edit { value: string; start: number; end: number }
export type LineStyle = 'normal' | 'h2' | 'h3' | 'bullet' | 'number';

/** Toggle **bold** / *italic* around the selection (empty selection → a placeholder to type over). */
export function toggleWrap(value: string, start: number, end: number, marker: '**' | '*'): Edit {
  const sel = value.slice(start, end);
  const m = marker.length;
  // Already wrapped (markers just outside or inside the selection) → unwrap.
  if (value.slice(start - m, start) === marker && value.slice(end, end + m) === marker
    && !(marker === '*' && (value[start - m - 1] === '*' || value[end + m] === '*'))) {
    return { value: value.slice(0, start - m) + sel + value.slice(end + m), start: start - m, end: end - m };
  }
  if (sel.length > 2 * m && sel.startsWith(marker) && sel.endsWith(marker) && !(marker === '*' && sel.startsWith('**'))) {
    const inner = sel.slice(m, -m);
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length };
  }
  const text = sel || (marker === '**' ? 'texto en negrita' : 'texto en cursiva');
  // Keep surrounding spaces outside the markers ("**a **" doesn't render).
  const lead = text.match(/^\s*/)![0], trail = text.match(/\s*$/)![0];
  const core = text.trim() || text;
  const out = `${lead}${marker}${core}${marker}${trail}`;
  return {
    value: value.slice(0, start) + out + value.slice(end),
    start: start + lead.length + m, end: start + lead.length + m + core.length,
  };
}

const PREFIX = /^(\s*)(?:[-*•►]\s+|\d{1,3}[.)]\s+|#{1,3}\s+)?/;

/** Current style of the line at `pos` (for the size selector / pressed buttons). */
export function lineStyleAt(value: string, pos: number): LineStyle {
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const line = value.slice(lineStart, value.indexOf('\n', pos) === -1 ? value.length : value.indexOf('\n', pos));
  if (/^\s*###\s/.test(line)) return 'h3';
  if (/^\s*#{1,2}\s/.test(line)) return 'h2';
  if (/^\s*[-*•►]\s/.test(line)) return 'bullet';
  if (/^\s*\d{1,3}[.)]\s/.test(line)) return 'number';
  return 'normal';
}

/**
 * Apply a line style to every line touched by the selection. Applying the style the first line
 * already has toggles it off (back to normal). Numbered lists are renumbered 1…n.
 */
export function applyLineStyle(value: string, start: number, end: number, style: LineStyle): Edit {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const toIdx = value.indexOf('\n', Math.max(end - (end > start && value[end - 1] === '\n' ? 1 : 0), start));
  const to = toIdx === -1 ? value.length : toIdx;
  const lines = value.slice(from, to).split('\n');
  const target = style !== 'normal' && lineStyleAt(value, from) === style ? 'normal' : style;
  let n = 0;
  const out = lines.map(l => {
    const body = l.replace(PREFIX, '');
    if (!body.trim()) return body;               // keep empty lines empty
    switch (target) {
      case 'h2': return `## ${body}`;
      case 'h3': return `### ${body}`;
      case 'bullet': return `- ${body}`;
      case 'number': return `${++n}. ${body}`;
      default: return body;
    }
  }).join('\n');
  return { value: value.slice(0, from) + out + value.slice(to), start: from, end: from + out.length };
}
