import { test, expect } from '@playwright/test';
import { pageStarts } from '@/lib/pdf-pages';

// 30 lines of 20px: bottoms at 20, 40, …, 600
const lines = Array.from({ length: 30 }, (_, i) => (i + 1) * 20);

test.describe('PDF page breaks', () => {
  test('pages end on a line boundary, never through a line', () => {
    const s = pageStarts(lines, [], 600, 250);
    expect(s).toEqual([0, 240, 480]);
    s.slice(1).forEach(y => expect(y % 20).toBe(0));
  });
  test('a short document is one page', () => {
    expect(pageStarts(lines.slice(0, 5), [], 100, 250)).toEqual([0]);
  });
  test('keep-together zones (heading + next line, signature block) are not split', () => {
    // heading spans 200–220 and must stay with the line ending at 240 → no break at 220
    const s = pageStarts(lines, [{ top: 200, bottom: 240 }], 600, 230);
    expect(s[1]).toBe(200);
    // a signature block 180–280 moves whole to the next page
    expect(pageStarts(lines, [{ top: 180, bottom: 280 }], 600, 250)[1]).toBe(180);
  });
  test('a block taller than a page falls back to a hard cut instead of looping', () => {
    const s = pageStarts([1000], [{ top: 0, bottom: 1000 }], 1000, 300);
    expect(s.length).toBeGreaterThan(3);
    expect(s.every((y, i) => i === 0 || y > s[i - 1])).toBe(true);
  });
});
