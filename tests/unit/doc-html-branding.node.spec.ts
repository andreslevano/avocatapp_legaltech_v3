import { test, expect } from '@playwright/test';
import { buildDocHtml, countSignatureBlocks, dateAnchor, signatureAnchor, signingHtmlFromSaved } from '@/lib/doc-html';
import { DEFAULT_BRANDING, resolveBranding, type ResolvedBranding } from '@/lib/branding';

const LOGO = 'https://firebasestorage.googleapis.com/v0/b/x/o/logo.png?alt=media&token=t';
const MD = `# NDA

Texto.

## FIRMAS

**A**
Fecha: ____________
Firma: ________________________

**B**
Fecha: ____________
Firma: ________________________
`;
const stable = (h: string) => h.replace(/<span class="doc-date">[^<]*<\/span>/, '').replace(/<td class="doc-date">[^<]*<\/td>/, '');
const owner = (b: object, extra: object = {}) => ({ branding: { ...DEFAULT_BRANDING, ...b }, ...extra });

test('default branding → byte-identical legacy HTML', () => {
  const meta = { authorName: 'Bufete', authorNif: 'NIF 1' };
  const legacy = buildDocHtml(MD, 'X', undefined, meta);
  expect(stable(buildDocHtml(MD, 'X', undefined, meta, { branding: resolveBranding(owner({})) }))).toBe(stable(legacy));
  expect(stable(buildDocHtml(MD, 'X', undefined, undefined, { branding: resolveBranding({ legalCompanyName: 'Bufete', legalIdType: 'NIF', legalIdNumber: '1' }) })))
    .toBe(stable(legacy));
});

test('branded header: logo left, colours, font, Google link', () => {
  const b = resolveBranding(owner({ logoUrl: LOGO, logoWidth: 300, logoHeight: 100, font: 'lato', colors: { primary: '#1f3a5f', secondary: '#5b6b7f' } }, { legalCompanyName: 'Bufete' }));
  const html = buildDocHtml(MD, 'X', undefined, undefined, { branding: b });
  expect(html).toContain('<table class="doc-header-b"');
  expect(html).not.toContain('<div class="doc-header">');
  expect(html).toContain(`<img class="doc-logo" src="${LOGO.replace(/&/g, '&amp;')}"`);
  expect(html).toContain('width="200" height="67"');
  expect(html).toMatch(/<td class="doc-logo-cell left">.*<\/td><td class="doc-header-text">/s);
  expect(html).toContain('border-bottom: 1.5pt solid #1f3a5f');
  expect(html).toContain("font-family: Lato, Arial, Helvetica, sans-serif");
  expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato');
  expect(html).not.toContain('h1, h2, h3 { color:');
  expect(html).toContain('<div class="doc-footer">');
});

test('logo right + headings coloured + no logo', () => {
  const right = buildDocHtml(MD, 'X', undefined, undefined, { branding: resolveBranding(owner({ logoUrl: LOGO, logoPosition: 'right', applyColorsToHeadings: true, colors: { primary: '#7a1f2b', secondary: '#999999' } })) });
  expect(right).toMatch(/<td class="doc-date">[^<]*<\/td><td class="doc-logo-cell right">/);
  expect(right).toContain('h1, h2, h3 { color: #7a1f2b; }');
  const noLogo = buildDocHtml(MD, 'X', undefined, undefined, { branding: resolveBranding(owner({ font: 'arial' })) });
  expect(noLogo).toContain('<table class="doc-header-b"');
  expect(noLogo).not.toContain('<img class="doc-logo"');
  expect(noLogo).not.toContain('fonts.googleapis.com');
});

test('escapes every user value and rejects unsafe colours / logo src', () => {
  const evil: ResolvedBranding = {
    ...resolveBranding(owner({ font: 'lato' })),
    header: { authorName: '<script>alert(1)</script>', authorNif: '"><img src=x onerror=alert(1)>' },
    primary: 'red;}</style><script>x</script>', secondary: '#zzzzzz',
    headingColor: 'url(javascript:alert(1))',
    logo: { src: 'javascript:alert(1)', width: 10, height: 10, position: 'left' },
  };
  const html = buildDocHtml(MD, '<b>T</b>', undefined, undefined, { branding: evil });
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img src=x');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('red;}');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).toContain('border-bottom: 1.5pt solid #444444');
});

test('forSignature anchors unchanged with branding; saved branded doc re-signs', () => {
  const b = resolveBranding(owner({ logoUrl: LOGO, font: 'dm-sans', colors: { primary: '#1e5b45', secondary: '#5f6f66' } }));
  const plain = buildDocHtml(MD, 'X', undefined, undefined, { forSignature: true });
  const branded = buildDocHtml(MD, 'X', undefined, undefined, { forSignature: true, branding: b });
  const anchors = (h: string) => h.match(/\\[sd]\d\\/g);
  expect(anchors(branded)).toEqual(anchors(plain));
  expect(anchors(branded)).toEqual([dateAnchor(1), signatureAnchor(1), dateAnchor(2), signatureAnchor(2)]);
  expect(countSignatureBlocks(MD)).toBe(2);
  const saved = buildDocHtml(MD, 'X', 'https://x/sig.png', undefined, { branding: b });
  const resign = signingHtmlFromSaved(saved, ['A', 'B'])!;
  expect(anchors(resign)).toEqual(anchors(plain));
  expect(resign).toContain('<img class="doc-logo"');
});
