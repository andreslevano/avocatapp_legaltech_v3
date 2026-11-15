// Clientes → "Importar desde Excel": template columns, header matching, per-row validation and
// duplicate detection. Pure and client-safe (no Excel library here — see ./import-excel.ts).
// Values end up inside legal documents, so they go through the same cleanValue/FIELD_MAX as
// "Solicitar datos al cliente" (src/lib/data-requests/core.ts).

import { cleanValue, FIELD_MAX, isValidCif, isValidDni, isValidEmail, isValidNie } from '@/lib/data-requests/core';

export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const TEMPLATE_SHEET = 'Clientes';
export const TEMPLATE_VERSION = 'avocat-clientes-v1';

/** Same options as the manual form, plus NIE (validated like DNI). */
export const ID_TYPES = ['DNI', 'NIE', 'NIF', 'Pasaporte', 'RUT', 'Cédula', 'CUIT', 'Otro'] as const;
export const PERSON_TYPES = ['Persona', 'Sociedad'] as const;

export type ImportField =
  | 'name' | 'email' | 'phone' | 'personType' | 'nationality' | 'idType' | 'idNumber' | 'address'
  | 'company' | 'companyTaxId' | 'companyAddress' | 'representativeCapacity' | 'powers';

export interface ImportColumn {
  field: ImportField;
  header: string;
  required?: boolean;
  /** Other header spellings accepted (older templates, files made by hand). */
  aliases: string[];
  hint: string;
  example: string;
  width: number;
  /** Excel list validation in the template. */
  list?: readonly string[];
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: 'name', header: 'Nombre *', required: true, aliases: ['nombre', 'nombre y apellidos', 'cliente', 'nombre completo', 'name'], hint: 'Nombre y apellidos de la persona (o del representante si es una sociedad). Obligatorio.', example: 'Ana Pérez García', width: 28 },
  { field: 'email', header: 'Email', aliases: ['email', 'correo', 'correo electronico', 'e-mail', 'mail'], hint: 'Opcional. Se comprueba el formato.', example: 'ana@ejemplo.es', width: 28 },
  { field: 'phone', header: 'Teléfono', aliases: ['telefono', 'movil', 'tel', 'phone'], hint: 'Opcional. Escríbelo como texto (con prefijo si quieres: +34 600 000 000).', example: '+34 600 000 000', width: 18 },
  { field: 'personType', header: 'Tipo de cliente', aliases: ['tipo de cliente', 'tipo', 'persona o sociedad', 'tipo cliente'], hint: 'Persona o Sociedad. Si lo dejas vacío: Sociedad si rellenas Empresa, si no Persona.', example: 'Persona', width: 16, list: PERSON_TYPES },
  { field: 'nationality', header: 'Nacionalidad', aliases: ['nacionalidad'], hint: 'Opcional.', example: 'española', width: 16 },
  { field: 'idType', header: 'Tipo de documento', aliases: ['tipo de documento', 'tipo id', 'tipo documento', 'tipo de id'], hint: `Uno de: ${ID_TYPES.join(', ')}. Obligatorio si indicas número.`, example: 'DNI', width: 18, list: ID_TYPES },
  { field: 'idNumber', header: 'Número de documento', aliases: ['numero de documento', 'documento', 'numero id', 'dni', 'nif', 'numero documento'], hint: 'DNI y NIE se comprueban (letra de control).', example: '12345678Z', width: 20 },
  { field: 'address', header: 'Domicilio', aliases: ['domicilio', 'direccion', 'direccion completa'], hint: 'Opcional.', example: 'Calle Mayor 1, 28013 Madrid', width: 34 },
  { field: 'company', header: 'Empresa / razón social', aliases: ['empresa', 'razon social', 'empresa / razon social', 'sociedad'], hint: 'Solo si el cliente es una sociedad.', example: '', width: 28 },
  { field: 'companyTaxId', header: 'NIF de la empresa', aliases: ['nif de la empresa', 'cif', 'nif empresa', 'nif sociedad'], hint: 'Los NIF españoles de sociedad se comprueban (B12345678).', example: '', width: 18 },
  { field: 'companyAddress', header: 'Domicilio social', aliases: ['domicilio social'], hint: 'Solo para sociedades.', example: '', width: 34 },
  { field: 'representativeCapacity', header: 'Cargo / calidad', aliases: ['cargo / calidad', 'cargo', 'calidad', 'cargo / calidad en que actua'], hint: 'Ej.: Administrador único.', example: '', width: 22 },
  { field: 'powers', header: 'Poderes', aliases: ['poderes', 'escritura de poder'], hint: 'Escritura de poder o cargo inscrito.', example: '', width: 30 },
];

const COLUMN_MAX: Record<ImportField, number> = {
  name: FIELD_MAX.name, email: FIELD_MAX.email, phone: FIELD_MAX.phone, personType: 10, nationality: FIELD_MAX.nationality,
  idType: FIELD_MAX.idType, idNumber: FIELD_MAX.idNumber, address: FIELD_MAX.address, company: FIELD_MAX.company,
  companyTaxId: FIELD_MAX.companyTaxId, companyAddress: FIELD_MAX.companyAddress,
  representativeCapacity: FIELD_MAX.representativeCapacity, powers: FIELD_MAX.powers,
};

export const normHeader = (s: unknown) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const ALIAS = new Map<string, ImportField>();
for (const c of IMPORT_COLUMNS) for (const a of [c.header, ...c.aliases]) ALIAS.set(normHeader(a), c.field);

export interface HeaderMatch {
  /** Column index (0-based) → field. */
  map: Map<number, ImportField>;
  missingRequired: ImportField[];
  /** Headers we don't recognise (ignored). */
  unknown: string[];
  /** Fields that appear in more than one column (the first one is used). */
  repeated: ImportField[];
}

export function matchHeaders(headers: unknown[]): HeaderMatch {
  const map = new Map<number, ImportField>();
  const seen = new Set<ImportField>();
  const unknown: string[] = [];
  const repeated: ImportField[] = [];
  headers.forEach((h, i) => {
    const key = normHeader(h);
    if (!key) return;
    const f = ALIAS.get(key);
    if (!f) { unknown.push(String(h).trim()); return; }
    if (seen.has(f)) { repeated.push(f); return; }
    seen.add(f);
    map.set(i, f);
  });
  const missingRequired = IMPORT_COLUMNS.filter(c => c.required && !seen.has(c.field)).map(c => c.field);
  return { map, missingRequired, unknown, repeated };
}

/** Header row = first of the first 10 rows that contains a required header (files with a title row). */
export function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (matchHeaders(rows[i] ?? []).missingRequired.length === 0) return i;
  }
  return -1;
}

// ── Rows ─────────────────────────────────────────────────────────

export type ClientValues = Partial<Record<ImportField, string>>;

export type RowStatus = 'ok' | 'warning' | 'duplicate' | 'error';

export interface ImportRow {
  /** Spreadsheet row number (1-based, as Excel shows it). */
  rowNumber: number;
  values: ClientValues;
  status: RowStatus;
  errors: Partial<Record<ImportField | 'row', string>>;
  warnings: Partial<Record<ImportField | 'row', string>>;
  /** Existing client (or earlier row) this one duplicates. */
  duplicateOf?: string;
}

export interface ExistingClient { id: string; name: string; email?: string; idType?: string; idNumber?: string }

const pick = (list: readonly string[], v: string) => list.find(o => normHeader(o) === normHeader(v));
const idKey = (t: string | undefined, n: string | undefined) =>
  n ? `${normHeader(t)}|${n.toUpperCase().replace(/[\s.-]/g, '')}` : '';

/** Cell value from a spreadsheet library → string (numbers keep all digits, no "1e+21"). */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? BigInt(Math.round(v)).toString() : String(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (v instanceof Date) return v.toLocaleDateString('es-ES');
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[]; hyperlink?: string; error?: string };
    if (o.error) return '';                                  // #N/A, #REF!…
    if (Array.isArray(o.richText)) return o.richText.map(r => r.text).join('');
    if (o.result !== undefined) return cellText(o.result);   // formula → its value
    if (o.text !== undefined) return cellText(o.text);       // hyperlink cell
    if (o.hyperlink) return String(o.hyperlink).replace(/^mailto:/i, '');
  }
  return String(v);
}

function validateRow(rowNumber: number, raw: Partial<Record<ImportField, unknown>>): ImportRow {
  const values: ClientValues = {};
  const errors: ImportRow['errors'] = {};
  const warnings: ImportRow['warnings'] = {};

  for (const c of IMPORT_COLUMNS) {
    const text = cellText(raw[c.field]);
    const clean = cleanValue(text.replace(/[\r\n\t]+/g, ' '), 10_000);
    if (!clean) continue;
    const max = COLUMN_MAX[c.field];
    if (clean.length > max) warnings[c.field] = `Se recorta a ${max} caracteres.`;
    values[c.field] = clean.slice(0, max).trim();
  }

  if (!values.name) errors.name = 'Falta el nombre.';
  if (values.email) {
    values.email = values.email.toLowerCase();
    if (!isValidEmail(values.email)) errors.email = 'El email no es válido.';
  }
  if (values.personType) {
    const p = pick(PERSON_TYPES, values.personType);
    if (p) values.personType = p;
    else errors.personType = 'Usa "Persona" o "Sociedad".';
  }
  if (values.idType) {
    const t = pick(ID_TYPES, values.idType);
    if (t) values.idType = t;
    else errors.idType = `Tipo de documento no reconocido. Usa: ${ID_TYPES.join(', ')}.`;
  }
  if (values.idNumber) {
    if (!values.idType) errors.idType = 'Indica el tipo de documento.';
    else if (values.idType === 'DNI' && !isValidDni(values.idNumber)) errors.idNumber = 'DNI no válido: 8 números y la letra (12345678Z).';
    else if (values.idType === 'NIE' && !isValidNie(values.idNumber)) errors.idNumber = 'NIE no válido: X, Y o Z, 7 números y la letra (X1234567L).';
    if (values.idType === 'DNI' || values.idType === 'NIE') values.idNumber = values.idNumber.toUpperCase().replace(/[\s.-]/g, '');
  }
  if (values.companyTaxId && /^[A-W]\d{7}[0-9A-J]$/i.test(values.companyTaxId.replace(/[\s.-]/g, ''))
    && !isValidCif(values.companyTaxId)) errors.companyTaxId = 'NIF de sociedad no válido (B12345678).';

  const sociedad = values.personType === 'Sociedad' || (!values.personType && !!values.company);
  if (sociedad && !values.company) warnings.company = 'Es una sociedad pero falta la razón social.';
  if (values.personType === 'Persona' && (values.company || values.companyTaxId)) {
    warnings.personType = 'Marcado como Persona pero tiene datos de empresa: se guardarán igualmente.';
  }

  const status: RowStatus = Object.keys(errors).length ? 'error' : Object.keys(warnings).length ? 'warning' : 'ok';
  return { rowNumber, values, status, errors, warnings };
}

export interface ParsedImport {
  rows: ImportRow[];
  header: HeaderMatch;
  headerRow: number;        // 1-based
  skippedEmpty: number;
  tooMany: boolean;         // more than IMPORT_MAX_ROWS data rows: only the first ones are kept
}

/**
 * Sheet as a matrix of cell values (row 0 = first row) → validated rows. Duplicates: same email or
 * same document (type + number) as an existing client or an earlier row of the file.
 */
export function parseClientRows(matrix: unknown[][], existing: ExistingClient[]): ParsedImport | { error: string } {
  const h = findHeaderRow(matrix);
  if (h < 0) {
    return { error: 'No encontramos la columna "Nombre". Usa la plantilla de Avocat o añade una fila de encabezados con, al menos, "Nombre".' };
  }
  const header = matchHeaders(matrix[h]);
  const byEmail = new Map<string, string>();
  const byId = new Map<string, string>();
  for (const c of existing) {
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c.name);
    const k = idKey(c.idType, c.idNumber);
    if (k) byId.set(k, c.name);
  }

  const rows: ImportRow[] = [];
  let skippedEmpty = 0;
  let tooMany = false;
  for (let i = h + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const raw: Partial<Record<ImportField, unknown>> = {};
    header.map.forEach((field, col) => { raw[field] = cells[col]; });
    if (Object.values(raw).every(v => !cellText(v).trim())) { skippedEmpty++; continue; }
    if (rows.length >= IMPORT_MAX_ROWS) { tooMany = true; break; }

    const row = validateRow(i + 1, raw);
    if (row.status !== 'error') {
      const email = row.values.email;
      const k = idKey(row.values.idType, row.values.idNumber);
      const dup = (email && byEmail.get(email)) || (k && byId.get(k));
      if (dup) { row.status = 'duplicate'; row.duplicateOf = dup; }
      const self = `fila ${row.rowNumber} (${row.values.name})`;
      if (email && !byEmail.has(email)) byEmail.set(email, self);
      if (k && !byId.has(k)) byId.set(k, self);
    }
    rows.push(row);
  }
  return { rows, header, headerRow: h + 1, skippedEmpty, tooMany };
}

/** ClientValues → fields stored on clients/{id} (same shape as the manual form + data requests). */
export function toClientFields(v: ClientValues) {
  const sociedad = v.personType === 'Sociedad' || (!v.personType && !!v.company);
  return {
    name: v.name ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    company: v.company ?? '',
    idType: v.idType ?? '',
    idNumber: v.idNumber ?? '',
    address: v.address ?? '',
    representativeCapacity: v.representativeCapacity ?? '',
    personType: (sociedad ? 'sociedad' : 'persona') as 'persona' | 'sociedad',
    ...(v.nationality ? { nationality: v.nationality } : {}),
    ...(v.companyTaxId ? { companyTaxId: v.companyTaxId } : {}),
    ...(v.companyAddress ? { companyAddress: v.companyAddress } : {}),
    ...(v.powers ? { powers: v.powers } : {}),
  };
}

export const fieldLabel = (f: ImportField | 'row') =>
  f === 'row' ? 'Fila' : (IMPORT_COLUMNS.find(c => c.field === f)?.header.replace(' *', '') ?? f);
