import { test, expect } from '@playwright/test';

// Mirrors the post-filter logic in executeTool('buscar_documentos_propios')
// so that any future change to the filter must also update these tests.
function filterDocsByOwner(
  docs: { userId: string; name: string; caseId: string | null }[],
  uid: string,
  caseFilter?: string | null,
) {
  return docs
    .filter(d => d.userId === uid)
    .filter(d => !caseFilter || d.caseId === caseFilter);
}

const USER_A = 'uid-alice';
const USER_B = 'uid-bob';

// Simulates a cross-user findNearest result set (vector search returns all docs)
const mixedDocs = [
  { userId: USER_A, name: 'Contrato_A.pdf', caseId: 'case-1' },
  { userId: USER_B, name: 'Informe_B.pdf',  caseId: 'case-2' },
  { userId: USER_A, name: 'Demanda_A.pdf',  caseId: null },
  { userId: USER_B, name: 'Factura_B.pdf',  caseId: 'case-2' },
];

test.describe('RAG buscar_documentos_propios — user isolation', () => {
  test('User A only receives their own documents', () => {
    const results = filterDocsByOwner(mixedDocs, USER_A);
    expect(results).toHaveLength(2);
    expect(results.every(d => d.userId === USER_A)).toBe(true);
    expect(results.some(d => d.userId === USER_B)).toBe(false);
  });

  test('User B only receives their own documents', () => {
    const results = filterDocsByOwner(mixedDocs, USER_B);
    expect(results).toHaveLength(2);
    expect(results.every(d => d.userId === USER_B)).toBe(true);
    expect(results.some(d => d.userId === USER_A)).toBe(false);
  });

  test('User A cannot retrieve documents from a case owned by User B', () => {
    const results = filterDocsByOwner(mixedDocs, USER_A, 'case-2');
    expect(results).toHaveLength(0);
  });

  test('Case filter works correctly within owner scope', () => {
    const results = filterDocsByOwner(mixedDocs, USER_A, 'case-1');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Contrato_A.pdf');
  });

  test('Null case filter returns all owner docs', () => {
    const results = filterDocsByOwner(mixedDocs, USER_A, null);
    expect(results).toHaveLength(2);
  });

  test('Empty uid returns no documents (prevents accidental data leak)', () => {
    const results = filterDocsByOwner(mixedDocs, '');
    expect(results).toHaveLength(0);
  });

  test('Unknown uid returns no documents', () => {
    const results = filterDocsByOwner(mixedDocs, 'uid-unknown');
    expect(results).toHaveLength(0);
  });

  test('Filtered result set never contains other users data', () => {
    for (const uid of [USER_A, USER_B]) {
      const results = filterDocsByOwner(mixedDocs, uid);
      expect(results.every(d => d.userId === uid)).toBe(true);
    }
  });
});
