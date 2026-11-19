// NDA negotiation — owner notifications (bell / Avisos) and emails. Pure, unit tested.
import { esc, layout } from '@/lib/data-requests/emails';
import { formatContractDate } from '@/lib/contracts/dates';

export type NegotiationEvent = 'submitted' | 'accepted' | 'opened' | 'expiring';

export interface NotificationInput {
  event: NegotiationEvent;
  negotiationId: string;
  counterpartyName: string;
  /** The other party's company, or the document title when they sign as a person. */
  company: string;
  round: number;
  version: number;
  proposals?: number;
  comments?: number;
  /** First clause awaiting an answer ("c4"): the page opens on it. */
  focus?: string | null;
}

export interface NegotiationNotification {
  type: 'nda_negotiation';
  negotiationId: string;
  event: NegotiationEvent;
  title: string;
  body: string;
  url: string;
  severity: 'high' | 'medium' | 'low';
  proposals: number;
  comments: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const negotiationUrl = (id: string, focus?: string | null) =>
  `/negociaciones/${encodeURIComponent(id)}${focus ? `?clausula=${encodeURIComponent(focus)}` : ''}`;

export function negotiationNotification(o: NotificationInput): NegotiationNotification {
  const proposals = o.proposals ?? 0, comments = o.comments ?? 0;
  const base = { type: 'nda_negotiation' as const, negotiationId: o.negotiationId, event: o.event, proposals, comments, url: negotiationUrl(o.negotiationId, o.focus) };
  switch (o.event) {
    case 'submitted':
      return {
        ...base, severity: 'medium',
        title: `${o.counterpartyName} revisó el NDA de ${o.company}`,
        body: `${plural(proposals, 'cambio propuesto', 'cambios propuestos')} · ${plural(comments, 'comentario', 'comentarios')} · Ronda ${o.round}`,
      };
    case 'accepted':
      return { ...base, severity: 'medium', title: `${o.counterpartyName} aceptó la versión ${o.version} · lista para firmar`, body: `NDA de ${o.company} · acordado en la ronda ${o.round}.` };
    case 'opened':
      return { ...base, severity: 'low', title: `${o.counterpartyName} abrió el borrador del NDA`, body: `NDA de ${o.company} · ronda ${o.round}.` };
    case 'expiring':
      return { ...base, severity: 'low', title: 'El enlace caduca en 2 días', body: `${o.counterpartyName} aún no ha revisado el NDA de ${o.company}. Puedes reenviarlo.` };
  }
}

// ── Emails ──────────────────────────────────────────────────────────

/** To the other party: invitation (round 1) or a new round. */
export function counterpartyEmail(o: {
  ownerCompany: string; ownerName: string; ownerEmail?: string | null; counterpartyName: string; title: string;
  round: number; link: string; expiresAt: string; changes?: number;
}) {
  const expires = formatContractDate(o.expiresAt.slice(0, 10));
  const first = o.round <= 1;
  const subject = first
    ? `${o.ownerCompany} te envía un borrador de NDA para revisar`
    : `${o.ownerCompany} ha respondido a tu propuesta · ronda ${o.round}`;
  const intro = first
    ? `${o.ownerCompany} te ha enviado el borrador de «${o.title}» para que lo revises antes de firmarlo.`
    : `${o.ownerCompany} ha respondido a tu propuesta sobre «${o.title}»${o.changes ? ` (${plural(o.changes, 'cláusula cambiada', 'cláusulas cambiadas')})` : ''}.`;
  const how = 'Puedes aceptar cada cláusula, proponer otra redacción o dejar un comentario. Nada se firma hasta que las dos partes estéis de acuerdo.';
  const contact = o.ownerEmail ? ` Si tienes dudas, escribe a ${o.ownerEmail}.` : '';
  const text = [
    `Hola, ${o.counterpartyName}:`, '', intro, how, '',
    `Revisar el borrador: ${o.link}`, '',
    `El enlace caduca el ${expires}. No necesitas crear una cuenta.${contact}`,
    `Enviado con Avocat en nombre de ${o.ownerName}.`,
  ].join('\n');
  const html = layout(
    [`Hola, ${esc(o.counterpartyName)}:`, esc(intro), esc(how)],
    { href: o.link, label: 'Revisar el borrador' },
    `El enlace caduca el ${esc(expires)}. No necesitas crear una cuenta.${esc(contact)}<br>Enviado con Avocat en nombre de ${esc(o.ownerName)}.`,
  );
  return { subject, text, html };
}

/** To the owner: the other party sent a proposal, or accepted the whole version. */
export function ownerEmail(o: {
  event: 'submitted' | 'accepted'; counterpartyName: string; company: string; title: string;
  round: number; version: number; proposals: number; comments: number; link: string;
}) {
  const subject = o.event === 'accepted'
    ? `${o.counterpartyName} aceptó el NDA · listo para firmar`
    : `${o.counterpartyName} revisó el NDA de ${o.company}`;
  const lines = o.event === 'accepted'
    ? [`${o.counterpartyName} aceptó la versión ${o.version} de «${o.title}».`, 'Genera la versión acordada y envíala a firmar desde Avocat.']
    : [
        `${o.counterpartyName} revisó «${o.title}» (ronda ${o.round}).`,
        `${plural(o.proposals, 'cambio propuesto', 'cambios propuestos')} · ${plural(o.comments, 'comentario', 'comentarios')}.`,
      ];
  const label = o.event === 'accepted' ? 'Ver versión acordada' : 'Revisar propuestas';
  const text = [...lines, '', `${label}: ${o.link}`].join('\n');
  const html = layout(lines.map(esc), { href: o.link, label }, 'Recibes este email porque enviaste este NDA a revisión desde Avocat.');
  return { subject, text, html };
}
