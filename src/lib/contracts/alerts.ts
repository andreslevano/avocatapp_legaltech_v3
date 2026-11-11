// Expiry alerts (F3): which alert is due for a contract today, its text, and the daily digest.
// Pure — unit tested. The scan (server-alerts.ts) makes each alert idempotent via
// contract_alerts/{contractId}_{dateKind}_{threshold}.

import { daysBetween, formatContractDate } from './dates';
import type { Contract, DateKind } from './types';
import { OPEN_LIFECYCLES } from './types';
import { fonts, primitives as P } from '@/lib/tokens';

// Email clients can't load web fonts reliably: DM Sans when installed, else the system UI font.
const EMAIL_FONT = fonts.sans.replace(/"/g, "'");

export interface NotificationPrefs {
  thresholds: number[];     // days before the date, e.g. [90, 30, 7, 0]
  email: boolean;           // daily digest
  digestHour: number;       // 0–23, Madrid time
}

export const DEFAULT_PREFS: NotificationPrefs = { thresholds: [90, 30, 7, 0], email: true, digestHour: 8 };
export const THRESHOLD_CHOICES = [90, 60, 30, 14, 7, 1, 0];

/** users/{uid}.notificationPrefs (written by the profile page) → safe prefs. */
export function normalizePrefs(raw: unknown): NotificationPrefs {
  const r = (raw ?? {}) as Partial<Record<keyof NotificationPrefs, unknown>>;
  const thresholds = Array.isArray(r.thresholds)
    ? [...new Set(r.thresholds.filter((n): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 365))].sort((a, b) => b - a)
    : DEFAULT_PREFS.thresholds;
  return {
    thresholds: thresholds.length ? thresholds.slice(0, 8) : DEFAULT_PREFS.thresholds,
    email: typeof r.email === 'boolean' ? r.email : DEFAULT_PREFS.email,
    digestHour: Number.isInteger(r.digestHour) && (r.digestHour as number) >= 0 && (r.digestHour as number) <= 23
      ? r.digestHour as number : DEFAULT_PREFS.digestHour,
  };
}

export type AlertSeverity = 'high' | 'medium' | 'low';

export interface DueAlert {
  key: string;                // contract_alerts doc id
  kind: DateKind;
  threshold: number;
  dueDate: string;
  daysLeft: number;
  severity: AlertSeverity;
}

/** A missed day (job down) still alerts on the date itself for this many days after. */
export const OVERDUE_GRACE_DAYS = 7;

/**
 * Alerts due today. Only the current band fires: a contract created 20 days before its end gets
 * the 30-day alert, not the 90-day one too. Thresholds already sent are skipped by the caller.
 */
export function dueAlerts(
  c: Pick<Contract, 'id' | 'dates' | 'term' | 'lifecycle' | 'confirmedByUser' | 'snoozedUntil' | 'alertsMuted'>,
  today: string, thresholds: number[],
): DueAlert[] {
  if (!c.confirmedByUser || c.alertsMuted || !OPEN_LIFECYCLES.includes(c.lifecycle)) return [];
  if (c.snoozedUntil && c.snoozedUntil > today) return [];
  const ts = [...thresholds].sort((a, b) => a - b);
  const out: DueAlert[] = [];
  const kinds: DateKind[] = ['noticeDeadline', 'termEndDate', 'confidentialitySurvivalEnd'];
  for (const kind of kinds) {
    if (kind === 'noticeDeadline' && !c.term?.autoRenewal) continue;
    const date = c.dates?.[kind];
    if (!date) continue;
    const daysLeft = daysBetween(today, date);
    let threshold: number | undefined;
    if (daysLeft >= 0) threshold = ts.find(t => daysLeft <= t);
    else if (daysLeft >= -OVERDUE_GRACE_DAYS && ts.includes(0)) threshold = 0;
    if (threshold === undefined) continue;
    out.push({
      key: `${c.id}_${kind}_${threshold}`, kind, threshold, dueDate: date, daysLeft,
      severity: daysLeft <= 7 ? 'high' : daysLeft <= 30 ? 'medium' : 'low',
    });
  }
  return out;
}

const when = (days: number) =>
  days < -1 ? `hace ${-days} días` : days === -1 ? 'ayer' : days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;

/** Spanish title + body for one alert. */
export function alertText(title: string, typeLabel: string, a: Pick<DueAlert, 'kind' | 'daysLeft' | 'dueDate'>): { title: string; body: string } {
  const what = `${typeLabel} «${title}»`;
  const date = formatContractDate(a.dueDate);
  const past = a.daysLeft < 0;
  switch (a.kind) {
    case 'noticeDeadline':
      return {
        title: past ? `Pasó el plazo de preaviso de ${what}` : `Último día de preaviso de ${what} ${when(a.daysLeft)}`,
        body: past
          ? `El plazo para comunicar la no renovación terminó el ${date}; el acuerdo se renueva automáticamente.`
          : `Si no quieres que se renueve automáticamente, comunícalo antes del ${date}.`,
      };
    case 'confidentialitySurvivalEnd':
      return {
        title: past ? `Terminó la obligación de confidencialidad de ${what}` : `La confidencialidad de ${what} termina ${when(a.daysLeft)}`,
        body: `Las obligaciones de confidencialidad que sobreviven al acuerdo terminan el ${date}.`,
      };
    default:
      return {
        title: past ? `${what} venció ${when(a.daysLeft)}` : a.daysLeft === 0 ? `${what} vence hoy` : `${what} vence ${when(a.daysLeft)}`,
        body: past ? `El acuerdo terminó el ${date}. Renuévalo o márcalo como terminado.` : `El acuerdo termina el ${date}.`,
      };
  }
}

export interface DigestItem { title: string; body: string; dueDate: string; severity: AlertSeverity }

const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

/** One grouped email per user per day. */
export function buildDigest(items: DigestItem[], appUrl: string): { subject: string; text: string; html: string } {
  const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const subject = sorted.length === 1
    ? `Avocat · ${sorted[0].title}`
    : `Avocat · ${sorted.length} avisos de vencimiento de contratos`;
  const link = `${appUrl.replace(/\/+$/, '')}/notifications`;
  const text = [
    'Avisos de vencimiento de tus contratos:', '',
    ...sorted.map(i => `• ${i.title}\n  ${i.body}`), '',
    `Ver y gestionar los avisos: ${link}`, '',
    'Puedes cambiar los avisos en Perfil → Notificaciones.',
  ].join('\n');
  const dot = (s: AlertSeverity) => (s === 'high' ? P['danger-600'] : s === 'medium' ? P['gold-500'] : P['neutral-500']);
  const html = `<!doctype html><html><body style="margin:0;background:${P['neutral-50']};font-family:${EMAIL_FONT};color:${P['neutral-900']}">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">Avocat</p>
<p style="font-size:14px;margin:0 0 12px">Avisos de vencimiento de tus contratos:</p>
${sorted.map(i => `<div style="background:${P['neutral-0']};border:1px solid ${P['neutral-300']};border-radius:8px;padding:12px 14px;margin:0 0 8px">
<p style="margin:0;font-size:14px;font-weight:bold"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${dot(i.severity)};margin-right:6px"></span>${esc(i.title)}</p>
<p style="margin:4px 0 0;font-size:13px;color:${P['neutral-600']}">${esc(i.body)}</p></div>`).join('\n')}
<p style="margin:16px 0"><a href="${esc(link)}" style="background:${P['gold-500']};color:${P['neutral-900']};text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Ver avisos</a></p>
<p style="font-size:12px;color:${P['neutral-500']}">Puedes cambiar los avisos en Perfil → Notificaciones.</p>
</div></body></html>`;
  return { subject, text, html };
}
