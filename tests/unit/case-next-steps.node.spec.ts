// Case "Próximos pasos": sanitising the intake proposal, defaults by case type, links.
import { expect, test } from '@playwright/test';
import { askPrompt, generateHref, nextStepsFor, sanitizeNextSteps, NEXT_STEPS_MAX } from '@/lib/cases/next-steps';

test('sanitizeNextSteps keeps known escrito types only, trims and caps', () => {
  const out = sanitizeNextSteps([
    { titulo: '  Demanda  ejecutiva ', detalle: 'Por el pagaré vencido', escrito: 'demanda_civil', urgente: true },
    { titulo: 'Inventado', escrito: 'escrito_que_no_existe' },
    { titulo: '', escrito: 'querella' },
    'basura', null,
    ...Array.from({ length: 10 }, (_, i) => ({ titulo: `Paso ${i}` })),
  ]);
  expect(out[0]).toEqual({ titulo: 'Demanda ejecutiva', detalle: 'Por el pagaré vencido', escrito: 'demanda_civil', urgente: true });
  expect(out[1]).toMatchObject({ titulo: 'Inventado', escrito: null, urgente: false });
  expect(out).toHaveLength(NEXT_STEPS_MAX);
  expect(sanitizeNextSteps('no')).toEqual([]);
});

test('nextStepsFor: the analysis wins; otherwise defaults by type (generic when unknown)', () => {
  const own = nextStepsFor({ type: 'civil', assessment: { proximosPasos: [{ titulo: 'Requerir el pago', escrito: null }] } });
  expect(own).toMatchObject({ fromAnalysis: true, steps: [{ titulo: 'Requerir el pago' }] });
  const laboral = nextStepsFor({ type: 'laboral' });
  expect(laboral.fromAnalysis).toBe(false);
  expect(laboral.steps.map(s => s.escrito)).toContain('reclamacion_cantidad');
  expect(nextStepsFor({ type: 'otro', assessment: { proximosPasos: [] } }).steps.length).toBeGreaterThan(0);
});

test('links and prompts', () => {
  expect(generateHref('demanda_civil', 'abc 1')).toBe('/tools/generacion?tipo=demanda_civil&caseId=abc%201');
  expect(askPrompt({ titulo: 'Denuncia', detalle: 'Ante la policía.' })).toContain('«Denuncia»');
});
