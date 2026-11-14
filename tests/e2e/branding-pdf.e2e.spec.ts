import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Document branding in the browser PDF (html2canvas + jsPDF): the real exporter renders a branded
// MOBIFORWORK NDA with a logo and Lato. Harness: src/app/e2e/pdf (dev only, ?branded=1).
// The PDF pages are JPEG images, so the check rasterises page 1 and looks for the logo colours.

const OUT = resolve(__dirname, '../../test-results/branding');

function firstPageJpeg(pdf: Buffer): Buffer {
  const s = pdf.toString('latin1');
  const i = s.indexOf('/DCTDecode');
  const start = s.indexOf('stream', i) + 'stream'.length;
  const from = s[start] === '\r' ? start + 2 : start + 1;
  return pdf.subarray(from, s.indexOf('endstream', from));
}

test('branded NDA → PDF with logo, brand colours and brand font', async ({ page }) => {
  await page.goto('/e2e/pdf?branded=1');
  await expect(page.locator('#pdf')).not.toHaveValue('', { timeout: 60_000 });
  const b64 = await page.locator('#pdf').inputValue();
  expect(b64.startsWith('ERROR')).toBe(false);
  await expect(page.locator('#font')).toHaveText('loaded');

  const pdf = Buffer.from(b64, 'base64');
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const jpeg = firstPageJpeg(pdf);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, 'branded-nda.pdf'), pdf);

  await page.setContent(`<img id="p" src="data:image/jpeg;base64,${jpeg.toString('base64')}" style="width:794px">`);
  await page.waitForFunction(() => (document.getElementById('p') as HTMLImageElement).complete);
  await page.locator('#p').screenshot({ path: resolve(OUT, 'branded-nda-page1.png') });

  // Count logo pixels (navy #1f3a5f and gold #b8882a) in the header band (top 15 % of the page).
  const found = await page.evaluate(() => {
    const img = document.getElementById('p') as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = Math.round(img.naturalHeight * 0.15);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const near = (i: number, r: number, g: number, b: number) => Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) < 40;
    let navy = 0, gold = 0;
    for (let i = 0; i < d.length; i += 4) { if (near(i, 0x1f, 0x3a, 0x5f)) navy++; if (near(i, 0xb8, 0x88, 0x2a)) gold++; }
    return { navy, gold };
  });
  expect(found.gold).toBeGreaterThan(2000);
  expect(found.navy).toBeGreaterThan(2000);
});
