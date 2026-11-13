// "Solicitar datos al cliente": catalogue, tokens, validation, mapping and request state.
import { test, expect } from '@playwright/test';
import { availableDocs, documentsPhrase, fieldsFor, labelFor, type DocId } from '@/lib/data-requests/catalog';
import {
  cleanValue, clientToColaborador, clientToMfwReceptor, clientToNdaParte, effectiveStatus, expiryFrom, isValidCif,
  isValidDni, isValidNie, linkUsable, submissionToClient, validateSubmission, FIELD_MAX,
} from '@/lib/data-requests/core';
import { hashToken, isTokenShape, newToken } from '@/lib/data-requests/token';
import { clientRequestEmail, ownerCompletedEmail } from '@/lib/data-requests/emails';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { renderMfwServices } from '@/lib/org-templates/mobiforwork-services';

const BOTH: DocId[] = ['nda_mfw', 'contrato_servicios_mfw'];

test.describe('catalogue', () => {
  test('fieldsFor: NDA + contract union, de-duplicated, stable order', () => {
    expect(fieldsFor(BOTH, 'persona')).toEqual(['personType', 'name', 'email', 'nationality', 'idType', 'idNumber', 'address']);
    const all = fieldsFor(BOTH);
    expect(new Set(all).size).toBe(all.length);
    expect(fieldsFor(['contrato_servicios_mfw', 'nda_mfw'])).toEqual(all);
  });
  test('company fields only for sociedad', () => {
    const soc = fieldsFor(['nda_mfw'], 'sociedad');
    for (const f of ['company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers'] as const) expect(soc).toContain(f);
    const per = fieldsFor(['nda_mfw'], 'persona');
    for (const f of ['company', 'companyTaxId', 'companyAddress', 'representativeCapacity', 'powers'] as const) expect(per).not.toContain(f);
    expect(fieldsFor(['nda_generico'], 'sociedad')).toEqual(['personType', 'name', 'email', 'idType', 'idNumber', 'address', 'company', 'representativeCapacity']);
  });
  test('contract alone asks no persona/sociedad question', () => {
    expect(fieldsFor(['contrato_servicios_mfw'])).not.toContain('personType');
  });
  test('MOBIFORWORK documents only for that organisation', () => {
    expect(availableDocs({ email: 'a@mobilityforwork.es', emailVerified: true }).map(d => d.id)).toEqual(['nda_mfw', 'contrato_servicios_mfw']);
    expect(availableDocs({ email: 'a@otro.es', emailVerified: true }).map(d => d.id)).toEqual(['nda_generico']);
    expect(availableDocs({ email: 'a@mobilityforwork.es', emailVerified: false }).map(d => d.id)).toEqual(['nda_generico']);
  });
  test('labels and phrases in Spanish', () => {
    expect(labelFor('idType').help).toBe('DNI, NIE o pasaporte');
    expect(documentsPhrase(BOTH)).toBe('NDA MOBIFORWORK y Contrato de servicios MOBIFORWORK');
  });
});

test.describe('tokens', () => {
  test('32 random bytes, base64url; hash deterministic; raw token not in the stored hash', () => {
    const a = newToken(), b = newToken();
    expect(isTokenShape(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(hashToken(a.token)).toBe(a.tokenHash);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.tokenHash).not.toContain(a.token);
    const stored = { tokenHash: a.tokenHash, expiresAt: expiryFrom(new Date()), status: 'enviada' };
    expect(JSON.stringify(stored)).not.toContain(a.token);
    expect(isTokenShape('short')).toBe(false);
  });
  test('expires 14 days later', () => {
    expect(expiryFrom(new Date('2026-11-13T10:00:00.000Z'))).toBe('2026-11-27T10:00:00.000Z');
  });
});

test.describe('Spanish identifiers', () => {
  test('DNI, NIE, CIF', () => {
    expect(isValidDni('12345678Z')).toBe(true);
    expect(isValidDni('12.345.678-z')).toBe(true);
    expect(isValidDni('12345678A')).toBe(false);
    expect(isValidNie('X1234567L')).toBe(true);
    expect(isValidNie('X1234567A')).toBe(false);
    expect(isValidCif('B22430706')).toBe(true);      // MOBIFORWORK S.L.
    expect(isValidCif('B22430707')).toBe(false);
    expect(isValidCif('Q2826000H')).toBe(true);      // letter control
  });
});

const persona = {
  personType: 'persona', name: ' Geovany  Manco ', email: 'GEO@Example.com', nationality: 'colombiana',
  idType: 'DNI', idNumber: '12345678Z', address: 'Calle Mayor 1, 22300 Barbastro',
};

test.describe('validateSubmission', () => {
  test('valid persona for NDA + contract', () => {
    const r = validateSubmission(BOTH, persona);
    expect(r.ok).toBe(true);
    expect(r.values).toMatchObject({ name: 'Geovany Manco', email: 'geo@example.com', idNumber: '12345678Z' });
  });
  test('missing required field and bad email', () => {
    const r = validateSubmission(BOTH, { ...persona, nationality: '  ', email: 'no-es-email' });
    expect(r.ok).toBe(false);
    expect(r.errors.nationality).toBe('Este dato es obligatorio.');
    expect(r.errors.email).toBe('Revisa el email.');
  });
  test('person type must be chosen when asked', () => {
    expect(validateSubmission(['nda_mfw'], { ...persona, personType: undefined }).errors.personType).toBeTruthy();
    expect(validateSubmission(['contrato_servicios_mfw'], { ...persona, personType: undefined }).ok).toBe(true);
  });
  test('DNI / NIE block; foreign IDs only warn', () => {
    expect(validateSubmission(BOTH, { ...persona, idNumber: '12345678A' }).errors.idNumber).toContain('DNI no es válido');
    expect(validateSubmission(BOTH, { ...persona, idType: 'NIE', idNumber: 'X1234567A' }).errors.idNumber).toContain('NIE no es válido');
    const pass = validateSubmission(BOTH, { ...persona, idType: 'Pasaporte', idNumber: 'AB123456' });
    expect(pass.ok).toBe(true);
    const odd = validateSubmission(BOTH, { ...persona, idType: 'Otro', idNumber: '12345678A' });
    expect(odd.ok).toBe(true);
    expect(odd.warnings.idNumber).toBeTruthy();
  });
  test('sociedad: CIF checked, foreign tax ID warns', () => {
    const soc = { ...persona, personType: 'sociedad', company: 'Acme S.L.', companyTaxId: 'B22430706', companyAddress: 'Av. del Cinca 6', representativeCapacity: 'Administrador único', powers: 'Cargo inscrito en el Registro Mercantil' };
    expect(validateSubmission(['nda_mfw'], soc).ok).toBe(true);
    expect(validateSubmission(['nda_mfw'], { ...soc, companyTaxId: 'B22430707' }).errors.companyTaxId).toContain('no es válido');
    const foreign = validateSubmission(['nda_mfw'], { ...soc, companyTaxId: '900.123.456-7' });
    expect(foreign.ok).toBe(true);
    expect(foreign.warnings.companyTaxId).toBeTruthy();
    expect(validateSubmission(['nda_mfw'], { ...soc, powers: '' }).errors.powers).toBeTruthy();
  });
  test('markdown stripped, lengths capped', () => {
    expect(cleanValue('**Acme** # S.L. > `x` [y] \\ Firma: ______', 200)).toBe('Acme S.L. x y Firma:');
    expect(cleanValue('- guion', 50)).toBe('guion');
    const r = validateSubmission(BOTH, { ...persona, address: 'x'.repeat(500), name: '## **Geo**' });
    expect(r.values.address!.length).toBe(FIELD_MAX.address);
    expect(r.values.name).toBe('Geo');
    expect(cleanValue(42, 10)).toBe('');
  });
});

test.describe('mapping', () => {
  test('submission → ClientDoc; persona clears company data', () => {
    const r = validateSubmission(BOTH, persona);
    expect(submissionToClient(r)).toMatchObject({
      personType: 'persona', name: 'Geovany Manco', email: 'geo@example.com', nationality: 'colombiana',
      idType: 'DNI', idNumber: '12345678Z', address: 'Calle Mayor 1, 22300 Barbastro', company: '', companyTaxId: '',
    });
  });
  test('ClientDoc → MfwReceptor (persona and sociedad) and the NDA renders the values', () => {
    const p = clientToMfwReceptor({ name: 'Geovany Manco', email: 'geo@example.com', idType: 'DNI', idNumber: '12345678Z', address: 'Calle Mayor 1', personType: 'persona' });
    expect(p).toEqual({ tipo: 'persona', nombre: 'Geovany Manco', domicilio: 'Calle Mayor 1', documento: 'DNI 12345678Z', email: 'geo@example.com' });
    const s = clientToMfwReceptor({
      name: 'Ana Ruiz', email: 'ana@acme.es', idType: 'NIE', idNumber: 'X1234567L', personType: 'sociedad',
      company: 'Acme S.L.', companyTaxId: 'B22430706', companyAddress: 'Av. del Cinca 6', representativeCapacity: 'Administradora', powers: 'Escritura de 2024',
    });
    expect(s).toMatchObject({ tipo: 'sociedad', razonSocial: 'Acme S.L.', nif: 'B22430706', domicilio: 'Av. del Cinca 6', cargo: 'Administradora', facultades: 'Escritura de 2024', documento: 'NIE X1234567L' });
    expect(renderMfwNda({ receptor: s, productos: 'Software' })).toContain('**Acme S.L.**, con domicilio social en **Av. del Cinca 6**, con número de identificación fiscal **B22430706**');
  });
  test('ClientDoc → contract collaborator', () => {
    const c = clientToColaborador({ name: 'Geovany Manco', nationality: 'colombiana', address: 'Calle Mayor 1', idType: 'DNI', idNumber: '12345678Z', email: 'geo@example.com' });
    expect(c).toEqual({ nombre: 'Geovany Manco', nacionalidad: 'colombiana', domicilio: 'Calle Mayor 1', documento: 'DNI 12345678Z', email: 'geo@example.com' });
    expect(renderMfwServices({ fechaContrato: '2026-11-13', colaborador: c, inicioPool: '2026-11-13' })).toContain('Y, de otra parte, **Geovany Manco**, de nacionalidad **colombiana**');
  });
  test('older clients without personType: company decides', () => {
    expect(clientToMfwReceptor({ name: 'X', company: 'Old S.A.' }).tipo).toBe('sociedad');
    expect(clientToNdaParte({ name: 'X', company: 'Old S.A.', personType: 'persona' }).empresa).toBe('');
  });
});

test.describe('request state', () => {
  const now = new Date('2026-11-13T12:00:00.000Z');
  const future = '2026-11-27T12:00:00.000Z', past = '2026-11-01T12:00:00.000Z';
  test('open and in date → usable', () => {
    expect(linkUsable({ status: 'enviada', expiresAt: future }, now)).toBe(true);
    expect(linkUsable({ status: 'abierta', expiresAt: future }, now)).toBe(true);
  });
  test('expired, revoked or completed → not usable (submission rejected)', () => {
    expect(effectiveStatus({ status: 'abierta', expiresAt: past }, now)).toBe('caducada');
    expect(linkUsable({ status: 'abierta', expiresAt: past }, now)).toBe(false);
    expect(linkUsable({ status: 'revocada', expiresAt: future }, now)).toBe(false);
    expect(linkUsable({ status: 'completada', expiresAt: future }, now)).toBe(false);
    expect(effectiveStatus({ status: 'completada', expiresAt: past }, now)).toBe('completada');
  });
});

test.describe('emails', () => {
  test('client email: subject, button, expiry, privacy; no raw HTML injection', () => {
    const m = clientRequestEmail({ ownerName: 'Félix <b>', clientName: 'Geo', documents: 'NDA MOBIFORWORK', link: 'https://avocatapp.com/solicitud/abc', expiresAt: '2026-11-27T12:00:00.000Z' });
    expect(m.subject).toBe('Félix <b> te pide unos datos para preparar NDA MOBIFORWORK');
    expect(m.text).toContain('Completar mis datos: https://avocatapp.com/solicitud/abc');
    expect(m.text).toContain('caduca el 27 nov 2026');
    expect(m.html).toContain('Félix &lt;b&gt;');
    expect(m.html).toContain('>Completar mis datos</a>');
  });
  test('owner email', () => {
    const m = ownerCompletedEmail({ clientName: 'Geo', documents: 'NDA', link: 'https://avocatapp.com/clients' });
    expect(m.subject).toBe('Geo ha completado sus datos');
    expect(m.text).toContain('https://avocatapp.com/clients');
  });
});
