import { test, expect } from '@playwright/test';
import { renderMfwServices } from '@/lib/org-templates/mobiforwork-services';
import { amountToSpanish, numberToSpanish, spanishDate } from '@/lib/org-templates/spanish-numbers';
import { buildDocHtml, countSignatureBlocks } from '@/lib/doc-html';

const base = { fechaContrato: '2026-11-11', colaborador: { nombre: 'Juan Pérez', nacionalidad: 'colombiana', domicilio: 'Bogotá', documento: 'C.C. 101' }, inicioPool: '2026-08-10' };

test.describe('Spanish numbers and dates', () => {
  test('words', () => {
    expect(numberToSpanish(35)).toBe('treinta y cinco');
    expect(numberToSpanish(21, true)).toBe('veintiún');
    expect(numberToSpanish(100)).toBe('cien');
    expect(numberToSpanish(1250)).toBe('mil doscientos cincuenta');
    expect(numberToSpanish(2_000_001)).toBe('dos millones uno');
    expect(amountToSpanish(35, 'USD')).toBe('treinta y cinco dólares estadounidenses');
    expect(amountToSpanish(1, 'EUR')).toBe('un euro');
    expect(amountToSpanish(42.5, 'USD')).toBe('cuarenta y dos dólares estadounidenses con cincuenta centavos');
    expect(spanishDate('2026-08-10')).toBe('10 de agosto de 2026');
  });
});

test.describe('MOBIFORWORK service contract template', () => {
  test('fills the template fields; clauses fixed', () => {
    const md = renderMfwServices({ ...base, mesesIniciales: 2, tarifaHora: 35, moneda: 'USD' });
    expect(md).toContain('En Barbastro a 11 de noviembre de 2026');
    expect(md).toContain('Y, de otra parte, **Juan Pérez**, de nacionalidad **colombiana** mayor de edad y en representación propia');
    expect(md).toContain('A partir del día **10 de agosto de 2026**, EL COLABORADOR prestará sus servicios bajo una modalidad de Pool de Recursos');
    expect(md).toContain('vigencia inicial de dos (2) meses');
    expect(md).toContain('la cantidad de **treinta y cinco dólares estadounidenses (USD 35)** por cada hora');
    expect(md).toContain('servicios de consultoría funcional, de forma remota');
    expect(md).toContain('duración hasta final de proyecto, a contar desde la fecha de la firma');
    for (const h of ['PRIMERA. OBJETO', 'SEGUNDA. DURACIÓN', 'DECIMA. NO COMPETENCIA', 'UNDÉCIMA. PROTECCIÓN DE DATOS', 'DUODÉCIMA. JURISDICCIÓN']) expect(md).toContain(`## ${h}`);
    expect(md).not.toMatch(/xxx|202x/);
  });
  test('missing values stay as placeholders; one month singular; custom service in bold', () => {
    const md = renderMfwServices({ fechaContrato: '', colaborador: {}, inicioPool: '', mesesIniciales: 1, servicio: 'desarrollo SAP' });
    expect(md).toContain('[NOMBRE DEL COLABORADOR]');
    expect(md).toContain('[TARIFA POR HORA EN LETRA] (USD [IMPORTE])');
    expect(md).toContain('un (1) mes');
    expect(md).toContain('servicios de **desarrollo SAP**');
  });
  test('DocuSign: two signature tabs (LA EMPRESA, EL COLABORADOR)', () => {
    const md = renderMfwServices({ ...base, tarifaHora: 40 });
    expect(countSignatureBlocks(md)).toBe(2);
    const html = buildDocHtml(md, 'Contrato', undefined, undefined, { forSignature: true });
    expect(html.match(/\\s\d\\/g)).toEqual(['\\s1\\', '\\s2\\']);
  });
});

test.describe('personal data stays out of the code', () => {
  test('the representative DNI comes from the stored template data', () => {
    expect(renderMfwServices({ ...base, empresaDni: '00000000T' })).toContain('con DNI 00000000T en nombre y representación de MOBIFORWORK S.L.');
    expect(renderMfwServices(base)).toContain('con DNI [DNI DEL REPRESENTANTE] en nombre');
  });
});
