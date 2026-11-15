'use client';

// Excel side of "Importar clientes": template, file reading (.xlsx / .csv) and the error report.
// ExcelJS is loaded on demand (only when the user opens the import). We don't use the repo's
// `xlsx` 0.18.5 here: it has known advisories when parsing untrusted files (prototype pollution,
// ReDoS) and the fixed releases aren't published on npm.

import { primitives } from '@/lib/tokens';
import type { RequestableDoc } from '@/lib/data-requests/catalog';
import {
  fieldLabel, IMPORT_COLUMNS, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, requestHeader, TEMPLATE_SHEET, TEMPLATE_VERSION, YES_NO,
  type ImportField, type ImportRow,
} from './import';

/** Sheet columns: client fields with one "Solicitar <documento>" (Sí/No) column per requestable document after Email. */
interface SheetColumn { key: string; header: string; width: number; hint: string; required?: boolean; list?: readonly string[]; request?: boolean }

function sheetColumns(docs: readonly Pick<RequestableDoc, 'id' | 'label' | 'personaOnly'>[]): SheetColumn[] {
  const fields: SheetColumn[] = IMPORT_COLUMNS.map(c => ({ key: c.field, header: c.header, width: c.width, hint: c.hint, required: c.required, list: c.list }));
  const requests: SheetColumn[] = docs.map(d => ({
    key: `request:${d.id}`, header: requestHeader(d), width: Math.max(16, requestHeader(d).length + 2), list: YES_NO, request: true,
    hint: `Sí: enviaremos al cliente un enlace para completar los datos del ${d.label}${d.personaOnly ? ' (como persona física)' : ''}. Hace falta su email. Vacío o No: no se solicita.`,
  }));
  const at = fields.findIndex(c => c.key === 'email') + 1;
  return [...fields.slice(0, at), ...requests, ...fields.slice(at)];
}

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** Rows read from a sheet: a header/title area plus the import limit, with margin to detect "too many". */
const READ_LIMIT = IMPORT_MAX_ROWS + 50;

async function excel() {
  const mod = await import('exceljs');
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

// ── Template ─────────────────────────────────────────────────────

export async function buildTemplate(docs: readonly Pick<RequestableDoc, 'id' | 'label' | 'personaOnly'>[] = []): Promise<Blob> {
  const cols = sheetColumns(docs);
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Avocat';
  wb.title = 'Plantilla de importación de clientes';
  wb.subject = TEMPLATE_VERSION;

  const ws = wb.addWorksheet(TEMPLATE_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width, style: { numFmt: '@' } }));
  const head = ws.getRow(1);
  head.height = 22;
  head.eachCell((cell, col) => {
    const c = cols[col - 1];
    cell.font = { bold: true, color: { argb: argb(primitives['neutral-0']) } };
    const fill = c.required ? primitives['gold-700'] : c.request ? primitives['gold-900'] : primitives['neutral-800'];
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fill) } };
    cell.alignment = { vertical: 'middle' };
    cell.note = c.hint;
  });
  // Text format for every data cell (phones and IDs keep leading zeros / "+"), dropdowns for lists.
  cols.forEach((c, i) => {
    const letter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= IMPORT_MAX_ROWS + 1; r++) {
      const cell = ws.getCell(`${letter}${r}`);
      cell.numFmt = '@';
      if (c.list) {
        cell.dataValidation = {
          type: 'list', allowBlank: true, formulae: [`"${c.list.join(',')}"`],
          showErrorMessage: true, errorStyle: 'warning', errorTitle: c.header, error: c.hint,
        };
      }
    }
  });

  const help = wb.addWorksheet('Instrucciones');
  help.getColumn(1).width = 30;
  help.getColumn(2).width = 90;
  const lines: [string, string][] = [
    ['Cómo usar esta plantilla', ''],
    ['1.', `Rellena la hoja "${TEMPLATE_SHEET}": una fila por cliente, desde la fila 2.`],
    ['2.', 'Solo "Nombre" es obligatorio. Deja vacías las columnas que no necesites; puedes borrarlas o cambiarlas de orden.'],
    ...(docs.length ? [['', 'Para pedir al cliente que complete sus datos, rellena su Email y marca "Sí" en las columnas "Solicitar …" de los documentos que vas a preparar (uno, varios o ninguno por cliente). Le enviaremos un enlace que caduca en 14 días.'] as [string, string]] : []),
    ['3.', `Máximo ${IMPORT_MAX_ROWS} clientes por archivo y 2 MB. Si tienes más, usa varios archivos.`],
    ['4.', 'Sube el archivo en Clientes → Importar desde Excel. Verás una revisión antes de crear nada.'],
    ['5.', 'Los clientes que ya tienes (mismo email o mismo documento) se marcan como posibles duplicados y no se importan salvo que lo indiques.'],
    ['', ''],
    ['Columna', 'Qué poner'],
    ...cols.map(c => [c.header, c.hint] as [string, string]),
    ['', ''],
    ['Ejemplo', ''],
  ];
  lines.forEach(l => help.addRow(l));
  help.getRow(1).font = { bold: true, size: 14 };
  help.getRow(docs.length ? 9 : 8).font = { bold: true };
  const exHead = help.addRow(cols.map(c => c.header.replace(' *', '')));
  exHead.font = { bold: true };
  help.addRow(cols.map(c => c.request ? 'Sí' : IMPORT_COLUMNS.find(x => x.field === c.key)?.example ?? ''));
  help.addRow(['Ejemplo de sociedad: Tipo de cliente "Sociedad", Empresa "ACME S.L.", NIF de la empresa "B12345678" y, en Nombre, la persona que firma.']);
  help.addRow([`Versión de la plantilla: ${TEMPLATE_VERSION}`]);

  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: XLSX_MIME });
}

// ── Reading ──────────────────────────────────────────────────────

export class ImportFileError extends Error {}

/** CSV (Excel "CSV UTF-8" or legacy Windows-1252, ";" or "," separated) → matrix. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
      if (rows.length > READ_LIMIT) return rows;
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function decodeText(buf: ArrayBuffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

/** The file the user picked → matrix of cell values of the clients sheet. */
export async function readClientFile(file: File): Promise<{ matrix: unknown[][]; sheetName: string }> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (file.size === 0) throw new ImportFileError('El archivo está vacío.');
  if (file.size > IMPORT_MAX_BYTES) throw new ImportFileError('El archivo pesa más de 2 MB. Divídelo en varios.');
  if (ext === 'xls') throw new ImportFileError('Es un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como .xlsx.');
  if (ext === 'numbers' || ext === 'ods') throw new ImportFileError('Exporta el archivo a Excel (.xlsx) o CSV y súbelo de nuevo.');
  const buf = await file.arrayBuffer();

  if (ext === 'csv' || ext === 'txt') return { matrix: parseCsv(decodeText(buf)), sheetName: 'CSV' };
  if (ext !== 'xlsx' && ext !== 'xlsm') throw new ImportFileError('Formato no admitido. Sube la plantilla en .xlsx (o un .csv).');

  const sig = new Uint8Array(buf.slice(0, 4));
  if (sig[0] !== 0x50 || sig[1] !== 0x4b) {
    // OLE header (D0 CF 11 E0): password-protected .xlsx or an .xls renamed.
    throw new ImportFileError(sig[0] === 0xd0 && sig[1] === 0xcf
      ? 'El archivo está protegido con contraseña o es un .xls antiguo. Quita la contraseña y guárdalo como .xlsx.'
      : 'El archivo no es un Excel válido.');
  }

  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    throw new ImportFileError('No se pudo leer el Excel. Ábrelo y guárdalo de nuevo como .xlsx.');
  }
  const visible = wb.worksheets.filter(w => w.state === 'visible' || !w.state);
  const ws = visible.find(w => w.name.trim().toLowerCase() === TEMPLATE_SHEET.toLowerCase())
    ?? visible.find(w => w.name.trim().toLowerCase() !== 'instrucciones' && w.actualRowCount > 0)
    ?? visible[0];
  if (!ws) throw new ImportFileError('El Excel no tiene hojas con datos.');

  const matrix: unknown[][] = [];
  const last = Math.min(ws.rowCount, READ_LIMIT);
  for (let r = 1; r <= last; r++) {
    const values = ws.getRow(r).values as unknown[];          // 1-based, index 0 unused
    matrix.push(Array.isArray(values) ? values.slice(1) : []);
  }
  return { matrix, sheetName: ws.name };
}

// ── Error report ─────────────────────────────────────────────────

const describe = (r: ImportRow) => [
  ...Object.entries(r.errors).map(([f, m]) => `${fieldLabel(f as ImportField)}: ${m}`),
  ...(r.status === 'duplicate' ? [`Posible duplicado de ${r.duplicateOf}`] : []),
].join(' · ');

/** The rows that weren't imported, in template form + a "Motivo" column (ignored on re-import). */
export async function buildErrorReport(
  rows: ImportRow[], docs: readonly Pick<RequestableDoc, 'id' | 'label' | 'personaOnly'>[] = [],
): Promise<Blob> {
  const cols = sheetColumns(docs);
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(TEMPLATE_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Motivo', key: 'reason', width: 50 },
    ...cols.map(c => ({ header: c.header, key: c.key, width: c.width, style: { numFmt: '@' } })),
  ];
  ws.getRow(1).font = { bold: true };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(primitives['gold-100']) } };
  for (const r of rows) {
    // Plain strings only: a value like "=HYPERLINK(…)" stays text (no formula injection).
    const marks = Object.fromEntries(docs.map(d => [`request:${d.id}`, r.requestDocs.includes(d.id) ? 'Sí' : '']));
    ws.addRow({ reason: `Fila ${r.rowNumber}: ${describe(r)}`, ...r.values, ...marks });
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: XLSX_MIME });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
