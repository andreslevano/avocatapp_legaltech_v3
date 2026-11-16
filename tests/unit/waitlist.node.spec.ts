import { test, expect } from '@playwright/test';
import { parseWaitlist } from '@/lib/waitlist';

test('waitlist input validation', () => {
  expect(parseWaitlist({ email: ' Ana@X.es ', country: 'cl', plan: 'abogado' })).toEqual({ ok: true, entry: { email: 'ana@x.es', country: 'CL', plan: 'abogado' } });
  expect(parseWaitlist({ email: 'ana@x.es', country: 'PE' })).toMatchObject({ ok: true, entry: { plan: null } });
  expect(parseWaitlist({ email: 'ana@', country: 'CL' })).toMatchObject({ ok: false });
  expect(parseWaitlist({ email: 'ana@x.es', country: 'US' })).toMatchObject({ ok: false });
  expect(parseWaitlist({ email: 'ana@x.es', country: 'CL', plan: 'gold' })).toMatchObject({ ok: false });
  expect(parseWaitlist(null)).toMatchObject({ ok: false });
});
