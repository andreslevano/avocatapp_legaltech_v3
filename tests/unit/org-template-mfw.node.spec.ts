import { test, expect } from '@playwright/test';
import { renderMfwNda, MFW_NDA_TEMPLATE } from '@/lib/org-templates/mobiforwork-nda';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { buildDocHtml, countSignatureBlocks } from '@/lib/doc-html';

const company = { tipo: 'sociedad' as const, razonSocial: 'ACME SL', nif: 'B12345678', domicilio: 'C/ Mayor 1', nombre: 'Ana Pérez', documento: 'DNI 1Z', cargo: 'Administradora', facultades: 'poder nº 9', email: 'ana@acme.es' };

test.describe('MOBIFORWORK validated NDA template', () => {
  test('fixed structure: 14 clauses, Anexo I, fixed parties and terms, no reviewer note', () => {
    const md = renderMfwNda({ receptor: company, productos: 'Plataforma MFW' });
    for (let n = 1; n <= 14; n++) expect(md).toContain(`## CLÁUSULA ${n}.`);
    for (const s of ['## REUNIDAS', '## EXPONEN', '## CLÁUSULAS', '## ANEXO I. PRODUCTOS PROTEGIDOS AÑADIDOS DESPUÉS DE LA FIRMA',
      'MOBIFORWORK S.L., con domicilio social en el P.I. Valle del Cinca', 'CIF ESB22430706', 'Félix Dia Morales',
      'diez mil euros (10.000 €)', 'Permanecerá vigente durante cinco (5) años', 'diez (10) años desde cada revelación',
      'Juzgados y Tribunales de Huesca', 'support@mobilityforwork.es', 'en Barbastro (Huesca), a __ de __________ de ____']) {
      expect(md).toContain(s);
    }
    expect(md).not.toMatch(/VERSIÓN REVISADA|color rojo|rellénese la opción/);
  });
  test('Opción B (sociedad) vs Opción A (persona física)', () => {
    const b = renderMfwNda({ receptor: company, productos: 'X' });
    expect(b).toContain('De otra parte, **ACME SL**, con domicilio social en **C/ Mayor 1**, con número de identificación fiscal **B12345678**');
    expect(b).toContain('La sociedad responde del cumplimiento del Acuerdo');
    expect(b).not.toContain('actuando en nombre propio');
    const a = renderMfwNda({ receptor: { tipo: 'persona', nombre: 'Juan Ruiz', email: 'j@x.es' }, productos: 'X' });
    expect(a).toContain('De otra parte, D./Dña. **Juan Ruiz**, mayor de edad, con domicilio en [DOMICILIO DEL RECEPTOR]');
    expect(a).toContain('actuando en nombre propio');
    expect(a).toContain('Sociedad y NIF (si firma una sociedad): —');
  });
  test('missing data stays as the template placeholder; products one per line', () => {
    const md = renderMfwNda({ receptor: { tipo: 'sociedad' }, productos: '- Plataforma A\n\n• Portal B' });
    expect(md).toContain('[RAZÓN SOCIAL DEL RECEPTOR]');
    expect(md).toContain('[ESCRITURA DE PODER O CARGO INSCRITO]');
    expect(md).toContain('- **Plataforma A**\n- **Portal B**');
    expect(renderMfwNda({ receptor: company, productos: '' })).toContain('[DESCRIPCIÓN DE LOS PRODUCTOS PROTEGIDOS]');
  });
  test('DocuSign: exactly the two parties sign; Anexo I lines are not signature tabs', () => {
    const md = renderMfwNda({ receptor: company, productos: 'X' });
    expect(countSignatureBlocks(md)).toBe(2);
    const html = buildDocHtml(md, 'NDA', undefined, undefined, { forSignature: true });
    expect(html.match(/\\s\d\\/g)).toEqual(['\\s1\\', '\\s2\\']);
    expect(html.match(/\\d\d\\/g)).toEqual(['\\d1\\', '\\d2\\']);
    expect(html).toContain('Firma y sello:');
  });
  test('who gets the template', () => {
    expect(orgNdaTemplateFor({ email: 'eduardo.fong@mobilityforwork.es', emailVerified: true })).toBe('mobilityforwork');
    expect(orgNdaTemplateFor({ email: 'andres.levano@mobilityforwork.es', emailVerified: false })).toBe('mobilityforwork');  // named
    expect(orgNdaTemplateFor({ email: 'nuevo@mobilityforwork.es', emailVerified: false })).toBeNull();
    expect(orgNdaTemplateFor({ email: 'x@otra.es', emailVerified: true })).toBeNull();
    expect(MFW_NDA_TEMPLATE.termMonths).toBe(60);
  });
});
