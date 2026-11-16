import { test, expect } from '@playwright/test';
import { bulkLabel, planBulk, type BulkClient } from '@/lib/clients/bulk';

const c = (o: Partial<BulkClient>): BulkClient => ({ id: o.name ?? 'x', name: 'x', status: 'active', requestStatus: null, cases: 0, ...o });
const A = c({ name: 'A', email: 'a@x.es' });
const B = c({ name: 'B' });                                                     // no email
const C = c({ name: 'C', email: 'c@x.es', requestStatus: 'enviada', requestId: 'r1' });
const D = c({ name: 'D', email: 'd@x.es', requestStatus: 'completada', requestId: 'r2', cases: 2, status: 'inactive' });
const E = c({ name: 'E', email: 'e@x.es', requestStatus: 'caducada', requestId: 'r3' });
const ids = (p: ReturnType<typeof planBulk>) => p.targets.map(t => t.name);

test('each action applies only where it makes sense, and says why it skips', () => {
  expect(ids(planBulk('request', [A, B, C, D, E]))).toEqual(['A', 'C', 'E']);
  expect(planBulk('request', [B, D]).skipped.map(s => s.reason)).toEqual(['Sin email válido', 'Ya envió sus datos']);
  expect(ids(planBulk('resend', [A, C, D, E]))).toEqual(['C', 'E']);
  expect(ids(planBulk('revoke', [A, C, D, E]))).toEqual(['C']);
  expect(ids(planBulk('activate', [A, D]))).toEqual(['D']);
  expect(ids(planBulk('deactivate', [A, D]))).toEqual(['A']);
  expect(ids(planBulk('delete', [A, D]))).toEqual(['A']);
  expect(planBulk('delete', [D]).skipped[0].reason).toBe('Tiene 2 casos');
  expect(ids(planBulk('export', [A, B, D]))).toEqual(['A', 'B', 'D']);
});

test('requests capped at 100 per send', () => {
  const many = Array.from({ length: 105 }, (_, i) => c({ name: `n${i}`, email: `n${i}@x.es` }));
  const p = planBulk('request', many);
  expect(p.targets).toHaveLength(100);
  expect(p.skipped).toHaveLength(5);
});

test('labels', () => {
  expect(bulkLabel('request', 1)).toBe('Solicitar datos a 1 cliente');
  expect(bulkLabel('revoke', 3)).toBe('Anular 3 solicitudes');
  expect(bulkLabel('delete', 2)).toBe('Eliminar 2 clientes');
});
