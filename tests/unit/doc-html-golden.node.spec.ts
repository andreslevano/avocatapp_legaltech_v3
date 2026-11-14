// Golden output of buildDocHtml captured BEFORE document branding existed: unbranded documents
// (no branding, or DEFAULT_BRANDING) must stay byte-identical. Regenerate only on purpose:
//   UPDATE_GOLDEN=1 npx playwright test -c playwright.node.config.ts tests/unit/doc-html-golden
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildDocHtml } from '@/lib/doc-html';

const DIR = resolve(__dirname, '../fixtures/doc-html');
const DATE_RE = /<span class="doc-date">[^<]*<\/span>/;
const stable = (html: string) => html.replace(DATE_RE, '<span class="doc-date">__DATE__</span>');

const GOLDEN_MD = `# CONTRATO DE PRUEBA

En Madrid, a 1 de noviembre de 2026.

## REUNIDOS

De una parte, **ACME S.L.** <script>alert(1)</script> con *NIF* \`B12345678\`.

- Uno
- Dos

---

## FIRMAS

**ACME S.L.**
Fecha: ____________
Firma: ________________________

**OTRA S.L.**
Fecha: ____________
Firma: ________________________
`;

const GOLDEN_CASES: Record<string, () => string> = {
  plain: () => buildDocHtml(GOLDEN_MD, 'Contrato <x>'),
  meta: () => buildDocHtml(GOLDEN_MD, 'Contrato', 'https://x/sig.png', { authorName: 'Bufete & Co', authorNif: 'NIF B1' }),
  signature: () => buildDocHtml(GOLDEN_MD, 'Contrato', undefined, { authorName: 'Bufete' }, { forSignature: true }),
};

for (const [name, build] of Object.entries(GOLDEN_CASES)) {
  test(`buildDocHtml golden: ${name}`, () => {
    const file = resolve(DIR, `${name}.html`);
    const html = stable(build());
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, html);
    expect(html).toBe(readFileSync(file, 'utf8'));
  });
}
