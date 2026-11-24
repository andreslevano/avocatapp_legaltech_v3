import { expect, test } from '@playwright/test';
import { applyRanking, cleanDigest, cleanPlan, digestToMarkdown, groupThreads, matchContext, parseAddresses, planQuery, stripQuoted } from '@/lib/email/assistant-core';

const plan = cleanPlan({ people: [{ name: 'Pablo Álvarez' }, { email: 'PABLO@Acme.es' }, { name: '' }], topics: ['sostenibilidad', 'piloto CMMS', 42], intent: 'Qué hemos acordado' });

test('plan: people become participants, not words anywhere in the email', () => {
  expect(plan.people).toEqual([{ name: 'Pablo Álvarez' }, { email: 'pablo@acme.es' }]);
  expect(plan.topics).toEqual(['sostenibilidad', 'piloto CMMS']);
  expect(planQuery('outlook', plan, { dateFrom: '2026-10-01' }))
    .toBe(`"(participants:'Pablo Álvarez' OR participants:'pablo@acme.es') AND (sostenibilidad OR 'piloto CMMS') AND received>=2026-10-01"`);
  expect(planQuery('gmail', plan)).toBe('{from:"Pablo Álvarez" to:"Pablo Álvarez" cc:"Pablo Álvarez" from:"pablo@acme.es" to:"pablo@acme.es" cc:"pablo@acme.es"} (sostenibilidad OR "piloto CMMS")');
  expect(planQuery('outlook', cleanPlan({}))).toBeNull();
  expect(planQuery('gmail', cleanPlan({}))).toBe('in:inbox');
});

test('ranking and conversations', () => {
  const m = (id: string, threadId: string, subject: string, date: string) => ({ id, threadId, subject, from: '', to: '', date, snippet: '', hasAttachments: false });
  const list = [m('a', 't1', 'RE: Piloto', '2026-11-10T10:00:00Z'), m('b', 't2', 'Newsletter', '2026-11-12T10:00:00Z'), m('c', 't1', 'Piloto', '2026-11-01T10:00:00Z')];
  const r = applyRanking(list, [{ i: 0, score: 90, reason: 'Pablo propone fechas' }, { i: 1, score: 5, reason: 'Solo en CC' }, { i: 9, score: 100 }]);
  expect(r.map(x => x.id)).toEqual(['a', 'c', 'b']);
  expect(r[0].reason).toBe('Pablo propone fechas');
  const t = groupThreads(r);
  expect(t.map(x => [x.threadId, x.subject, x.emails.length, x.score])).toEqual([['t1', 'Piloto', 2, 90], ['t2', 'Newsletter', 1, 5]]);
});

test('quoted replies are removed', () => {
  const body = 'Hola Pablo,\nTe confirmo el viernes.\n\nEl lun, 10 nov 2026 a las 10:00, Pablo <p@x.es> escribió:\n> propuesta anterior\n> más texto';
  expect(stripQuoted(body)).toBe('Hola Pablo,\nTe confirmo el viernes.');
  expect(stripQuoted('Ok\n\nDe: Ana\nEnviado: lunes\nAsunto: x\ncuerpo viejo')).toBe('Ok');
});

test('digest sanitising and the report markdown', () => {
  const d = cleanDigest({ resumen: 'Se acuerda un piloto.', puntosAtencion: [{ texto: 'Plazo corto', fuentes: [1, 7, 'x'] }], fechas: [{ fecha: '2026-12-01', que: 'Inicio piloto', fuentes: [2] }], acciones: [{ quien: 'Andrés', que: 'Enviar NDA', cuando: 'esta semana', fuentes: [1] }], temas: ['Piloto'] }, 2);
  expect(d.puntosAtencion[0].fuentes).toEqual([1]);
  const md = digestToMarkdown(d, { purpose: 'Acuerdos con Pablo', account: 'a@mfw.es', sources: [{ n: 1, subject: 'Piloto', from: 'Pablo', date: '10 nov' }, { n: 2, subject: 'RE', from: 'Ana', date: '11 nov' }], generatedAt: new Date('2026-11-24T10:00:00Z') });
  expect(md).toContain('# INFORME DE REVISIÓN DE EMAILS');
  expect(md).toContain('## Puntos de atención');
  expect(md).toContain('- Plazo corto *(email 1)*');
  expect(md).toContain('- **Andrés**: Enviar NDA (esta semana) *(email 1)*');
  expect(md).toContain('1. Piloto — Pablo (10 nov)');
  expect(md).not.toContain('## Importes');
});

test('addresses and matching against Avocat data', () => {
  expect(parseAddresses('"Álvarez, Pablo" <Pablo@Acme.es>, ana@gmail.com, bad')).toEqual([{ name: 'Álvarez, Pablo', email: 'pablo@acme.es' }, { name: 'ana@gmail.com', email: 'ana@gmail.com' }]);
  const s = matchContext({
    participants: [{ name: 'Pablo Álvarez', email: 'pablo@acme.es' }, { name: 'Andrés', email: 'andres@mobilityforwork.es' }, { name: 'Luis Nuevo', email: 'luis@nuevo-sa.com' }, { name: 'Ana', email: 'ana@gmail.com' }],
    organizations: ['Banco del Estado'],
    own: { emails: ['andres@mobilityforwork.es'], domain: 'mobilityforwork.es' },
    clients: [{ id: 'c1', name: 'Juan', company: 'Acme S.L.', email: 'juan@acme.es' }, { id: 'c2', name: 'Banco del Estado de Chile', email: 'x@bancoestado.cl' }],
    cases: [{ id: 'k1', title: 'Piloto Acme', client: 'Acme S.L.', clientId: 'c1', status: 'active' }, { id: 'k2', title: 'Otro', clientId: 'c9', status: 'active' }],
    records: [{ id: 'n1', kind: 'negotiation', title: 'NDA Acme', emails: ['pablo@acme.es'], href: '/negociaciones/n1' }],
  });
  const kinds = s.map(x => `${x.type}:${'clientId' in x ? x.clientId : 'caseId' in x ? x.caseId : 'id' in x ? x.id : x.email}`);
  expect(kinds).toEqual(expect.arrayContaining(['client:c1', 'client:c2', 'case:k1', 'record:n1', 'new_client:luis@nuevo-sa.com', 'new_client:ana@gmail.com']));
  expect(kinds).not.toContain('new_client:pablo@acme.es');             // same domain as client c1
  expect(kinds).not.toContain('new_client:andres@mobilityforwork.es');  // the user
  expect(kinds).not.toContain('case:k2');
  expect(s.find(x => x.type === 'client' && x.clientId === 'c1')!.reason).toContain('@acme.es');
});

test('model JSON: fenced, wrapped in prose, and truncated answers', async () => {
  const { parseJsonLoose } = await import('@/lib/email/assistant-core');
  expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  expect(parseJsonLoose('Aquí tienes: [{"i":0}] ¡listo!')).toEqual([{ i: 0 }]);
  // Cut off mid-string inside the 3rd list item: keeps the complete parts.
  const cut = '{"resumen":"R","temas":["a","b"],"puntosAtencion":[{"texto":"uno","fuentes":[1]},{"texto":"dos","fuentes":[2]},{"texto":"tr';
  expect(parseJsonLoose(cut)).toEqual({ resumen: 'R', temas: ['a', 'b'], puntosAtencion: [{ texto: 'uno', fuentes: [1] }, { texto: 'dos', fuentes: [2] }] });
  expect(parseJsonLoose('{"resumen":"con } y ] dentro","x":[1,2')).toEqual({ resumen: 'con } y ] dentro', x: [1] }); // the last value may be cut off: dropped
  expect(parseJsonLoose('sin json')).toBeNull();
});
