// Page breaks for the PDF export (agent-export.ts buildPdfBlob). Pure — unit tested.
// The document is rendered once (html2canvas) and sliced into A4 pages. Slices may only end
// between text lines (never through one), outside "keep together" zones (a heading with the line
// after it, a signature block, an image), and leave the same margin at the top and bottom of
// every page.

export interface Zone { top: number; bottom: number }

/**
 * @param lineBottoms  y (CSS px from the top of the document) where a text line / atomic box ends
 * @param zones        ranges a break may not fall inside (top < y < bottom)
 * @param total        document height
 * @param pageContent  usable height per page (page height minus top and bottom margins)
 * @returns page start offsets; page i spans [starts[i], starts[i+1] ?? total)
 */
export function pageStarts(lineBottoms: number[], zones: Zone[], total: number, pageContent: number): number[] {
  const candidates = [...new Set(lineBottoms.map(y => Math.round(y)))]
    .filter(y => y > 0 && y < total && !zones.some(z => y > z.top && y < z.bottom))
    .sort((a, b) => a - b);
  const starts = [0];
  let start = 0;
  for (let guard = 0; guard < 1000 && total - start > pageContent; guard++) {
    const limit = start + pageContent;
    let cut = -1;
    for (const c of candidates) {
      if (c <= start + 1) continue;
      if (c > limit) break;
      cut = c;
    }
    // Nothing fits (a single block taller than a page): cut at the limit rather than loop.
    if (cut < 0 || cut - start < pageContent * 0.3) {
      const fallback = candidates.filter(c => c > start + 1 && c <= limit).pop();
      cut = fallback && fallback - start >= pageContent * 0.3 ? fallback : (cut > start ? cut : limit);
    }
    starts.push(cut);
    start = cut;
  }
  return starts;
}

/** A4 in CSS px at 96 dpi and the margins used by the PDF export. */
export const A4_PX = { width: 794, height: 1123 };
export const PDF_MARGIN_MM = { top: 20, bottom: 22 };
export const PX_PER_MM = A4_PX.width / 210;
