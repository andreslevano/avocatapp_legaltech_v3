// NDA negotiation — pure modules: clause split/assemble on the real MOBIFORWORK template, levels,
// validation and transitions (rules.ts), word diff, notifications/emails and the signature gate.
import { expect, test } from '@playwright/test';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { assemble, splitClauses } from '@/lib/negotiations/clauses';
import { defaultLevel, levelAllows, MFW_PLAYBOOK } from '@/lib/negotiations/levels';
import {
  applyOwnerResponse, applyThirdParty, cleanClauseText, effectiveStatus, linkShowsClauses, linkState, nextStatus,
  CLAUSE_TEXT_MAX, NOTE_MAX,
} from '@/lib/negotiations/rules';
import { hasChanges, wordDiff } from '@/lib/negotiations/diff';
import { counterpartyEmail, negotiationNotification, ownerEmail } from '@/lib/negotiations/emails';
import { canSendForSignature, negotiationAllowsSignature } from '@/lib/signatures/eligibility';
import { buildDocHtml, DRAFT_MARK } from '@/lib/doc-html';
import type { NegClause, Negotiation } from '@/lib/negotiations/types';

const persona = renderMfwNda({ receptor: { tipo: 'persona', nombre: 'Juan Pérez', domicilio: 'Calle Mayor 1, Madrid', documento: 'DNI 12345678Z', email: 'juan@x.es' }, productos: 'Plataforma Avocat' });
const sociedad = renderMfwNda({
  receptor: { tipo: 'sociedad', razonSocial: 'Acme S.L.', nif: 'B12345678', domicilio: 'Calle 2', nombre: 'Ana Gil', documento: 'DNI 1', cargo: 'CEO', facultades: 'Poder', email: 'ana@acme.es' },
  productos: '## Producto A\n- **Uno**\n- Dos',
});

// ── clauses.ts ──────────────────────────────────────────────────────

for (const [label, md] of [['persona', persona], ['sociedad', sociedad]] as const) {
  test(`splitClauses/assemble round-trip on renderMfwNda (${label})`, () => {
    const s = splitClauses(md, 14);
    if (!s.ok) throw new Error(s.error);
    expect(s.clauses).toHaveLength(14);
    expect(s.clauses.map(c => c.n)).toEqual([...Array(14)].map((_, i) => i + 1));
    expect(s.clauses.map(c => c.key)).toEqual([...Array(14)].map((_, i) => `c${i + 1}`));
    expect(s.clauses[0].heading).toBe('OBJETO');
    expect(s.clauses[1].heading).toBe('DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL');
    expect(s.clauses[13].heading).toBe('COMUNICACIONES Y NOTIFICACIONES');
    // Template note: heading 10 says NO CONCURRENCIA, the text says otherwise (reported to MOBIFORWORK).
    expect(s.clauses[9].heading).toBe('NO CONCURRENCIA');
    expect(s.preamble).toContain('## CLÁUSULAS');
    expect(s.preamble).not.toContain('## CLÁUSULA 1.');
    // The closing formula, signatures and the annex stay out of the clauses.
    expect(s.tail.startsWith('En prueba de conformidad')).toBe(true);
    expect(s.tail).toContain('## FIRMAS');
    expect(s.tail).toContain('## ANEXO I');
    expect(s.clauses[13].text).not.toContain('En prueba de conformidad');
    expect(assemble(s)).toBe(md);
  });
}

test('splitClauses rejects missing, out-of-order or miscounted clauses', () => {
  expect(splitClauses('# Sin cláusulas\n\nTexto')).toMatchObject({ ok: false });
  expect(splitClauses('## CLÁUSULA 1. A\n\nx\n\n## CLÁUSULA 3. C\n\ny\n')).toMatchObject({ ok: false });
  expect(splitClauses('## CLÁUSULA 2. B\n\nx\n')).toMatchObject({ ok: false });
  expect(splitClauses(persona, 13)).toMatchObject({ ok: false });
  expect(splitClauses('')).toMatchObject({ ok: false });
});

test('assemble uses the edited clause text, keeping preamble and tail', () => {
  const s = splitClauses(persona, 14);
  if (!s.ok) throw new Error(s.error);
  const out = assemble({ ...s, clauses: s.clauses.map(c => (c.n === 5 ? { ...c, text: 'Texto nuevo.' } : c)) });
  expect(out).toContain('## CLÁUSULA 5. DEVOLUCIÓN Y DESTRUCCIÓN DE INFORMACIÓN\n\nTexto nuevo.\n\n## CLÁUSULA 6.');
  expect(out.startsWith(s.preamble)).toBe(true);
  expect(out.endsWith(s.tail)).toBe(true);
});

// ── levels.ts ───────────────────────────────────────────────────────

test('MOBIFORWORK playbook defaults and what each level allows', () => {
  expect([1, 2, 3, 7, 9, 13].map(n => defaultLevel(MFW_PLAYBOOK, n))).toEqual(Array(6).fill('negociable'));
  expect([4, 6, 8, 10, 11].map(n => defaultLevel(MFW_PLAYBOOK, n))).toEqual(Array(5).fill('no_modificable'));
  expect([5, 12, 14].map(n => defaultLevel(MFW_PLAYBOOK, n))).toEqual(Array(3).fill('modificable'));
  expect(levelAllows('no_modificable')).toEqual({ propose: false, reasonRequired: false });
  expect(levelAllows('negociable')).toEqual({ propose: true, reasonRequired: true });
  expect(levelAllows('modificable')).toEqual({ propose: true, reasonRequired: false });
});

// ── rules.ts ────────────────────────────────────────────────────────

const AT = '2026-11-19T10:00:00.000Z';
const clause = (n: number, level: NegClause['level'], over: Partial<NegClause> = {}): NegClause => ({
  key: `c${n}`, n, heading: `H${n}`, level, original: `Texto ${n} original.`, current: `Texto ${n} original.`,
  state: 'pendiente', proposal: null, ownerDecision: null, comments: [], ...over,
});
const neg = (over: Partial<Negotiation> = {}) => ({
  status: 'en_revision' as const, turn: 'tercero' as const, round: 1, expiresAt: '2026-12-03T10:00:00.000Z',
  clauses: [clause(1, 'negociable'), clause(2, 'no_modificable'), clause(3, 'modificable')],
  ...over,
});
const acceptRest = (keys: string[]) => keys.map(key => ({ key, action: 'acepto' }));

test('proposal on a no_modificable clause → error', () => {
  const r = applyThirdParty(neg(), { items: [{ key: 'c2', action: 'propongo', text: 'Otra cosa', reason: 'x' }, ...acceptRest(['c1', 'c3'])] }, AT);
  expect(r).toMatchObject({ ok: false, code: 'invalid_input' });
  expect(r.ok === false && r.errors?.c2).toContain('no se puede modificar');
});

test('negociable without a reason → error; modificable without one is fine', () => {
  const r = applyThirdParty(neg(), { items: [{ key: 'c1', action: 'propongo', text: 'Nuevo 1' }, ...acceptRest(['c2', 'c3'])] }, AT);
  expect(r.ok === false && r.errors?.c1).toContain('motivo');
  const ok = applyThirdParty(neg(), { items: [{ key: 'c3', action: 'propongo', text: 'Nuevo 3' }, ...acceptRest(['c1', 'c2'])] }, AT);
  expect(ok.ok).toBe(true);
});

test('every pending clause must be reviewed unless the whole draft is accepted', () => {
  expect(applyThirdParty(neg(), { items: acceptRest(['c1']) }, AT)).toMatchObject({ ok: false, code: 'invalid_input' });
  const all = applyThirdParty(neg(), { items: [], acceptAll: true }, AT);
  expect(all).toMatchObject({ ok: true, status: 'acordado', turn: null });
  // acceptAll with a proposal or comment is refused
  expect(applyThirdParty(neg(), { items: [{ key: 'c1', action: 'comento', text: '¿?' }], acceptAll: true }, AT)).toMatchObject({ ok: false });
});

test('wrong turn → error (third party and owner)', () => {
  expect(applyThirdParty(neg({ status: 'cambios_propuestos', turn: 'propietario' }), { acceptAll: true }, AT)).toMatchObject({ ok: false, code: 'turn' });
  expect(applyOwnerResponse(neg(), { decisions: [] }, AT)).toMatchObject({ ok: false, code: 'turn' });
});

test('markdown heading injection is stripped and limits apply', () => {
  expect(cleanClauseText('## FIRMAS\n# CLÁUSULA 15. NUEVA\nTexto ____ firma')).toBe('FIRMAS\nCLÁUSULA 15. NUEVA\nTexto firma');
  expect(cleanClauseText('> ## x\n---\n1. uno\n* dos\n- tres\n**negrita**')).toBe('x\n\nuno\n- dos\n- tres\n**negrita**');
  expect(cleanClauseText('a'.repeat(5000))).toHaveLength(CLAUSE_TEXT_MAX);
  const r = applyThirdParty(neg(), { items: [{ key: 'c3', action: 'propongo', text: '## CLÁUSULA 99. X\nNuevo' }, { key: 'c1', action: 'comento', text: `## ${'b'.repeat(2000)}` }, ...acceptRest(['c2'])] }, AT);
  if (!r.ok) throw new Error(r.error);
  const c3 = r.clauses.find(c => c.key === 'c3')!;
  expect(c3.proposal!.text).toBe('CLÁUSULA 99. X\nNuevo');
  expect(c3.proposal!.text).not.toMatch(/^#/m);
  const c1 = r.clauses.find(c => c.key === 'c1')!;
  expect(c1.comments[0].text.length).toBe(NOTE_MAX);
  expect(c1.comments[0].text).not.toContain('#');
});

test('transitions: all accepted → acordado; a proposal → cambios_propuestos (owner); owner respond → next round (tercero)', () => {
  expect(nextStatus('tercero', [{ state: 'aceptada' }, { state: 'aceptada' }])).toEqual({ status: 'acordado', turn: null });
  expect(nextStatus('tercero', [{ state: 'aceptada' }, { state: 'propuesta' }])).toEqual({ status: 'cambios_propuestos', turn: 'propietario' });
  expect(nextStatus('propietario', [])).toEqual({ status: 'en_revision', turn: 'tercero' });

  const accepted = applyThirdParty(neg(), { items: acceptRest(['c1', 'c2', 'c3']) }, AT);
  expect(accepted).toMatchObject({ ok: true, status: 'acordado', turn: null, counts: { accepted: 3, proposals: 0, comments: 0 } });

  const r1 = applyThirdParty(neg(), { items: [
    { key: 'c1', action: 'propongo', text: 'Texto 1 nuevo.', reason: 'Plazo' },
    { key: 'c2', action: 'comento', text: '¿Por qué 5 años?' },
    { key: 'c3', action: 'acepto' },
  ] }, AT);
  if (!r1.ok) throw new Error(r1.error);
  expect(r1).toMatchObject({ status: 'cambios_propuestos', turn: 'propietario', counts: { proposals: 1, comments: 1, accepted: 1 } });

  // Owner: reject without a reason → error; counter-propose + reply → round for the third party.
  const after = { ...neg(), status: r1.status, turn: r1.turn, clauses: r1.clauses };
  expect(applyOwnerResponse(after, { decisions: [{ key: 'c1', action: 'rechazar' }] }, AT)).toMatchObject({ ok: false });
  expect(applyOwnerResponse(after, { decisions: [] }, AT)).toMatchObject({ ok: false });
  const o = applyOwnerResponse(after, {
    decisions: [{ key: 'c1', action: 'contrapropuesta', text: 'Texto 1 intermedio.' }],
    replies: [{ key: 'c2', text: 'Es lo estándar.' }],
  }, AT);
  if (!o.ok) throw new Error(o.error);
  expect(o).toMatchObject({ status: 'en_revision', turn: 'tercero', changed: ['c1'] });
  expect(o.clauses.find(c => c.key === 'c1')).toMatchObject({ current: 'Texto 1 intermedio.', state: 'pendiente' });
  expect(o.clauses.find(c => c.key === 'c2')!.comments.map(k => k.by)).toEqual(['tercero', 'propietario']);
  expect(o.clauses.find(c => c.key === 'c3')!.state).toBe('aceptada');

  // Round 2: accepting the two reopened clauses agrees the whole document.
  const r2 = applyThirdParty({ ...after, status: o.status, turn: o.turn, clauses: o.clauses, round: 2 }, { items: acceptRest(['c1', 'c2']) }, AT);
  expect(r2).toMatchObject({ ok: true, status: 'acordado' });

  // Owner accepts their wording → resuelta, counted as accepted when the third party confirms.
  const o2 = applyOwnerResponse(after, { decisions: [{ key: 'c1', action: 'aceptar' }] }, AT);
  if (!o2.ok) throw new Error(o2.error);
  expect(o2.clauses.find(c => c.key === 'c1')).toMatchObject({ current: 'Texto 1 nuevo.', state: 'resuelta' });
  const r3 = applyThirdParty({ ...after, status: o2.status, turn: o2.turn, clauses: o2.clauses, round: 2 }, { items: acceptRest(['c2']) }, AT);
  expect(r3).toMatchObject({ ok: true, status: 'acordado' });
});

test('expired, revoked, closed or agreed links show no clauses and reject submissions', () => {
  const past = '2026-11-01T00:00:00.000Z';
  expect(effectiveStatus({ status: 'en_revision', expiresAt: past }, new Date(AT))).toBe('caducada');
  for (const [status, expiresAt, expected] of [
    ['en_revision', past, 'caducada'], ['revocada', '2099-01-01', 'revocada'], ['cerrada', '2099-01-01', 'cerrada'],
    ['acordado', '2099-01-01', 'acordado'], ['cambios_propuestos', '2099-01-01', 'no_es_tu_turno'],
  ] as const) {
    const s = linkState({ status, expiresAt }, new Date(AT));
    expect(s).toBe(expected);
    expect(linkShowsClauses(s)).toBe(false);
    const r = applyThirdParty(neg({ status, expiresAt, turn: status === 'cambios_propuestos' ? 'propietario' : status === 'en_revision' ? 'tercero' : null }), { acceptAll: true }, AT);
    expect(r).toMatchObject({ ok: false, code: 'turn' });
  }
  expect(linkShowsClauses(linkState({ status: 'en_revision', expiresAt: '2099-01-01' }, new Date(AT)))).toBe(true);
});

// ── diff.ts ─────────────────────────────────────────────────────────

test('wordDiff detects changed words; identical text has no changes', () => {
  const d = wordDiff('El plazo es de cinco años.', 'El plazo es de tres años.');
  expect(d.filter(p => p.type === 'del').map(p => p.text.trim())).toEqual(['cinco']);
  expect(d.filter(p => p.type === 'add').map(p => p.text.trim())).toEqual(['tres']);
  expect(d.filter(p => p.type !== 'add').map(p => p.text).join('')).toBe('El plazo es de cinco años.');
  expect(d.filter(p => p.type !== 'del').map(p => p.text).join('')).toBe('El plazo es de tres años.');
  expect(hasChanges(d)).toBe(true);
  expect(hasChanges(wordDiff('igual', 'igual'))).toBe(false);
  expect(wordDiff('', '')).toEqual([]);
});

// ── signature gate ──────────────────────────────────────────────────

test('canSendForSignature: draft in negotiation → false; agreed final → true; no negotiation → unchanged', () => {
  const doc = { type: 'doc', source: 'generated' };
  expect(canSendForSignature({ ...doc, negotiation: { id: 'n', status: 'en_revision', role: 'draft' } })).toBe(false);
  expect(canSendForSignature({ ...doc, negotiation: { id: 'n', status: 'acordado', role: 'draft' } })).toBe(false);
  expect(canSendForSignature({ ...doc, negotiation: { id: 'n', status: 'revocada', role: 'final' } })).toBe(false);
  expect(canSendForSignature({ ...doc, negotiation: { id: 'n', status: 'acordado', role: 'final' } })).toBe(true);
  expect(canSendForSignature(doc)).toBe(true);
  expect(canSendForSignature({ ...doc, negotiation: null })).toBe(true);
  expect(canSendForSignature({ type: 'pdf', source: 'generated' })).toBe(false);
  expect(negotiationAllowsSignature(undefined)).toBe(true);
});

// ── notifications and emails ────────────────────────────────────────

test('notification builder: titles and counts per event', () => {
  const base = { negotiationId: 'n1', counterpartyName: 'Juan Pérez', company: 'Acme S.L.', round: 2, version: 3 };
  const s = negotiationNotification({ ...base, event: 'submitted', proposals: 2, comments: 1, focus: 'c4' });
  expect(s).toMatchObject({
    type: 'nda_negotiation', event: 'submitted', proposals: 2, comments: 1, url: '/negociaciones/n1?clausula=c4',
    title: 'Juan Pérez revisó el NDA de Acme S.L.', body: '2 cambios propuestos · 1 comentario · Ronda 2',
  });
  expect(negotiationNotification({ ...base, event: 'accepted' }).title).toBe('Juan Pérez aceptó la versión 3 · lista para firmar');
  expect(negotiationNotification({ ...base, event: 'opened' }).severity).toBe('low');
  expect(negotiationNotification({ ...base, event: 'expiring' }).title).toBe('El enlace caduca en 2 días');
});

test('emails: invitation / new round to the other party, proposals / accepted to the owner', () => {
  const inv = counterpartyEmail({ ownerCompany: 'MOBIFORWORK S.L.', ownerName: 'Félix <b>', ownerEmail: 'f@m.es', counterpartyName: 'Juan', title: 'NDA', round: 1, link: 'https://x/negociacion/t', expiresAt: '2026-12-03T00:00:00Z' });
  expect(inv.subject).toBe('MOBIFORWORK S.L. te envía un borrador de NDA para revisar');
  expect(inv.html).toContain('Revisar el borrador');
  expect(inv.html).toContain('Félix &lt;b&gt;');
  expect(counterpartyEmail({ ownerCompany: 'M', ownerName: 'F', counterpartyName: 'J', title: 'NDA', round: 2, link: 'l', expiresAt: '2026-12-03T00:00:00Z', changes: 2 }).subject).toContain('ronda 2');
  const own = ownerEmail({ event: 'submitted', counterpartyName: 'Juan', company: 'Acme', title: 'NDA', round: 1, version: 1, proposals: 1, comments: 0, link: 'l' });
  expect(own.html).toContain('Revisar propuestas');
  expect(own.text).toContain('1 cambio propuesto · 0 comentarios');
});

// ── draft mark ──────────────────────────────────────────────────────

test('draft documents read "BORRADOR — NO FIRMAR" (banner + Word footer); others unchanged', () => {
  const draft = buildDocHtml(persona, 'NDA', undefined, undefined, { draft: true });
  const plain = buildDocHtml(persona, 'NDA');
  expect(DRAFT_MARK).toBe('BORRADOR — NO FIRMAR');
  expect(draft).toContain('class="doc-draft"');
  expect((draft.match(/BORRADOR &mdash; NO FIRMAR/g) ?? []).length).toBe(2);
  expect(plain).not.toContain('BORRADOR');
  expect(draft.indexOf('doc-draft')).toBeLessThan(draft.indexOf('doc-header">'));
});
