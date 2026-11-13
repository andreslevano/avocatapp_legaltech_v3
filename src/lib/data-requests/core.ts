// "Solicitar datos al cliente" — validation, sanitising, request state and the mapping from the
// client's answers to ClientDoc and to the document tools. Pure and client-safe. Unit tested.

import {
  asksPersonType, docById, fieldsFor, labelFor,
  type DataRequestStatus, type DocId, type FieldKey, type PersonType,
} from './catalog';
import type { MfwReceptor } from '@/lib/org-templates/mobiforwork-nda';
import type { MfwServicesInput } from '@/lib/org-templates/mobiforwork-services';

export const REQUEST_TTL_DAYS = 14;

/** Max length per field (values end up inside legal documents). */
export const FIELD_MAX: Record<FieldKey, number> = {
  personType: 10, name: 120, email: 254, phone: 40, nationality: 60, idType: 20, idNumber: 30, address: 200,
  company: 160, companyTaxId: 20, companyAddress: 200, representativeCapacity: 100, powers: 300,
};

/** One line of plain text: no markdown control characters, no "____" (signature anchors), capped. */
export function cleanValue(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[*#>`\\|~[\]]/g, '')
    .replace(/_{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^-+\s*/, '')
    .slice(0, max)
    .trim();
}

// ── Spanish identifiers ─────────────────────────────────────────────

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const normId = (s: string) => s.toUpperCase().replace(/[\s.-]/g, '');

export function isValidDni(raw: string): boolean {
  const s = normId(raw);
  const m = /^(\d{8})([A-Z])$/.exec(s);
  return !!m && DNI_LETTERS[Number(m[1]) % 23] === m[2];
}

export function isValidNie(raw: string): boolean {
  const s = normId(raw);
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(s);
  if (!m) return false;
  const n = Number(`${'XYZ'.indexOf(m[1])}${m[2]}`);
  return DNI_LETTERS[n % 23] === m[3];
}

/** CIF / NIF of a Spanish company (letter + 7 digits + control digit or letter). */
export function isValidCif(raw: string): boolean {
  const s = normId(raw);
  const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(s);
  if (!m) return false;
  const digits = m[2].split('').map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    if (i % 2 === 1) sum += d;
    else { const x = d * 2; sum += Math.floor(x / 10) + (x % 10); }
  });
  const control = (10 - (sum % 10)) % 10;
  const letter = 'JABCDEFGHI'[control];
  const [first, , ctl] = [m[1], m[2], m[3]];
  if ('PQRSNW'.includes(first)) return ctl === letter;
  if ('ABEH'.includes(first)) return ctl === String(control);
  return ctl === String(control) || ctl === letter;
}

const looksSpanishPersonalId = (s: string) => /^\d{7,8}[A-Z]$|^[XYZ]\d{7}[A-Z]$/.test(normId(s));
const looksSpanishCompanyId = (s: string) => /^[A-W]\d{7}[0-9A-J]$/.test(normId(s));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (s: string) => s.length <= FIELD_MAX.email && EMAIL_RE.test(s);

// ── Submission ──────────────────────────────────────────────────────

export type Values = Partial<Record<FieldKey, string>>;

export interface SubmissionResult {
  ok: boolean;
  personType: PersonType;
  /** Fields that apply to this submission, in stable order. */
  fields: FieldKey[];
  values: Values;
  errors: Partial<Record<FieldKey, string>>;
  /** Non-blocking (e.g. a foreign ID we can't check). */
  warnings: Partial<Record<FieldKey, string>>;
}

/** Server-side (and in-form) validation of the client's answers for the requested documents. */
export function validateSubmission(documents: DocId[], input: Record<string, unknown>): SubmissionResult {
  const askType = asksPersonType(documents);
  const rawType = input.personType;
  const personType: PersonType = askType && rawType === 'sociedad' ? 'sociedad' : 'persona';
  const errors: SubmissionResult['errors'] = {};
  const warnings: SubmissionResult['warnings'] = {};
  if (askType && rawType !== 'persona' && rawType !== 'sociedad') errors.personType = 'Elige cómo firmas.';

  const fields = fieldsFor(documents, personType).filter(f => f !== 'personType' || askType);
  const values: Values = {};
  for (const f of fields) {
    if (f === 'personType') { values.personType = personType; continue; }
    const v = cleanValue(input[f], FIELD_MAX[f]);
    if (f === 'email') values.email = v.toLowerCase(); else values[f] = v;
    if (!v && !labelFor(f).optional) errors[f] = 'Este dato es obligatorio.';
  }

  if (values.email && !isValidEmail(values.email)) errors.email = 'Revisa el email.';

  if (values.idNumber && !errors.idNumber) {
    const t = (values.idType ?? '').toUpperCase();
    if (t === 'DNI' && !isValidDni(values.idNumber)) errors.idNumber = 'El DNI no es válido: 8 números y la letra (12345678Z).';
    else if (t === 'NIE' && !isValidNie(values.idNumber)) errors.idNumber = 'El NIE no es válido: X, Y o Z, 7 números y la letra (X1234567L).';
    else if (t !== 'DNI' && t !== 'NIE' && looksSpanishPersonalId(values.idNumber) && !isValidDni(values.idNumber) && !isValidNie(values.idNumber)) {
      warnings.idNumber = 'Parece un DNI o NIE español, pero la letra no coincide. Revísalo.';
    }
  }
  if (values.companyTaxId && !errors.companyTaxId) {
    const id = values.companyTaxId;
    if (looksSpanishCompanyId(id)) {
      if (!isValidCif(id)) errors.companyTaxId = 'El NIF de la sociedad no es válido (B12345678).';
    } else if (!isValidDni(id) && !isValidNie(id)) {
      warnings.companyTaxId = 'No parece un NIF español. Si la sociedad es extranjera, déjalo así.';
    }
  }
  return { ok: Object.keys(errors).length === 0, personType, fields, values, errors, warnings };
}

// ── Request state ───────────────────────────────────────────────────

export interface RequestStateInput { status: DataRequestStatus; expiresAt: string }

/** Stored status, with "caducada" once an open request is past its expiry. */
export function effectiveStatus(r: RequestStateInput, now: Date = new Date()): DataRequestStatus {
  if ((r.status === 'enviada' || r.status === 'abierta') && r.expiresAt <= now.toISOString()) return 'caducada';
  return r.status;
}

/** Whether the public link may be used (view or submit). */
export function linkUsable(r: RequestStateInput, now: Date = new Date()): boolean {
  const s = effectiveStatus(r, now);
  return s === 'enviada' || s === 'abierta';
}

export function expiryFrom(now: Date, days = REQUEST_TTL_DAYS): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

export const STATUS_LABEL: Record<DataRequestStatus, string> = {
  enviada: 'Datos pendientes',
  abierta: 'Datos pendientes',
  completada: 'Datos recibidos',
  caducada: 'Enlace caducado',
  revocada: 'Solicitud anulada',
};

// ── Mapping ─────────────────────────────────────────────────────────

/** The client fields a submission writes (ClientDoc names; legacy fields kept as they are). */
export interface ClientDataFields {
  name?: string; email?: string; phone?: string; nationality?: string; address?: string;
  idType?: string; idNumber?: string; personType?: PersonType;
  company?: string; companyTaxId?: string; companyAddress?: string; representativeCapacity?: string; powers?: string;
}

export function submissionToClient(r: Pick<SubmissionResult, 'personType' | 'values' | 'fields'>): ClientDataFields {
  const out: ClientDataFields = { personType: r.personType };
  for (const f of r.fields) {
    if (f === 'personType') continue;
    const v = r.values[f];
    if (v !== undefined) (out as Record<string, string>)[f] = v;
  }
  // A natural person has no company data: clear what an earlier answer may have left.
  if (r.personType === 'persona' && r.fields.includes('name')) {
    for (const f of ['company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers'] as const) out[f] = '';
  }
  return out;
}

/** Minimal shape read from a ClientDoc (all optional — older clients lack the new fields). */
export interface ClientLike extends ClientDataFields { name: string }

const documento = (c: ClientLike) => (c.idNumber ? `${c.idType || ''} ${c.idNumber}`.trim() : '');
const personTypeOf = (c: ClientLike): PersonType => c.personType ?? (c.company ? 'sociedad' : 'persona');

/** MOBIFORWORK NDA receptor (Opción A persona / Opción B sociedad). */
export function clientToMfwReceptor(c: ClientLike): MfwReceptor {
  const tipo = personTypeOf(c);
  return tipo === 'sociedad'
    ? {
        tipo, razonSocial: c.company || '', nif: c.companyTaxId || '', domicilio: c.companyAddress || c.address || '',
        nombre: c.name, documento: documento(c), cargo: c.representativeCapacity || '', facultades: c.powers || '', email: c.email || '',
      }
    : { tipo, nombre: c.name, domicilio: c.address || '', documento: documento(c), email: c.email || '' };
}

/** MOBIFORWORK services contract collaborator (persona física). */
export function clientToColaborador(c: ClientLike): MfwServicesInput['colaborador'] {
  return { nombre: c.name, nacionalidad: c.nationality || '', domicilio: c.address || '', documento: documento(c), email: c.email || '' };
}

/** Generic NDA party (tools/nda/page.tsx `Parte`). */
export function clientToNdaParte(c: ClientLike) {
  const company = personTypeOf(c) === 'sociedad';
  return {
    nombre: c.name, empresa: company ? c.company || '' : '', cargo: company ? c.representativeCapacity || '' : '',
    idType: c.idType || 'DNI', idNumber: c.idNumber || '',
    address: company ? c.companyAddress || c.address || '' : c.address || '', email: c.email || '',
  };
}

export const toolFor = (doc: DocId) => docById(doc).tool;
