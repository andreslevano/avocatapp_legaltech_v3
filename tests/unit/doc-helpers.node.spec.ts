import { test, expect } from '@playwright/test';
import { inferDocType, inferOrigin } from '@/components/documents/helpers';

test.describe('inferDocType — NDA detection', () => {
  const ndas = [
    'NDA_MAD_Cloud_Consulting_SL_Nike.doc',   // underscore-separated (the reported bug)
    'nda.pdf',
    'NDA.pdf',
    'Acme-NDA-2026.docx',
    'Acme NDA firmado.pdf',
    'acme.nda.v2.pdf',
    '2026_nda',
    '(NDA) Proveedor.pdf',
    'Acuerdo de confidencialidad Acme.pdf',
    'Confidencial_Proyecto.docx',
  ];
  for (const name of ndas) {
    test(`"${name}" → NDA`, () => expect(inferDocType(name)).toBe('NDA'));
  }

  const notNdas: [string, string][] = [
    ['Agenda_reunion.pdf', 'Otro'],          // "nda" inside a word
    ['Fundamentos.pdf', 'Otro'],
    ['Mandato_Garcia.pdf', 'Mandato'],
    ['Demanda_Civil.doc', 'Demanda'],        // "demanda" contains "nda"
    ['ndas_lista.xlsx', 'Otro'],
    ['xnda.pdf', 'Otro'],
    ['nda2.pdf', 'Otro'],                    // digits are not separators
  ];
  for (const [name, expected] of notNdas) {
    test(`"${name}" → ${expected}`, () => expect(inferDocType(name)).toBe(expected));
  }

  test('other types are unchanged', () => {
    expect(inferDocType('Contrato_arrendamiento.pdf')).toBe('Contrato');
    expect(inferDocType('Recurso_apelacion.pdf')).toBe('Recurso');
    expect(inferDocType('Análisis_caso.pdf')).toBe('Análisis');
    expect(inferDocType('Reclamacion_cantidad.pdf')).toBe('Reclamación');
    expect(inferDocType('Extraccion_datos.xlsx')).toBe('Extracción');
  });
});

test.describe('inferOrigin', () => {
  test('generated → Avocat, uploaded/missing → Subido', () => {
    expect(inferOrigin({ source: 'generated' })).toBe('Avocat');
    expect(inferOrigin({ source: 'uploaded' })).toBe('Subido');
    expect(inferOrigin({})).toBe('Subido');
  });
  test('Microsoft imports use the externalRef provider', () => {
    expect(inferOrigin({ source: 'microsoft', externalRef: { provider: 'sharepoint' } })).toBe('SharePoint');
    expect(inferOrigin({ source: 'microsoft', externalRef: { provider: 'onedrive' } })).toBe('OneDrive');
  });
});
