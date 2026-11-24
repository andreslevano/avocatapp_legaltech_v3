import { expect, test } from '@playwright/test';
import { gmailQuery, outlookSearch, providerForDomain } from '@/lib/email/core';

test('search criteria → Gmail q / Outlook $search', () => {
  const c = { keywords: 'contrato  "arras"', from: 'ana@x.es', dateFrom: '2026-01-01', dateTo: '2026-02-01' };
  expect(gmailQuery(c)).toBe('contrato arras from:ana@x.es after:2026/01/01 before:2026/02/01');
  expect(outlookSearch(c)).toBe('"contrato arras from:ana@x.es received>=2026-01-01 received<=2026-02-01"');
  expect(gmailQuery({})).toBe('in:inbox');
  expect(outlookSearch({})).toBeNull();
  expect(gmailQuery({ dateFrom: '01/01/2026' })).toBe('in:inbox');      // bad date ignored
});

test('provider of the login email', () => {
  expect(providerForDomain('gmail.com')).toBe('gmail');
  expect(providerForDomain('hotmail.es')).toBe('outlook');
  expect(providerForDomain('mobilityforwork.es', ['mobilityforwork-es.mail.protection.outlook.com.'])).toBe('outlook');
  expect(providerForDomain('avocatapp.com', ['aspmx.l.google.com', 'alt1.aspmx.l.google.com'])).toBe('gmail');
  expect(providerForDomain('bufete.es', ['mx.ionos.es'])).toBeNull();
  expect(providerForDomain('x.es')).toBeNull();
});
