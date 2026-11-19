// Case "Próximos pasos": what to do next with the case's information — mostly which escrito to
// generate (Generación de escritos, prefilled from the case) or what to ask the AI.
// The intake analysis proposes them (AI, sanitised here); cases without them get defaults by type.
// Pure, client-safe. Unit tested.

import { escritoByValue, type DocType } from '@/lib/escritos-catalog';

export interface NextStep {
  titulo: string;
  detalle: string;
  /** Generación de escritos type (escritos-catalog value) to generate for this step, if any. */
  escrito?: string | null;
  urgente?: boolean;
}

export const NEXT_STEPS_MAX = 5;

const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Sanitise the AI's proposal: known escrito types only, short texts, at most 5 steps. */
export function sanitizeNextSteps(raw: unknown): NextStep[] {
  if (!Array.isArray(raw)) return [];
  const out: NextStep[] = [];
  for (const r of raw) {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const titulo = text(o.titulo, 120);
    if (!titulo) continue;
    const escrito = typeof o.escrito === 'string' && escritoByValue(o.escrito) ? o.escrito : null;
    out.push({ titulo, detalle: text(o.detalle, 400), escrito, urgente: o.urgente === true });
    if (out.length >= NEXT_STEPS_MAX) break;
  }
  return out;
}

/** Escrito types the intake prompt may propose ("value: label"), for the system prompt. */
export function escritoOptionsForPrompt(types: DocType[]): string {
  return types.map(t => `${t.value} (${t.label})`).join(', ');
}

const BY_TYPE: Record<string, NextStep[]> = {
  civil: [
    { titulo: 'Preparar la demanda', detalle: 'Redacta la demanda con los hechos y documentos del caso.', escrito: 'demanda_civil' },
    { titulo: 'Valorar medidas cautelares', detalle: 'Si hay riesgo de que el resultado del juicio no se pueda cumplir.', escrito: 'medidas_cautelares' },
  ],
  laboral: [
    { titulo: 'Papeleta de conciliación previa', detalle: 'Requisito previo a la demanda en la mayoría de reclamaciones laborales.', escrito: 'conciliacion_previa' },
    { titulo: 'Reclamación de cantidad', detalle: 'Si se deben salarios, horas extra u otras cantidades.', escrito: 'reclamacion_cantidad' },
    { titulo: 'Demanda laboral', detalle: 'Si la conciliación no prospera.', escrito: 'demanda_laboral' },
  ],
  contractual: [
    { titulo: 'Requerimiento o reclamación extrajudicial', detalle: 'Antes de demandar, reclama por escrito el cumplimiento o el pago.', escrito: null },
    { titulo: 'Demanda por incumplimiento', detalle: 'Si el requerimiento no da resultado.', escrito: 'demanda_civil' },
  ],
  familia: [
    { titulo: 'Preparar la demanda', detalle: 'Medidas, custodia o pensiones según los documentos del caso.', escrito: 'demanda_civil' },
    { titulo: 'Valorar medidas provisionales', detalle: 'Si hace falta regular la situación mientras dura el proceso.', escrito: 'medidas_cautelares' },
  ],
  penal: [
    { titulo: 'Denuncia', detalle: 'Pon los hechos en conocimiento de la policía o el juzgado.', escrito: 'denuncia_penal' },
    { titulo: 'Querella', detalle: 'Si quieres personarte como acusación.', escrito: 'querella' },
  ],
  sucesoral: [
    { titulo: 'Reunir la documentación de la herencia', detalle: 'Certificados de defunción, últimas voluntades y testamento.', escrito: null },
    { titulo: 'Demanda de división de herencia', detalle: 'Si los herederos no llegan a un acuerdo.', escrito: 'demanda_civil' },
  ],
};

const GENERIC: NextStep[] = [
  { titulo: 'Revisar los documentos con la IA', detalle: 'Pide un análisis de riesgos y de los plazos que aplican.', escrito: null },
  { titulo: 'Escrito de alegaciones', detalle: 'Si hay un procedimiento abierto en el que presentar alegaciones.', escrito: 'escrito_alegaciones' },
];

/** The case's next steps: the analysis's own, else defaults by case type. */
export function nextStepsFor(c: { type?: string; assessment?: { proximosPasos?: unknown } | null }): { steps: NextStep[]; fromAnalysis: boolean } {
  const own = sanitizeNextSteps(c.assessment?.proximosPasos);
  if (own.length) return { steps: own, fromAnalysis: true };
  return { steps: BY_TYPE[c.type ?? ''] ?? GENERIC, fromAnalysis: false };
}

/** Link to Generación de escritos with the escrito chosen and the case's data prefilled. */
export const generateHref = (escrito: string, caseId: string) =>
  `/tools/generacion?tipo=${encodeURIComponent(escrito)}&caseId=${encodeURIComponent(caseId)}`;

/** Prompt for "Preguntar a la IA" on a step. */
export const askPrompt = (s: NextStep) =>
  `Próximo paso del caso: «${s.titulo}». ${s.detalle} ¿Cómo lo hago con la información y los documentos del caso? Indica plazos, requisitos y riesgos.`;
