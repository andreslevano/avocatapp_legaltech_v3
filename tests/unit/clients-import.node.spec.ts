// Clientes → Importar desde Excel: validation scenarios and a real template round trip.
import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { mapLimit } from '@/lib/clients/import-client';
import {
  canRequest, cellText, IMPORT_COLUMNS, IMPORT_MAX_REQUESTS, IMPORT_MAX_ROWS, matchHeaders, parseClientRows, toClientFields, type ParsedImport,
} from '@/lib/clients/import';
import { buildErrorReport, buildTemplate, ImportFileError, parseCsv, readClientFile } from '@/lib/clients/import-excel';

const H = IMPORT_COLUMNS.map(c => c.header);
const ok = (p: ReturnType<typeof parseClientRows>) => { if ('error' in p) throw new Error(p.error); return p as ParsedImport; };
const row = (o: Record<string, unknown>) => IMPORT_COLUMNS.map(c => o[c.field] ?? '');

test.describe('headers', () => {
  test('matched by name in any order, accents/case/asterisk ignored; unknown and repeated reported', () => {
    const m = matchHeaders(['EMAIL', 'nombre', 'Teléfono', 'Notas', 'Correo', 'tipo id']);
    expect([...m.map.entries()]).toEqual([[0, 'email'], [1, 'name'], [2, 'phone'], [5, 'idType']]);
    expect(m.unknown).toEqual(['Notas']);
    expect(m.repeated).toEqual(['email']);
    expect(m.missingRequired).toEqual([]);
  });
  test('missing Nombre → clear error; title rows above the header are skipped', () => {
    expect(parseClientRows([['Email'], ['a@b.es']], [])).toEqual({ error: expect.stringContaining('Nombre') });
    const p = ok(parseClientRows([['Mis clientes 2026'], [], ['Nombre', 'Email'], ['Ana', 'ana@x.es']], []));
    expect(p.headerRow).toBe(3);
    expect(p.rows[0]).toMatchObject({ rowNumber: 4, status: 'ok', values: { name: 'Ana', email: 'ana@x.es' } });
  });
});

test.describe('rows', () => {
  test('validation: required, email, DNI/NIE letter, id type, person type, CIF', () => {
    const p = ok(parseClientRows([H,
      row({ email: 'sin@nombre.es' }),
      row({ name: 'Mal email', email: 'ana@' }),
      row({ name: 'DNI malo', idType: 'dni', idNumber: '12345678A' }),
      row({ name: 'DNI bueno', idType: 'DNI', idNumber: '12.345.678-z' }),
      row({ name: 'NIE', idType: 'NIE', idNumber: 'X1234567L' }),
      row({ name: 'Sin tipo', idNumber: 'AB123' }),
      row({ name: 'Tipo raro', idType: 'Carnet', idNumber: '1' }),
      row({ name: 'Tipo cliente raro', personType: 'Empresa' }),
      row({ name: 'CIF malo', company: 'ACME', companyTaxId: 'B12345670' }),
      row({ name: 'Pasaporte', idType: 'pasaporte', idNumber: 'PA123456' }),
    ], []));
    const by = (n: number) => p.rows.find(r => r.rowNumber === n)!;
    expect(by(2).errors.name).toBeTruthy();
    expect(by(3).errors.email).toBeTruthy();
    expect(by(4).errors.idNumber).toContain('DNI');
    expect(by(5)).toMatchObject({ status: 'ok', values: { idType: 'DNI', idNumber: '12345678Z' } });
    expect(by(6).status).toBe('ok');
    expect(by(7).errors.idType).toBeTruthy();
    expect(by(8).errors.idType).toBeTruthy();
    expect(by(9).errors.personType).toBeTruthy();
    expect(by(10).errors.companyTaxId).toBeTruthy();
    expect(by(11)).toMatchObject({ status: 'ok', values: { idType: 'Pasaporte' } });
  });

  test('cleaning: markdown/anchors stripped, newlines, truncation warning, emails lowercased', () => {
    const p = ok(parseClientRows([H, row({
      name: '**Ana**\nPérez ____ #1', email: ' ANA@X.ES ', address: 'x'.repeat(250), phone: 34600111222,
    })], []));
    const r = p.rows[0];
    expect(r.values.name).toBe('Ana Pérez 1');
    expect(r.values.email).toBe('ana@x.es');
    expect(r.values.phone).toBe('34600111222');
    expect(r.values.address).toHaveLength(200);
    expect(r).toMatchObject({ status: 'warning', warnings: { address: expect.any(String) } });
  });

  test('empty rows skipped, limit of rows enforced', () => {
    const many = Array.from({ length: IMPORT_MAX_ROWS + 5 }, (_, i) => row({ name: `C${i}` }));
    const p = ok(parseClientRows([H, row({}), ...many], []));
    expect(p.skippedEmpty).toBe(1);
    expect(p.rows).toHaveLength(IMPORT_MAX_ROWS);
    expect(p.tooMany).toBe(true);
  });

  test('duplicates: against existing clients (email / document) and within the file', () => {
    const existing = [{ id: 'c1', name: 'Ana', email: 'ana@x.es' }, { id: 'c2', name: 'Luis', idType: 'DNI', idNumber: '12345678Z' }];
    const p = ok(parseClientRows([H,
      row({ name: 'Ana bis', email: 'Ana@X.es' }),
      row({ name: 'Luis bis', idType: 'DNI', idNumber: '12345678-Z' }),
      row({ name: 'Eva', email: 'eva@x.es' }),
      row({ name: 'Eva otra vez', email: 'eva@x.es' }),
      row({ name: 'Error no cuenta', email: 'eva@' }),
    ], existing));
    expect(p.rows.map(r => r.status)).toEqual(['duplicate', 'duplicate', 'ok', 'duplicate', 'error']);
    expect(p.rows[0].duplicateOf).toBe('Ana');
    expect(p.rows[3].duplicateOf).toContain('fila 4');
  });

  test('cell types from Excel: formulas, hyperlinks, rich text, errors, big numbers, dates', () => {
    expect(cellText({ formula: 'A1', result: 'Ana' })).toBe('Ana');
    expect(cellText({ text: 'ana@x.es', hyperlink: 'mailto:ana@x.es' })).toBe('ana@x.es');
    expect(cellText({ richText: [{ text: 'An' }, { text: 'a' }] })).toBe('Ana');
    expect(cellText({ error: '#N/A' })).toBe('');
    expect(cellText(1e21)).toBe('1000000000000000000000');
    expect(cellText(new Date(2026, 0, 2))).toBe('2/1/2026');
  });

  test('stored fields: person type inferred from company', () => {
    expect(toClientFields({ name: 'A', company: 'ACME' }).personType).toBe('sociedad');
    expect(toClientFields({ name: 'A' })).toMatchObject({ personType: 'persona', email: '', idType: '' });
    expect(toClientFields({ name: 'A', powers: 'x' })).toHaveProperty('powers', 'x');
  });
});

test.describe('files', () => {
  test('CSV: ; or , separators, quotes, BOM, CRLF', () => {
    expect(parseCsv('﻿Nombre;Email\r\n"Pérez; Ana";ana@x.es\r\n')).toEqual([['Nombre', 'Email'], ['Pérez; Ana', 'ana@x.es']]);
    expect(parseCsv('Nombre,Email\n"Dice ""hola""",a@b.es')).toEqual([['Nombre', 'Email'], ['Dice "hola"', 'a@b.es']]);
  });

  test('template round trip: download, fill in Excel, upload', async () => {
    const tpl = await buildTemplate();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await tpl.arrayBuffer());
    expect(wb.worksheets.map(w => w.name)).toEqual(['Clientes', 'Instrucciones']);
    const ws = wb.getWorksheet('Clientes')!;
    expect(ws.getCell('D2').dataValidation).toMatchObject({ type: 'list', formulae: ['"Persona,Sociedad"'] });
    ws.getRow(2).values = row({ name: 'Ana Pérez', email: 'ana@x.es', phone: '+34 600 000 000', idType: 'DNI', idNumber: '12345678Z' }) as ExcelJS.CellValue[];
    ws.getRow(3).values = row({ name: 'ACME', personType: 'Sociedad', company: 'ACME S.L.', companyTaxId: 'B12345674' }) as ExcelJS.CellValue[];
    const filled = new File([await wb.xlsx.writeBuffer()], 'clientes.xlsx');
    const { matrix, sheetName } = await readClientFile(filled);
    expect(sheetName).toBe('Clientes');
    const p = ok(parseClientRows(matrix, []));
    expect(p.rows.map(r => [r.values.name, r.status])).toEqual([['Ana Pérez', 'ok'], ['ACME', 'ok']]);
    expect(p.skippedEmpty).toBe(IMPORT_MAX_ROWS - 2);   // formatted empty rows of the template
  });

  test('rejects wrong files with a clear message', async () => {
    const f = (bytes: number[] | string, name: string) => new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name);
    await expect(readClientFile(f('', 'a.xlsx'))).rejects.toThrow('vacío');
    await expect(readClientFile(f('x', 'a.xls'))).rejects.toThrow('.xls');
    await expect(readClientFile(f('x', 'a.pdf'))).rejects.toThrow(ImportFileError);
    await expect(readClientFile(f([0xd0, 0xcf, 0x11, 0xe0], 'a.xlsx'))).rejects.toThrow('contraseña');
    await expect(readClientFile(f('hello', 'a.xlsx'))).rejects.toThrow('no es un Excel');
    await expect(readClientFile(f([0x50, 0x4b, 3, 4, 0, 0], 'a.xlsx'))).rejects.toThrow('No se pudo leer');
    await expect(readClientFile(f('x'.repeat(2 * 1024 * 1024 + 1), 'a.csv'))).rejects.toThrow('2 MB');
  });

  test('error report re-imports (Motivo column ignored) and keeps formulas as text', async () => {
    const p = ok(parseClientRows([H, row({ name: '=HYPERLINK("x")', email: 'bad@' })], []));
    const blob = await buildErrorReport(p.rows);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const c = wb.getWorksheet('Clientes')!.getCell('B2');
    expect(c.formula).toBeUndefined();
    const again = ok(parseClientRows((await readClientFile(new File([await blob.arrayBuffer()], 'r.xlsx'))).matrix, []));
    expect(again.header.unknown).toEqual(['Motivo']);
    expect(again.rows[0].errors.email).toBeTruthy();
  });
});

test.describe('Solicitar los datos (per client, from the Excel)', () => {
  const DOCS = [
    { id: 'nda_mfw' as const, label: 'NDA MOBIFORWORK' },
    { id: 'contrato_servicios_mfw' as const, label: 'Contrato de servicios MOBIFORWORK', personaOnly: true },
  ];
  const HR = ['Nombre', 'Email', 'Solicitar NDA MOBIFORWORK', 'Solicitar Contrato de servicios MOBIFORWORK', 'Tipo de cliente'];

  test('each row requests its own documents; Sí/No variants; email required; personaOnly warning', () => {
    const p = ok(parseClientRows([HR,
      ['Solo NDA', 'a@x.es', 'Sí', '', ''],
      ['Solo contrato', 'b@x.es', 'no', 'x', ''],
      ['Ambos', 'c@x.es', 'SI', 'si', ''],
      ['Ninguno', 'd@x.es', '', 'No', ''],
      ['Sin email', '', 'Sí', '', ''],
      ['Valor raro', 'e@x.es', 'quizás', '', ''],
      ['Sociedad', 'f@x.es', '', 'Sí', 'Sociedad'],
    ], [], DOCS));
    expect(p.header.requestCols.size).toBe(2);
    expect(p.rows.map(r => r.requestDocs)).toEqual([
      ['nda_mfw'], ['contrato_servicios_mfw'], ['nda_mfw', 'contrato_servicios_mfw'], [], ['nda_mfw'], [], ['contrato_servicios_mfw'],
    ]);
    expect(p.rows[4].errors.request).toContain('email');
    expect(p.rows[5].errors.request).toContain('quizás');
    expect(p.rows[6].warnings.request).toContain('personas físicas');
    expect(p.rows.map(canRequest)).toEqual([true, true, true, false, false, false, true]);
  });

  test('request columns of documents this account cannot request are ignored (reported as unknown)', () => {
    const p = ok(parseClientRows([['Nombre', 'Email', 'Solicitar NDA MOBIFORWORK'], ['A', 'a@x.es', 'Sí']], [], []));
    expect(p.header.unknown).toEqual(['Solicitar NDA MOBIFORWORK']);
    expect(p.rows[0].requestDocs).toEqual([]);
  });

  test('template has one Sí/No column per document after Email; round trip keeps the marks', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await buildTemplate(DOCS)).arrayBuffer());
    const ws = wb.getWorksheet('Clientes')!;
    expect(ws.getRow(1).values).toEqual(expect.arrayContaining(['Email', 'Solicitar NDA MOBIFORWORK', 'Solicitar Contrato de servicios MOBIFORWORK']));
    expect(ws.getCell('C1').value).toBe('Solicitar NDA MOBIFORWORK');
    expect(ws.getCell('C2').dataValidation).toMatchObject({ type: 'list', formulae: ['"Sí,No"'] });
    ws.getRow(2).values = ['Ana', 'ana@x.es', 'Sí', 'No'];
    ws.getRow(3).values = ['Luis', 'luis@x.es', '', 'Sí'];
    const { matrix } = await readClientFile(new File([await wb.xlsx.writeBuffer()], 'c.xlsx'));
    const p = ok(parseClientRows(matrix, [], DOCS));
    expect(p.rows.map(r => [r.values.name, r.requestDocs])).toEqual([['Ana', ['nda_mfw']], ['Luis', ['contrato_servicios_mfw']]]);
    // the error report keeps the marks, so a fixed file re-imports with them
    const bad = ok(parseClientRows([HR, ['', 'x@x.es', 'Sí', '', '']], [], DOCS));
    const again = ok(parseClientRows((await readClientFile(new File([await (await buildErrorReport(bad.rows, DOCS)).arrayBuffer()], 'r.xlsx'))).matrix, [], DOCS));
    expect(again.rows[0].requestDocs).toEqual(['nda_mfw']);
  });

  test('limits: 100 clients per import, same as requests', () => {
    expect(IMPORT_MAX_ROWS).toBe(100);
    expect(IMPORT_MAX_REQUESTS).toBe(IMPORT_MAX_ROWS);
  });

  test('mapLimit keeps order and never exceeds the limit', async () => {
    let inFlight = 0, peak = 0;
    const out = await mapLimit([5, 1, 4, 2, 3, 0], 3, async (n, i) => {
      inFlight++; peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, n * 3));
      inFlight--;
      return i * 10;
    });
    expect(out).toEqual([0, 10, 20, 30, 40, 50]);
    expect(peak).toBe(3);
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
});

test('export of selected clients re-imports in the template format', async () => {
  const { buildClientsExport } = await import('@/lib/clients/import-excel');
  const blob = await buildClientsExport([
    { name: 'Ana', email: 'ana@x.es', idType: 'DNI', idNumber: '12345678Z' },
    { name: 'ACME rep', company: 'ACME S.L.', phone: '=HYPERLINK("x")' },
  ]);
  const { matrix } = await readClientFile(new File([await blob.arrayBuffer()], 'c.xlsx'));
  const p = ok(parseClientRows(matrix, []));
  expect(p.rows.map(r => [r.values.name, r.values.personType, r.status])).toEqual([['Ana', 'Persona', 'ok'], ['ACME rep', 'Sociedad', 'ok']]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  expect(wb.getWorksheet('Clientes')!.getCell('C3').formula).toBeUndefined();
});
