// "Solicitar datos al cliente" — which documents can be requested and which counterparty fields each
// one needs. Pure and client-safe (used by the clients page, the public form and the server). Unit tested.

import { orgNdaTemplateFor } from '@/lib/org-templates';

export type FieldKey = 'personType' | 'name' | 'email' | 'nationality' | 'address' | 'idType' | 'idNumber'
  | 'company' | 'companyTaxId' | 'companyAddress' | 'representativeCapacity' | 'powers' | 'phone';
export type DocId = 'nda_mfw' | 'contrato_servicios_mfw' | 'nda_generico';
export type PersonType = 'persona' | 'sociedad';
export type DataRequestStatus = 'enviada' | 'abierta' | 'completada' | 'caducada' | 'revocada';

export interface RequestableDoc {
  id: DocId;
  label: string;
  /** Tool that prepares it; the clients page links here with ?clientId=…&requestId=… */
  tool: string;
  fields: FieldKey[];
  orgOnly?: 'mobilityforwork';
  /** Signs only as a natural person (no persona/sociedad question for this document alone). */
  personaOnly?: boolean;
}

/** Fields that only apply when the counterparty signs on behalf of a company. */
export const COMPANY_FIELDS: readonly FieldKey[] = ['company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers'];

/** Stable order for forms and the stored request. */
export const FIELD_ORDER: readonly FieldKey[] = [
  'personType', 'name', 'email', 'phone', 'nationality', 'idType', 'idNumber', 'address',
  'company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers',
];

export const REQUESTABLE_DOCS: readonly RequestableDoc[] = [
  {
    // MfwReceptor (org-templates/mobiforwork-nda.ts): persona → nombre, domicilio, documento, email;
    // sociedad → razonSocial, domicilio social, nif, representative's nombre + documento, cargo, facultades, email.
    id: 'nda_mfw', label: 'NDA MOBIFORWORK', tool: '/tools/nda', orgOnly: 'mobilityforwork',
    fields: ['personType', 'name', 'email', 'address', 'idType', 'idNumber',
      'company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers'],
  },
  {
    // MfwServicesInput.colaborador (persona física).
    id: 'contrato_servicios_mfw', label: 'Contrato de servicios MOBIFORWORK', tool: '/tools/contrato-servicios',
    orgOnly: 'mobilityforwork', personaOnly: true,
    fields: ['name', 'nationality', 'address', 'idType', 'idNumber', 'email'],
  },
  {
    // Parte receptora of the generic NDA (tools/nda/page.tsx): nombre, empresa, cargo, idType, idNumber, address, email.
    id: 'nda_generico', label: 'NDA', tool: '/tools/nda',
    fields: ['personType', 'name', 'email', 'address', 'idType', 'idNumber', 'company', 'representativeCapacity'],
  },
];

export const docById = (id: DocId) => REQUESTABLE_DOCS.find(d => d.id === id)!;
export const isDocId = (x: unknown): x is DocId => typeof x === 'string' && REQUESTABLE_DOCS.some(d => d.id === x);

/**
 * Documents this user may request: MOBIFORWORK ones only for that organisation's users. Those users
 * always get the MOBIFORWORK template on /tools/nda, so the generic NDA isn't offered to them.
 */
export function availableDocs(user: Parameters<typeof orgNdaTemplateFor>[0]): RequestableDoc[] {
  const org = orgNdaTemplateFor(user);
  return REQUESTABLE_DOCS.filter(d => (d.orgOnly ? d.orgOnly === org : !(org && d.id === 'nda_generico')));
}

/** The DocId a tool page prepares for this user. */
export function ndaDocFor(user: Parameters<typeof orgNdaTemplateFor>[0]): DocId {
  return orgNdaTemplateFor(user) === 'mobilityforwork' ? 'nda_mfw' : 'nda_generico';
}

/** True when some requested document lets the counterparty sign for a company. */
export function asksPersonType(docIds: DocId[]): boolean {
  return docIds.some(id => docById(id).fields.includes('personType'));
}

/**
 * Union of the fields the documents need, de-duplicated, in FIELD_ORDER. Company fields only for
 * `sociedad`; `personType` only when a document asks it. Pass `personType` undefined to get every field
 * that could be asked (the stored request).
 */
export function fieldsFor(docIds: DocId[], personType?: PersonType): FieldKey[] {
  const wanted = new Set<FieldKey>();
  for (const id of docIds) for (const f of docById(id).fields) wanted.add(f);
  return FIELD_ORDER.filter(f => wanted.has(f) && (personType === undefined || personType === 'sociedad' || !COMPANY_FIELDS.includes(f)));
}

export interface FieldLabel { label: string; help?: string; placeholder?: string; optional?: boolean }

const LABELS: Record<FieldKey, FieldLabel> = {
  personType: { label: '¿Firmas como persona física o en nombre de una sociedad?' },
  name: { label: 'Nombre y apellidos', help: 'Si firmas por una sociedad, el nombre de quien la representa.' },
  email: { label: 'Email', help: 'Lo usaremos para enviarte los documentos a firmar.' },
  phone: { label: 'Teléfono', optional: true },
  nationality: { label: 'Nacionalidad', placeholder: 'Por ejemplo, española' },
  idType: { label: 'Tipo de documento', help: 'DNI, NIE o pasaporte' },
  idNumber: { label: 'Número de documento', placeholder: '12345678Z' },
  address: { label: 'Domicilio', placeholder: 'Calle, número, código postal, ciudad' },
  company: { label: 'Razón social', placeholder: 'Empresa S.L.' },
  companyTaxId: { label: 'NIF de la sociedad', placeholder: 'B12345678' },
  companyAddress: { label: 'Domicilio social', placeholder: 'Calle, número, código postal, ciudad' },
  representativeCapacity: { label: 'Cargo', placeholder: 'Administrador único, apoderado…' },
  powers: { label: 'Facultades', help: 'Escritura de poder o cargo inscrito que te permite firmar por la sociedad.' },
};

export const labelFor = (field: FieldKey): FieldLabel => LABELS[field];

export const ID_TYPES = ['DNI', 'NIE', 'Pasaporte', 'Otro'] as const;

/** "NDA MOBIFORWORK y Contrato de servicios MOBIFORWORK" */
export function documentsPhrase(docIds: DocId[]): string {
  const labels = docIds.map(id => docById(id).label);
  return labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}
