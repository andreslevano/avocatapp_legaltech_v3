import { test, expect } from '@playwright/test';
import { inPreview, PREVIEW_DOMAINS } from '@/lib/preview';
import { canUseContracts } from '@/lib/contracts/config';
import { canUseDocusign } from '@/lib/docusign/config';
import { canUseMicrosoft } from '@/lib/integrations/microsoft/config';

test.describe('preview access', () => {
  test('named testers, with or without verification', () => {
    expect(inPreview('andres.levano@mobilityforwork.es', ['andres.levano@mobilityforwork.es'])).toBe(true);
    expect(inPreview({ email: ' Andres.Levano@MobilityForWork.es ', emailVerified: false }, ['andres.levano@mobilityforwork.es'])).toBe(true);
  });
  test('everyone at mobilityforwork.es — only with a verified email', () => {
    expect(PREVIEW_DOMAINS).toContain('mobilityforwork.es');
    expect(inPreview({ email: 'eduardo.fong@mobilityforwork.es', emailVerified: true }, [])).toBe(true);
    expect(inPreview({ email: 'nuevo.socio@MobilityForWork.es', emailVerified: true }, [])).toBe(true);   // future users
    expect(inPreview({ email: 'x@mobilityforwork.es', emailVerified: false }, [])).toBe(false);           // unverified sign-up
    expect(inPreview('x@mobilityforwork.es', [])).toBe(false);                                            // bare email can't prove it
    expect(inPreview({ email: 'x@evil-mobilityforwork.es', emailVerified: true }, [])).toBe(false);
    expect(inPreview({ email: 'x@mobilityforwork.es.evil.com', emailVerified: true }, [])).toBe(false);
    expect(inPreview({ email: 'x@gmail.com', emailVerified: true }, [])).toBe(false);
    expect(inPreview(null, [])).toBe(false);
  });
  test('all three features follow the rule and still require the Abogados plan', () => {
    const colleague = { email: 'geovany.manzap@mobilityforwork.es', emailVerified: true };
    for (const gate of [canUseContracts, canUseDocusign, canUseMicrosoft]) {
      expect(gate('Abogados', colleague)).toBe(true);
      expect(gate('Autoservicio', colleague)).toBe(false);
      expect(gate('Abogados', { email: 'otro@firma.es', emailVerified: true })).toBe(false);
    }
  });
});
