import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  addMonths, computeDates, daysBetween, lastPassedContractEvent, lifecycleFor, madridHour, madridToday, nextContractEvent, parseDuration, rollForward,
} from '@/lib/contracts/dates';
import { alertText, buildDigest, dueAlerts, normalizePrefs, DEFAULT_PREFS } from '@/lib/contracts/alerts';
import { contractFromExtraction, contractFromNdaForm, EXTRACTION_JSON_SCHEMA, validateContractEdit } from '@/lib/contracts/extract';
import { countryCode, type Contract } from '@/lib/contracts/types';
import { canUseContracts } from '@/lib/contracts/config';

test.describe('dates (F0)', () => {
  test('durations from the NDA form', () => {
    expect(parseDuration('1 año')).toEqual({ months: 12, indefinite: false });
    expect(parseDuration('2 años')).toEqual({ months: 24, indefinite: false });
    expect(parseDuration('18 meses')).toEqual({ months: 18, indefinite: false });
    expect(parseDuration('3 years')).toEqual({ months: 36, indefinite: false });
    expect(parseDuration('Indefinida mientras exista la relación comercial')).toEqual({ months: null, indefinite: true });
    expect(parseDuration('')).toEqual({ months: null, indefinite: false });
  });
  test('month arithmetic clamps to the last day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-02', 24)).toBe('2028-11-02');
    expect(daysBetween('2026-11-02', '2026-12-02')).toBe(30);
    expect(daysBetween('2026-11-02', '2026-11-01')).toBe(-1);
  });
  test('fixed term', () => {
    expect(computeDates('2026-11-02', { months: 24 })).toEqual({
      effectiveDate: '2026-11-02', termEndDate: '2028-11-02', confidentialitySurvivalEnd: null, noticeDeadline: null,
    });
  });
  test('indefinite has no end', () => {
    expect(computeDates('2026-11-02', { months: null, indefinite: true }).termEndDate).toBeNull();
  });
  test('survival after the term', () => {
    expect(computeDates('2026-11-02', { months: 12, survivalMonths: 36 }).confidentialitySurvivalEnd).toBe('2030-11-02');
  });
  test('notice deadline only with auto-renewal', () => {
    expect(computeDates('2026-11-02', { months: 12, autoRenewal: true, noticeDays: 30 }).noticeDeadline).toBe('2027-10-03');
    expect(computeDates('2026-11-02', { months: 12, noticeDays: 30 }).noticeDeadline).toBeNull();
  });
  test('explicit end date wins; no effective date → no computed end', () => {
    expect(computeDates('2026-11-02', { months: 12, fixedEndDate: '2027-06-30' }).termEndDate).toBe('2027-06-30');
    expect(computeDates(null, { months: 12 }).termEndDate).toBeNull();
    expect(computeDates('2026-02-30', { months: 12 }).effectiveDate).toBeNull();
  });
  test('auto-renewal rolls forward until the end is not in the past', () => {
    const term = { months: 12, autoRenewal: true, noticeDays: 30 };
    const d = computeDates('2024-03-01', term);
    expect(rollForward(d, term, '2026-11-02')).toMatchObject({ termEndDate: '2027-03-01', noticeDeadline: '2027-01-30' });
    expect(rollForward(d, { ...term, renewalMonths: 6 }, '2026-11-02')?.termEndDate).toBe('2027-03-01');
    expect(rollForward(computeDates('2026-01-01', term), term, '2026-11-02')).toBeNull();      // not ended yet
    expect(rollForward(d, { months: 12 }, '2026-11-02')).toBeNull();                          // no auto-renewal
  });
  test('lifecycle and next event', () => {
    const d = computeDates('2025-11-20', { months: 12 });                                       // ends 2026-11-20
    expect(lifecycleFor('active', d, '2026-06-01')).toBe('active');
    expect(lifecycleFor('active', d, '2026-11-02')).toBe('expiring');
    expect(lifecycleFor('expiring', d, '2026-11-21')).toBe('expired');
    expect(lifecycleFor('terminated', d, '2026-11-21')).toBeNull();
    expect(nextContractEvent(d, '2026-11-02')).toEqual({ kind: 'termEndDate', date: '2026-11-20' });
    expect(nextContractEvent(d, '2026-11-21')).toBeNull();
  });
  test('Madrid day and hour', () => {
    expect(madridToday(new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03');                 // 00:30 CET
    expect(madridHour(new Date('2026-07-01T06:00:00Z'))).toBe(8);                               // CEST
  });
});

const contract = (over: Partial<Contract> = {}): Contract => ({
  id: 'c1', userId: 'u1', documentId: 'd1', caseId: null, clientId: null, type: 'nda', title: 'NDA Acme', language: 'es',
  jurisdiction: { country: 'ES' }, parties: [], clauses: [],
  term: { months: 12 }, dates: computeDates('2025-12-01', { months: 12 }),                       // ends 2026-12-01
  extraction: { source: 'generated', confidence: 1, fieldConfidence: {}, extractedAt: '' },
  confirmedByUser: true, lifecycle: 'active', createdAt: '', updatedAt: '', ...over,
});

test.describe('alerts (F3)', () => {
  const T = DEFAULT_PREFS.thresholds;
  test('only the current band fires', () => {
    expect(dueAlerts(contract(), '2026-11-02', T).map(a => a.key)).toEqual(['c1_termEndDate_30']);  // 29 days left
    expect(dueAlerts(contract(), '2026-09-02', T).map(a => a.threshold)).toEqual([90]);
    expect(dueAlerts(contract(), '2026-11-25', T).map(a => a.threshold)).toEqual([7]);
    expect(dueAlerts(contract(), '2026-12-01', T).map(a => a.threshold)).toEqual([0]);
    expect(dueAlerts(contract(), '2026-06-01', T)).toEqual([]);
  });
  test('seeded +90/+30/+7/0 each produce exactly one alert with its own key', () => {
    const keys = [90, 30, 7, 0].map(n => {
      const today = '2026-11-02';
      const c = contract({ id: `s${n}`, dates: { effectiveDate: null, termEndDate: addDaysIso(today, n), noticeDeadline: null, confidentialitySurvivalEnd: null } });
      return dueAlerts(c, today, T).map(a => a.key);
    });
    expect(keys).toEqual([['s90_termEndDate_90'], ['s30_termEndDate_30'], ['s7_termEndDate_7'], ['s0_termEndDate_0']]);
  });
  test('past dates: grace on day 0 only', () => {
    expect(dueAlerts(contract(), '2026-12-03', T).map(a => a.key)).toEqual(['c1_termEndDate_0']);
    expect(dueAlerts(contract(), '2027-01-03', T)).toEqual([]);
  });
  test('notice deadline needs auto-renewal; survival end alerts too', () => {
    const term = { months: 12, autoRenewal: true, noticeDays: 30, survivalMonths: 1 };
    const c = contract({ term, dates: computeDates('2025-12-01', term) });                      // notice 2026-11-01
    expect(dueAlerts(c, '2026-10-30', T).map(a => a.kind)).toEqual(['noticeDeadline', 'termEndDate', 'confidentialitySurvivalEnd']);
  });
  test('unconfirmed, muted, snoozed and closed contracts stay quiet', () => {
    expect(dueAlerts(contract({ confirmedByUser: false }), '2026-11-02', T)).toEqual([]);
    expect(dueAlerts(contract({ alertsMuted: true }), '2026-11-02', T)).toEqual([]);
    expect(dueAlerts(contract({ snoozedUntil: '2026-11-09' }), '2026-11-02', T)).toEqual([]);
    expect(dueAlerts(contract({ snoozedUntil: '2026-11-02' }), '2026-11-02', T)).toHaveLength(1);
    expect(dueAlerts(contract({ lifecycle: 'terminated' }), '2026-11-02', T)).toEqual([]);
  });
  test('user thresholds', () => {
    expect(dueAlerts(contract(), '2026-11-02', [60, 14]).map(a => a.threshold)).toEqual([60]);
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs({ thresholds: [7, 90, 7, -1, 'x'], email: false, digestHour: 25 }))
      .toEqual({ thresholds: [90, 7], email: false, digestHour: 8 });
  });
  test('Spanish texts', () => {
    expect(alertText('Acme', 'NDA', { kind: 'termEndDate', daysLeft: 28, dueDate: '2026-11-30' }).title).toBe('NDA «Acme» vence en 28 días');
    expect(alertText('Acme', 'NDA', { kind: 'termEndDate', daysLeft: 0, dueDate: '2026-11-02' }).title).toBe('NDA «Acme» vence hoy');
    expect(alertText('Acme', 'NDA', { kind: 'termEndDate', daysLeft: -1, dueDate: '2026-11-01' }).title).toBe('NDA «Acme» venció ayer');
    expect(alertText('Acme', 'NDA', { kind: 'noticeDeadline', daysLeft: 1, dueDate: '2026-11-15' }).body).toContain('15 nov 2026');
  });
  test('digest groups and escapes', () => {
    const d = buildDigest([
      { title: 'NDA «<b>X</b>» vence hoy', body: 'b', dueDate: '2026-11-02', severity: 'high' },
      { title: 'NDA «Y» vence en 30 días', body: 'b', dueDate: '2026-12-02', severity: 'medium' },
    ], 'https://avocatapp.com/');
    expect(d.subject).toBe('Avocat · 2 avisos de vencimiento de contratos');
    expect(d.html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(d.html).toContain('https://avocatapp.com/notifications');
    expect(d.text.indexOf('«<b>X</b>»')).toBeLessThan(d.text.indexOf('«Y»'));
  });
});

function addDaysIso(iso: string, n: number) { return new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10); }

test.describe('contract records (F0)', () => {
  const form = {
    documentId: 'd1', title: 'NDA — Acme / Nike', tipo: 'unilateral' as const, language: 'es' as const,
    divulgante: { nombre: 'Ana', empresa: 'Acme' }, receptora: { nombre: 'Juan', empresa: 'Nike', email: 'j@nike.com' },
    duracion: '2 años', jurisdiccion: 'España', ciudadJurisdiccion: 'Madrid', noCompetencia: true,
  };
  test('generated NDA → confirmed record, no LLM', () => {
    const c = contractFromNdaForm(form, 'u1', '2026-11-02');
    expect(c).toMatchObject({
      userId: 'u1', type: 'nda', ndaKind: 'unilateral', confirmedByUser: true, lifecycle: 'active',
      jurisdiction: { country: 'ES', region: 'Madrid' },
      dates: { effectiveDate: '2026-11-02', termEndDate: '2028-11-02' },
      extraction: { source: 'generated', confidence: 1 },
    });
    expect(c.parties.map(p => p.role)).toEqual(['disclosing', 'receiving']);
    expect(c.clauses.find(x => x.key === 'non_compete')?.present).toBe(true);
    expect(c.clauses.find(x => x.key === 'penalty')?.present).toBe(false);
    expect(contractFromNdaForm({ ...form, tipo: 'bilateral' }, 'u1', '2026-11-02').parties.map(p => p.role)).toEqual(['mutual', 'mutual']);
  });
  test('country codes', () => {
    expect(countryCode('España')).toBe('ES');
    expect(countryCode('chile')).toBe('CL');
    expect(countryCode('cl')).toBe('CL');
    expect(countryCode('Narnia')).toBeNull();
  });

  const ctx = { uid: 'u1', documentId: 'd9', caseId: null, clientId: null, fallbackTitle: 'Contrato', model: 'gpt-4o' };
  const good = {
    isContract: true, type: 'nda', title: 'NDA Acme', language: 'es', ndaKind: 'bilateral', jurisdictionCountry: 'ES',
    governingLaw: 'Derecho español', parties: [{ name: 'Acme SL', company: null, role: 'mutual' }, { name: '', company: null, role: 'x' }],
    effectiveDate: '2025-01-15', termMonths: 24, indefinite: false, termEndDate: null, autoRenewal: true, renewalMonths: 12,
    noticeDays: 60, survivalMonths: 36, clauses: [{ key: 'personal_data', present: false, excerpt: null }, { key: 'bogus', present: true, excerpt: 'x' }],
    confidence: { effectiveDate: 0.9, term: 0.95, parties: 0.8, jurisdiction: 1, renewal: 0.5, survival: 0.85 },
  };
  test('extraction → unconfirmed record with computed dates and min confidence', () => {
    const { contract: c } = contractFromExtraction(good, ctx);
    expect(c).toMatchObject({
      confirmedByUser: false, ndaKind: 'bilateral', jurisdiction: { country: 'ES' },
      dates: { effectiveDate: '2025-01-15', termEndDate: '2027-01-15', noticeDeadline: '2026-11-16', confidentialitySurvivalEnd: '2030-01-15' },
      extraction: { source: 'llm', confidence: 0.5 },
    });
    expect(c!.parties).toHaveLength(1);                     // empty names dropped
    expect(c!.clauses.map(x => x.key)).toEqual(['personal_data']);   // unknown keys dropped
  });
  test('missing values get zero confidence; garbage is rejected', () => {
    const { contract: c } = contractFromExtraction({ ...good, effectiveDate: '15/01/2025', termMonths: null }, ctx);
    expect(c!.extraction.fieldConfidence).toMatchObject({ effectiveDate: 0, term: 0 });
    expect(c!.dates.termEndDate).toBeNull();
    expect(contractFromExtraction({ ...good, isContract: false }, ctx)).toEqual({ contract: null, reason: 'not_contract' });
    expect(contractFromExtraction('nope', ctx)).toEqual({ contract: null, reason: 'invalid' });
    expect(contractFromExtraction({ ...good, termMonths: -3, noticeDays: 1e9 }, ctx).contract!.term).toMatchObject({ months: null, noticeDays: null });
  });
  test('strict schema lists every property as required', () => {
    const s = EXTRACTION_JSON_SCHEMA.schema;
    expect([...s.required].sort()).toEqual(Object.keys(s.properties).sort());
  });
  test('edit validation', () => {
    expect(validateContractEdit({ effectiveDate: '2026-11-02', term: { months: 24, noticeDays: 30 } })).toBeNull();
    expect(validateContractEdit({ effectiveDate: '02/11/2026' })).toMatch(/inicio/);
    expect(validateContractEdit({ term: { months: 1.5 } })).toMatch(/plazos/);
    expect(validateContractEdit({ parties: [{ name: ' ' }] })).toMatch(/nombre/);
  });
  test('feature gate', () => {
    expect(canUseContracts('Abogados', 'andres.levano@mobilityforwork.es')).toBe(true);
    expect(canUseContracts('Abogados', 'otro@x.com')).toBe(false);
    expect(canUseContracts('Autoservicio', 'andres.levano@mobilityforwork.es')).toBe(false);
  });
  test('the cron route requires a long shared secret, compared in constant time', () => {
    const src = readFileSync(join(__dirname, '../../src/app/api/cron/contract-alerts/route.ts'), 'utf8');
    expect(src).toMatch(/secret\.length < 32/);
    expect(src).toMatch(/timingSafeEqual/);
  });
});

test.describe('agent history persistence', () => {
  test('assistant messages never carry undefined fields (Firestore rejects them)', () => {
    const src = readFileSync(join(__dirname, '../../src/app/api/agent-v2/route.ts'), 'utf8');
    const block = src.slice(src.indexOf('const assistantMsg'), src.indexOf('await convRef.update'));
    expect(block).not.toMatch(/:\s*undefined/);
  });
});

test.describe('lastPassedContractEvent (panel "Venció hace…")', () => {
  const base = { effectiveDate: '2025-11-02', noticeDeadline: null, confidentialitySurvivalEnd: null };
  test('recent past end date is returned', () => {
    expect(lastPassedContractEvent({ ...base, termEndDate: '2026-11-02' }, '2026-11-13')).toEqual({ kind: 'termEndDate', date: '2026-11-02' });
  });
  test('older than the grace window is dropped', () => {
    expect(lastPassedContractEvent({ ...base, termEndDate: '2026-10-01' }, '2026-11-13')).toBeNull();
  });
  test('today or future dates are not "passed"', () => {
    expect(lastPassedContractEvent({ ...base, termEndDate: '2026-11-13' }, '2026-11-13')).toBeNull();
  });
  test('most recent of several passed dates wins', () => {
    expect(lastPassedContractEvent({ ...base, noticeDeadline: '2026-11-01', termEndDate: '2026-11-09' }, '2026-11-13')?.date).toBe('2026-11-09');
  });
});
