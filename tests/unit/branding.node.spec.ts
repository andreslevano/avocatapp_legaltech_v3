import { test, expect } from '@playwright/test';
import {
  COLOR_PRESETS, DEFAULT_BRANDING, FONT_CATALOG, FONT_IDS, contrastRatio, fitLogo, googleFontsHref, isHex6,
  isSafeLogoSrc, lowContrastOnWhite, primaryFamily, resolveBranding, sanitizeBranding, withLogoSrc, withSafeFont,
} from '@/lib/branding';

const LOGO = 'https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fu1%2Fbranding%2Flogo.png?alt=media&token=t';
const branded = {
  logoUrl: LOGO, logoPath: 'users/u1/branding/logo.png', logoWidth: 600, logoHeight: 200, logoPosition: 'right',
  colors: { primary: '#1F3A5F', secondary: '#5b6b7f' }, font: 'lato', applyColorsToHeadings: true,
};
const user = { branding: branded, legalCompanyName: 'Bufete Pérez', legalIdType: 'NIF', legalIdNumber: 'B123', displayName: 'Ana' };

test.describe('validators', () => {
  test('hex', () => {
    expect(isHex6('#a1B2c3')).toBe(true);
    for (const v of ['#abc', 'a1b2c3', '#a1b2c3;', '#a1b2c3 ', 'red', 1, null]) expect(isHex6(v)).toBe(false);
  });
  test('contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(lowContrastOnWhite('#444444')).toBe(false);
    expect(lowContrastOnWhite('#e8c97a')).toBe(true);
  });
  test('logo src allow-list', () => {
    expect(isSafeLogoSrc(LOGO)).toBe(true);
    expect(isSafeLogoSrc('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    for (const v of ['data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 'https://evil.com/x.png',
      `${LOGO}" onerror="alert(1)`, 'http://firebasestorage.googleapis.com/x']) expect(isSafeLogoSrc(v)).toBe(false);
  });
  test('sanitize drops invalid fields', () => {
    const s = sanitizeBranding({ ...branded, colors: { primary: 'red', secondary: '#ABCDEF' }, font: 'comic', logoUrl: 'https://evil.com/a.png', extra: 1 });
    expect(s).toEqual({ ...DEFAULT_BRANDING, logoPosition: 'right', colors: { primary: '#444444', secondary: '#abcdef' }, applyColorsToHeadings: true });
    expect(sanitizeBranding(undefined)).toEqual(DEFAULT_BRANDING);
  });
});

test.describe('fonts', () => {
  test('every stack ends in a web-safe family + generic', () => {
    for (const id of FONT_IDS) {
      const f = FONT_CATALOG[id];
      expect(f.css).toMatch(/(Arial, Helvetica, sans-serif|'Times New Roman', Times, serif)$/);
      expect(f.safeCss).toMatch(/(Arial, Helvetica, sans-serif|'Times New Roman', Times, serif)$/);
      expect(f.css.endsWith(f.safeCss.split(', ').slice(-3).join(', '))).toBe(true);
    }
  });
  test('google href + primary family', () => {
    expect(googleFontsHref(FONT_CATALOG.lato)).toBe('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap');
    expect(googleFontsHref(FONT_CATALOG.times)).toBeNull();
    expect(primaryFamily(FONT_CATALOG['dm-sans'])).toBe('DM Sans');
  });
});

test.describe('resolveBranding', () => {
  test('no branding → default visuals, user header', () => {
    const r = resolveBranding({ displayName: 'Ana', legalIdNumber: '123', legalIdType: 'DNI' });
    expect(r.isDefault).toBe(true);
    expect(r.logo).toBeNull();
    expect(r.font.id).toBe('times');
    expect(r.header).toEqual({ authorName: 'Ana', authorNif: 'DNI 123' });
    expect(resolveBranding(null).header).toEqual({ authorName: '', authorNif: undefined });
  });
  test('stored branding applies', () => {
    const r = resolveBranding(user);
    expect(r.isDefault).toBe(false);
    expect(r.primary).toBe('#1f3a5f');
    expect(r.headingColor).toBe('#1f3a5f');
    expect(r.font.id).toBe('lato');
    expect(r.logo).toEqual({ src: LOGO, width: 200, height: 67, position: 'right' });
    expect(r.header).toEqual({ authorName: 'Bufete Pérez', authorNif: 'NIF B123' });
  });
  test('org template: org header always; user visuals only for members', () => {
    const org = { company: 'MOBIFORWORK S.L.', cif: 'ESB22430706' };
    const member = resolveBranding(user, { ...org, member: true });
    expect(member.header).toEqual({ authorName: 'MOBIFORWORK S.L.', authorNif: 'CIF ESB22430706' });
    expect(member.font.id).toBe('lato');
    const outsider = resolveBranding(user, { ...org, member: false });
    expect(outsider.header.authorName).toBe('MOBIFORWORK S.L.');
    expect(outsider.isDefault).toBe(true);
    expect(outsider.logo).toBeNull();
  });
  test('reset to default = default', () => {
    expect(resolveBranding({ branding: DEFAULT_BRANDING }).isDefault).toBe(true);
    expect(resolveBranding({ branding: { ...DEFAULT_BRANDING, logoPosition: 'right' } }).isDefault).toBe(true);
  });
  test('helpers', () => {
    const r = resolveBranding(user);
    expect(withLogoSrc(r, 'data:image/png;base64,AAAA').logo?.src).toBe('data:image/png;base64,AAAA');
    expect(withLogoSrc(r, 'data:text/html;base64,AAAA').logo?.src).toBe(LOGO);
    expect(withSafeFont(r).font.css).toBe('Arial, Helvetica, sans-serif');
    expect(withSafeFont(r).font.google).toBeUndefined();
    expect(fitLogo(100, 50)).toEqual({ width: 100, height: 50 });
    expect(fitLogo(300, 300)).toEqual({ width: 68, height: 68 });
    expect(fitLogo(0, 0)).toEqual({ width: 200, height: 68 });
  });
  test('presets are valid hex', () => {
    expect(COLOR_PRESETS).toHaveLength(6);
    for (const p of COLOR_PRESETS) { expect(isHex6(p.primary)).toBe(true); expect(isHex6(p.secondary)).toBe(true); }
  });
});
