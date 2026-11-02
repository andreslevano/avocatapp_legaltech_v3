import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { eurLexQuery, htmlToText, parseBoeItemXml, parseBoeSummary, parseEurLexResults } from '@/lib/legal/sources';
import { ANALYSIS_JSON_SCHEMA, changeDocId, parseAnalysis, parseTriage, TRIAGE_JSON_SCHEMA, triageUserMessage } from '@/lib/legal/triage';
import { changeAppliesTo } from '@/lib/legal/types';
import { isAffected } from '@/lib/legal/match';
import { computeDates } from '@/lib/contracts/dates';

const fixture = (f: string) => readFileSync(join(__dirname, '../fixtures', f), 'utf8');

test.describe('feeds (real samples)', () => {
  test('BOE summary → section I items only, nested object-or-array shapes', () => {
    const items = parseBoeSummary(JSON.parse(fixture('boe-sumario-sample.json')));
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i).toMatchObject({ source: 'boe', jurisdiction: 'ES', publishedAt: '2026-11-02' });
      expect(i.externalId).toMatch(/^BOE-A-2026-\d+$/);
      expect(i.textUrl).toContain('xml.php?id=');
    }
    expect(items[0].title).toMatch(/^Orden TED\/1152\/2026/);
    expect(parseBoeSummary({})).toEqual([]);
    expect(parseBoeSummary(null)).toEqual([]);
  });
  test('BOE item XML → text and rank', () => {
    const p = parseBoeItemXml(fixture('boe-item-sample.xml'));
    expect(p.rank).toBe('Orden');
    expect(p.text.length).toBeGreaterThan(1000);
    expect(p.text).not.toMatch(/<p\b/);
  });
  test('EUR-Lex SPARQL → regs/directives, corrigenda dropped, dedup', () => {
    const items = parseEurLexResults(JSON.parse(fixture('eurlex-sparql-sample.json')));
    expect(items.length).toBeGreaterThan(5);
    expect(items.every(i => /^3\d{4}[LR]\d{4}$/.test(i.externalId))).toBe(true);
    expect(items.some(i => i.externalId.includes('('))).toBe(false);
    expect(items[0].url).toContain('eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:');
    expect(eurLexQuery('2026-10-20', '2026-11-02')).toContain('"2026-10-20"^^xsd:date');
  });
  test('html to text', () => {
    expect(htmlToText('<p>Artículo&nbsp;1.</p><p>Uno &amp; dos&#46;</p>')).toBe('Artículo 1.\nUno & dos.');
  });
});

test.describe('triage + analysis validation', () => {
  test('triage verdicts by index; garbage ignored', () => {
    const v = parseTriage({ items: [
      { i: 1, relevant: true, topics: ['personal_data', 'bogus'], rationale: 'RGPD', confidence: 1.4 },
      { i: 9, relevant: true, topics: [], rationale: '', confidence: 1 },
    ] }, 2);
    expect(v[0]).toEqual({ relevant: false, topics: [], rationale: '', confidence: 0 });
    expect(v[1]).toEqual({ relevant: true, topics: ['personal_data'], rationale: 'RGPD', confidence: 1 });
    expect(parseTriage('nope', 1)).toHaveLength(1);
    expect(triageUserMessage([{ title: 'Ley 1/2026', source: 'boe', department: 'Jefatura del Estado' }])).toBe('0. [BOE · Jefatura del Estado] Ley 1/2026');
  });
  test('analysis requires summary + requirement; enums and dates checked', () => {
    const a = parseAnalysis({
      relevant: true, summary: 'Cambia X.', requirement: 'Incluir Y.', topics: ['whistleblowing'], clauseKeys: ['whistleblower_carveout', 'nope'],
      severity: 'critical', suggestedClause: 'Nada impide…', effectiveFrom: '2026-12-01', contractTypes: [],
    });
    expect(a).toMatchObject({ severity: 'critical', clauseKeys: ['whistleblower_carveout'], effectiveFrom: '2026-12-01', contractTypes: ['nda'] });
    expect(parseAnalysis({ relevant: true, summary: '', requirement: 'x' })).toBeNull();
    expect(parseAnalysis({ relevant: true, summary: 'a', requirement: 'b', severity: 'meh', effectiveFrom: '1/12/2026' }))
      .toMatchObject({ severity: 'recommended', effectiveFrom: null, suggestedClause: null });
  });
  test('strict schemas list every property as required', () => {
    for (const s of [TRIAGE_JSON_SCHEMA.schema.properties.items.items, ANALYSIS_JSON_SCHEMA.schema]) {
      expect([...s.required].sort()).toEqual(Object.keys(s.properties).sort());
    }
  });
  test('stable ids', () => {
    expect(changeDocId('boe', 'BOE-A-2026-22888')).toBe('boe_BOE-A-2026-22888');
    expect(changeDocId('eurlex', '32026R2412')).toBe('eurlex_32026R2412');
  });
});

test.describe('which NDAs a change affects', () => {
  const nda = (country: string | null, effectiveDate: string | null, over: Record<string, unknown> = {}) => ({
    type: 'nda' as const, jurisdiction: { country }, confirmedByUser: true, lifecycle: 'active' as const,
    dates: computeDates(effectiveDate, { months: 24 }), ...over,
  });
  const es = { jurisdiction: 'ES' as const, contractTypes: ['nda' as const], effectiveFrom: '2026-12-01', publishedAt: '2026-11-02' };
  const eu = { ...es, jurisdiction: 'EU' as const };
  test('jurisdiction: ES law → ES contracts; EU law → EU member contracts', () => {
    expect(changeAppliesTo('ES', 'ES')).toBe(true);
    expect(changeAppliesTo('ES', 'CL')).toBe(false);
    expect(changeAppliesTo('EU', 'ES')).toBe(true);
    expect(changeAppliesTo('EU', 'FR')).toBe(true);
    expect(changeAppliesTo('EU', 'CL')).toBe(false);
    expect(changeAppliesTo('EU', null)).toBe(false);
  });
  test('open, confirmed NDAs that started before the change', () => {
    expect(isAffected(nda('ES', '2025-01-01'), es)).toBe(true);
    expect(isAffected(nda('ES', '2025-01-01'), eu)).toBe(true);
    expect(isAffected(nda('CL', '2025-01-01'), es)).toBe(false);
    expect(isAffected(nda('ES', '2027-01-01'), es)).toBe(false);                    // started after the change
    expect(isAffected(nda('ES', null), es)).toBe(true);                             // unknown start → flag
    expect(isAffected(nda('ES', '2025-01-01', { confirmedByUser: false }), es)).toBe(false);
    expect(isAffected(nda('ES', '2025-01-01', { lifecycle: 'terminated' }), es)).toBe(false);
    expect(isAffected(nda('ES', '2025-01-01', { type: 'service' }), es)).toBe(false);
    expect(isAffected(nda('ES', '2025-01-01', { type: 'service' }), { ...es, contractTypes: ['nda', 'service'] })).toBe(true);
    expect(isAffected(nda('ES', '2026-11-15'), { ...es, effectiveFrom: null })).toBe(false); // falls back to publishedAt
  });
});
