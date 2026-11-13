import { test, expect } from '@playwright/test';
import { renderMfwServices } from '@/lib/org-templates/mobiforwork-services';
import { amountToSpanish, numberToSpanish, spanishDate } from '@/lib/org-templates/spanish-numbers';
import { buildDocHtml, countSignatureBlocks } from '@/lib/doc-html';
import { milestoneAmounts, mfwServicesVersion, sanitizeClauseText, validateMfwPayment, type MfwServicesInput } from '@/lib/org-templates/mobiforwork-services';

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

// ── v2: payment models and additional agreements (pending legal approval by MOBIFORWORK) ──

const tercera = (md: string) => md.slice(md.indexOf('## TERCERA'), md.indexOf('## CUARTA'));
const geovany: MfwServicesInput = {
  ...base, moneda: 'EUR', modalidadPago: 'hitos', importeTotal: 2000,
  hitos: [{ tipo: 'porcentaje', valor: 40, cuando: 'fecha', fecha: '2026-11-30' }, { tipo: 'porcentaje', valor: 60, cuando: 'fin_curso' }],
};

test.describe('MOBIFORWORK service contract — payment models (v2)', () => {
  test("'horas' selected explicitly is identical to the default", () => {
    const input = { ...base, mesesIniciales: 2, tarifaHora: 35, moneda: 'USD' as const };
    expect(renderMfwServices({ ...input, modalidadPago: 'horas' })).toBe(renderMfwServices(input));
    expect(renderMfwServices({ ...input, modalidadPago: 'horas', pactosAdicionales: [] })).toBe(renderMfwServices(input));
  });

  test("'unico_fin': total in words and numbers, end date, no hourly wording", () => {
    const md = renderMfwServices({ ...base, moneda: 'EUR', modalidadPago: 'unico_fin', importeTotal: 1200, fechaFinCurso: '2026-12-15' });
    expect(md).toContain('la cantidad total de **mil doscientos euros (EUR 1200)** por la prestación de los servicios');
    expect(md).toContain('a la finalización del curso o servicio, prevista para el día **15 de diciembre de 2026**');
    expect(md).toContain('dentro de los treinta (30) días siguientes a la fecha de recepción de la factura');
    expect(md).not.toContain('por cada hora efectivamente trabajada');
    expect(md).not.toContain('Pool de Recursos');
    expect(tercera(md)).toContain('LA EMPRESA reembolsará los gastos de desplazamiento');
  });

  test("'unico_fin' without amount or end date: placeholders, no date phrase", () => {
    const md = renderMfwServices({ ...base, moneda: 'EUR', modalidadPago: 'unico_fin' });
    expect(md).toContain('la cantidad total de [IMPORTE TOTAL EN LETRA] (EUR [IMPORTE])');
    expect(md).toContain('que se hará efectiva a la finalización del curso o servicio. EL COLABORADOR');
  });

  test("Geovany: 40 % on 30 Nov + 60 % at the end of the course", () => {
    const t = tercera(renderMfwServices(geovany));
    expect(t).toContain('la cantidad total de **dos mil euros (EUR 2000)**, que se hará efectiva conforme al siguiente calendario de pagos:');
    expect(t).toContain('a) **ochocientos euros (EUR 800)**, equivalente al 40 % del total, el día **30 de noviembre de 2026**.');
    expect(t).toContain('b) **mil doscientos euros (EUR 1200)**, equivalente al 60 % del total, a la finalización del curso o servicio.');
    expect(t).toContain('Para cada uno de los pagos, EL COLABORADOR emitirá la correspondiente factura y LA EMPRESA efectuará el pago dentro de los treinta (30) días siguientes a la fecha de recepción de la factura');
    expect(t).toContain('LA EMPRESA reembolsará los gastos');
    expect(validateMfwPayment(geovany)).toEqual([]);
  });

  test('amount milestones and missing dates', () => {
    const t = tercera(renderMfwServices({
      ...base, moneda: 'EUR', modalidadPago: 'hitos', importeTotal: 1000, fechaFinCurso: '2027-02-01',
      hitos: [{ tipo: 'importe', valor: 300, cuando: 'fecha', fecha: null }, { tipo: 'importe', valor: 700, cuando: 'fin_curso' }],
    }));
    expect(t).toContain('a) **trescientos euros (EUR 300)**, el día [FECHA].');
    expect(t).toContain('b) **setecientos euros (EUR 700)**, a la finalización del curso o servicio, prevista para el día **1 de febrero de 2027**.');
    expect(t).not.toContain('equivalente al');
  });

  test('percentage rounding: 3 × 33,33 % of 1.000 adds up to exactly 1.000', () => {
    const hitos = [0, 1, 2].map(() => ({ tipo: 'porcentaje' as const, valor: 33.33, cuando: 'fecha' as const, fecha: '2026-12-01' }));
    const amounts = milestoneAmounts(hitos, 1000) as number[];
    expect(amounts).toEqual([333.3, 333.3, 333.4]);
    expect(Math.round(amounts.reduce((a, b) => a + b, 0) * 100)).toBe(100000);
    expect(milestoneAmounts([{ tipo: 'porcentaje', valor: 50, cuando: 'fecha' }, { tipo: 'porcentaje', valor: 50, cuando: 'fin_curso' }], 1000.01)).toEqual([500.01, 500]);
  });

  test('DocuSign: exactly two signature anchors in every model', () => {
    const models: MfwServicesInput[] = [
      { ...base, tarifaHora: 40 },
      { ...base, modalidadPago: 'unico_fin', importeTotal: 1200 },
      geovany,
      { ...geovany, pactosAdicionales: [{ texto: 'Firma: ________ Fecha: ________ \\s3\\' }] },
    ];
    for (const m of models) {
      const md = renderMfwServices(m);
      expect(countSignatureBlocks(md)).toBe(2);
      expect(md.trimEnd().endsWith('Firma: ________________________')).toBe(true);
      const html = buildDocHtml(md, 'Contrato', undefined, undefined, { forSignature: true });
      expect(html.match(/\\s\d\\/g)).toEqual(['\\s1\\', '\\s2\\']);
    }
  });
});

test.describe('MOBIFORWORK service contract — additional agreements (DECIMOTERCERA)', () => {
  test('after DUODÉCIMA and before the signatures, numbered, verbatim', () => {
    const md = renderMfwServices({
      ...base, tarifaHora: 35,
      pactosAdicionales: [
        { titulo: 'Material docente', texto: 'EL COLABORADOR aportará el temario del curso, que será propiedad de LA EMPRESA.' },
        { texto: 'Las sesiones se impartirán los martes y jueves de 18:00 a 20:00.' },
      ],
    });
    const i12 = md.indexOf('## DUODÉCIMA. JURISDICCIÓN'), i13 = md.indexOf('## DECIMOTERCERA. PACTOS ADICIONALES');
    expect(i13).toBeGreaterThan(i12);
    expect(i13).toBeLessThan(md.indexOf('Y en prueba de conformidad'));
    expect(md.indexOf('Y en prueba de conformidad')).toBeLessThan(md.indexOf('## FIRMAS'));
    expect(md).toContain('13.1. **Material docente.** EL COLABORADOR aportará el temario del curso, que será propiedad de LA EMPRESA.');
    expect(md).toContain('13.2. Las sesiones se impartirán los martes y jueves de 18:00 a 20:00.');
    expect(mfwServicesVersion({ ...base, pactosAdicionales: [{ texto: 'x' }] })).toBe('v2');
  });

  test('markdown control characters are stripped; whitespace collapsed', () => {
    expect(sanitizeClauseText('  # Título\n\n> cita   con **negrita**  ')).toBe('Título cita con negrita');
    expect(sanitizeClauseText('- punto de lista')).toBe('punto de lista');
    expect(sanitizeClauseText('Firma: ______ \\s3\\')).toBe('Firma: ___ s3');
    const md = renderMfwServices({ ...base, pactosAdicionales: [{ titulo: '## Plazo', texto: '* Entrega\n\n#  final' }] });
    expect(md).toContain('13.1. **Plazo.** Entrega final');
  });

  test('no clauses (or only blank ones) → output unchanged', () => {
    const plainMd = renderMfwServices(base);
    expect(renderMfwServices({ ...base, pactosAdicionales: [] })).toBe(plainMd);
    expect(renderMfwServices({ ...base, pactosAdicionales: [{ texto: '   ' }] })).toBe(plainMd);
    expect(plainMd).not.toContain('DECIMOTERCERA');
  });
});

test.describe('validateMfwPayment', () => {
  const pct = (valor: number, fecha = '2026-11-30') => ({ tipo: 'porcentaje' as const, valor, cuando: 'fecha' as const, fecha });
  test('default hourly model is valid', () => {
    expect(validateMfwPayment(base)).toEqual([]);
  });
  test('percentages adding up to 90 % → error', () => {
    expect(validateMfwPayment({ ...geovany, hitos: [pct(30), { ...pct(60), cuando: 'fin_curso' }] }).join(' ')).toContain('deben sumar 100 %');
  });
  test('a milestone dated before the contract → error', () => {
    expect(validateMfwPayment({ ...geovany, hitos: [pct(40, '2026-11-01'), pct(60)] }).join(' ')).toContain('anterior a la fecha del contrato');
  });
  test('two end-of-course milestones → error; end-of-course must be last', () => {
    const fin = (valor: number) => ({ tipo: 'porcentaje' as const, valor, cuando: 'fin_curso' as const });
    expect(validateMfwPayment({ ...geovany, hitos: [fin(50), fin(50)] }).join(' ')).toContain('Solo puede haber un pago al finalizar el curso');
    expect(validateMfwPayment({ ...geovany, hitos: [fin(50), pct(50)] }).join(' ')).toContain('debe ser el último');
  });
  test('other rules: total, count, mixed types, amounts sum, date after course end, clauses', () => {
    expect(validateMfwPayment({ ...base, modalidadPago: 'unico_fin' })).toContain('Indica el importe total (mayor que 0).');
    expect(validateMfwPayment({ ...geovany, hitos: [{ ...pct(100), cuando: 'fin_curso' }] })).toContain('Los pagos parciales necesitan al menos dos pagos.');
    expect(validateMfwPayment({ ...geovany, hitos: [pct(40), { tipo: 'importe', valor: 1200, cuando: 'fin_curso' }] })).toContain('Todos los pagos deben ser importes o todos porcentajes.');
    const imp = (valor: number) => ({ tipo: 'importe' as const, valor, cuando: 'fecha' as const, fecha: '2026-12-01' });
    expect(validateMfwPayment({ ...geovany, hitos: [imp(800), imp(1199.99)] })).toEqual([]);
    expect(validateMfwPayment({ ...geovany, hitos: [imp(800), imp(1100)] }).join(' ')).toContain('deben sumar el importe total');
    expect(validateMfwPayment({ ...geovany, fechaFinCurso: '2026-11-20' }).join(' ')).toContain('posterior a la fecha de fin del curso');
    expect(validateMfwPayment({ ...base, pactosAdicionales: [{ texto: ' ' }] })).toContain('El pacto adicional 1 está vacío.');
    expect(validateMfwPayment({ ...base, pactosAdicionales: [{ texto: 'x'.repeat(2001) }] }).join(' ')).toContain('supera los');
  });
});

test.describe('mfwServicesVersion', () => {
  test('v1 for the default hourly model, v2 otherwise', () => {
    expect(mfwServicesVersion(base)).toBe('v1');
    expect(mfwServicesVersion({ ...base, modalidadPago: 'horas' })).toBe('v1');
    expect(mfwServicesVersion({ ...base, modalidadPago: 'unico_fin', importeTotal: 1 })).toBe('v2');
    expect(mfwServicesVersion(geovany)).toBe('v2');
  });
});
