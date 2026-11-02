import { test, expect } from '@playwright/test';
import { applicableRules, CHECK_JSON_SCHEMA, checkUserMessage, parseCheck, updateInstructions, verdictOf, type CheckRule } from '@/lib/legal/check';
import { DEFAULT_BASELINE } from '@/lib/legal/baseline';
import { computeDates } from '@/lib/contracts/dates';

const nda = (country: string | null, start: string | null, type: 'nda' | 'service' = 'nda') =>
  ({ type, jurisdiction: { country }, dates: computeDates(start, { months: 24 }) });
const change = (over: Record<string, unknown> = {}) => ({
  id: 'ch1', status: 'approved' as const, jurisdiction: 'ES' as const, contractTypes: ['nda' as const],
  effectiveFrom: '2026-12-01', publishedAt: '2026-11-02', title: 'Ley X', url: 'https://boe.es/x',
  requirement: 'Debe incluir Y', severity: 'important' as const, suggestedClause: 'Cláusula Y', ...over,
});

test.describe('which rules apply (L2)', () => {
  test('baseline for ES: Spanish + EU items, all active by default', () => {
    const r = applicableRules(nda('ES', '2025-01-01'), [], DEFAULT_BASELINE);
    expect(r.map(x => x.id)).toEqual(DEFAULT_BASELINE.map(b => `baseline:${b.id}`));
    expect(r.every(x => x.kind === 'baseline' && !x.validatedByLawyer)).toBe(true);
  });
  test('EU-only member state gets only EU baseline; Chile gets nothing', () => {
    expect(applicableRules(nda('FR', '2025-01-01'), [], DEFAULT_BASELINE).every(x => x.id.startsWith('baseline:eu-'))).toBe(true);
    expect(applicableRules(nda('CL', '2025-01-01'), [change()], DEFAULT_BASELINE)).toEqual([]);
  });
  test('approved changes in force after the NDA start; inactive baseline skipped', () => {
    const base = DEFAULT_BASELINE.map(b => ({ ...b, active: false }));
    expect(applicableRules(nda('ES', '2025-01-01'), [change()], base).map(x => x.id)).toEqual(['ch1']);
    expect(applicableRules(nda('ES', '2027-01-01'), [change()], base)).toEqual([]);              // NDA newer than the change
    expect(applicableRules(nda('ES', '2025-01-01'), [change({ status: 'new' })], base)).toEqual([]);
    expect(applicableRules(nda('ES', '2025-01-01'), [change({ jurisdiction: 'EU' })], base)).toHaveLength(1);
    expect(applicableRules(nda('ES', '2025-01-01', 'service'), [change()], base)).toEqual([]);
  });
});

const rules: CheckRule[] = [
  { id: 'baseline:a', kind: 'baseline', title: 'A', url: '', requirement: 'ra', severity: 'critical', suggestedClause: 'CA', validatedByLawyer: false },
  { id: 'ch1', kind: 'change', title: 'B', url: 'u', requirement: 'rb', severity: 'important', suggestedClause: 'CB', validatedByLawyer: true },
  { id: 'baseline:c', kind: 'baseline', title: 'C', url: '', requirement: 'rc', severity: 'recommended', suggestedClause: null, validatedByLawyer: false },
];

test.describe('check result', () => {
  test('one finding per rule; skipped rules are not assumed ok', () => {
    const { findings, verdict } = parseCheck({ findings: [
      { ruleId: 'baseline:a', status: 'ok', explanation: 'Cumple', excerpt: 'Nada impide…' },
      { ruleId: 'ch1', status: 'missing', explanation: 'Falta Y', excerpt: null },
      { ruleId: 'invented', status: 'conflict', explanation: 'x', excerpt: null },
    ] }, rules);
    expect(findings.map(f => [f.ruleId, f.status])).toEqual([['baseline:a', 'ok'], ['ch1', 'missing'], ['baseline:c', 'missing']]);
    expect(findings[1].suggestedClause).toBe('CB');
    expect(findings[0].suggestedClause).toBeNull();
    expect(findings[2].explanation).toMatch(/manualmente/);
    expect(verdict).toBe('review');
  });
  test('verdicts', () => {
    expect(verdictOf([{ status: 'missing', severity: 'critical' }])).toBe('outdated');
    expect(verdictOf([{ status: 'conflict', severity: 'recommended' }, { status: 'ok', severity: 'critical' }])).toBe('review');
    expect(verdictOf([{ status: 'ok', severity: 'critical' }, { status: 'not_applicable', severity: 'critical' }])).toBe('ok');
    expect(parseCheck({}, [])).toEqual({ findings: [], verdict: 'no_rules' });
    expect(parseCheck('garbage', rules).verdict).toBe('outdated');     // nothing evaluated → nothing trusted
  });
  test('update instructions only for failing findings, bounded', () => {
    const { findings } = parseCheck({ findings: rules.map(r => ({ ruleId: r.id, status: 'missing', explanation: `Falta ${r.title}.`, excerpt: null })) }, rules);
    const u = updateInstructions(findings);
    expect(u).toHaveLength(3);
    expect(u[0]).toBe('Falta A. Incluye una cláusula como: «CA»');
    expect(u[2]).toBe('Falta C.');
    expect(updateInstructions(parseCheck({ findings: rules.map(r => ({ ruleId: r.id, status: 'ok', explanation: '', excerpt: null })) }, rules).findings)).toEqual([]);
  });
  test('prompt lists every rule id; strict schema', () => {
    const m = checkUserMessage('NDA X', 'texto', rules);
    for (const r of rules) expect(m).toContain(`ruleId: ${r.id}`);
    const item = CHECK_JSON_SCHEMA.schema.properties.findings.items;
    expect([...item.required].sort()).toEqual(Object.keys(item.properties).sort());
  });
  test('baseline defaults are well-formed', () => {
    const ids = new Set(DEFAULT_BASELINE.map(b => b.id));
    expect(ids.size).toBe(DEFAULT_BASELINE.length);
    for (const b of DEFAULT_BASELINE) {
      expect(b.url).toMatch(/^https:\/\//);
      expect(b.requirement.length).toBeGreaterThan(30);
      expect(b.validatedByLawyer).toBe(false);
    }
  });
});
