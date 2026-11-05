import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pdfText } from '@/lib/pdf-text';

test.describe('PDF text extraction', () => {
  test('reads the text layer with the installed pdf-parse', async () => {
    const text = await pdfText(readFileSync(join(__dirname, '../fixtures/sample.pdf')));
    expect(text.length).toBeGreaterThan(200);
    expect(text).toMatch(/divorcio/i);
  });

  test('nobody calls pdf-parse directly (the old function API returned nothing after the upgrade)', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (/ 2(\.|$)|api\.disabled/.test(f)) continue;
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !p.endsWith('pdf-text.ts') && readFileSync(p, 'utf8').includes("require('pdf-parse')")) offenders.push(p);
      }
    };
    walk(join(__dirname, '../../src'));
    expect(offenders).toEqual([]);
  });
});
