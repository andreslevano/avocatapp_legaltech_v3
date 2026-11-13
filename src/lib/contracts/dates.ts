// Contract date computation (F0). Pure — unit tested. Works on calendar dates "YYYY-MM-DD".

import type { ContractDates, ContractTerm, DateKind } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Today in Madrid (alerts run on Spanish office days). */
export function madridToday(now: Date = new Date()): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hour 0–23 in Madrid (digest time). */
export function madridHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(now));
}

const toUtc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * 86_400_000);
}

/** Calendar months, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return fromUtc(target.getTime());
}

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** "2 años", "18 meses", "1 year", "Indefinida…" → term months / indefinite. */
export function parseDuration(text: string | null | undefined): { months: number | null; indefinite: boolean } {
  const t = (text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/indefinid|indefinite|sin plazo|no term/.test(t)) return { months: null, indefinite: true };
  const n = /(\d+(?:[.,]\d+)?)/.exec(t);
  if (!n) return { months: null, indefinite: false };
  const v = Number(n[1].replace(',', '.'));
  if (/\b(ano|anos|year|years)\b/.test(t)) return { months: Math.round(v * 12), indefinite: false };
  if (/\b(mes|meses|month|months)\b/.test(t)) return { months: Math.round(v), indefinite: false };
  return { months: null, indefinite: false };
}

/** Term end, notice deadline and survival end from the effective date and the term. */
export function computeDates(effectiveDate: string | null, term: ContractTerm): ContractDates {
  const eff = isIsoDate(effectiveDate) ? effectiveDate : null;
  let termEndDate: string | null = null;
  if (isIsoDate(term.fixedEndDate)) termEndDate = term.fixedEndDate;
  else if (eff && !term.indefinite && term.months && term.months > 0) termEndDate = addMonths(eff, term.months);

  const noticeDeadline = termEndDate && term.autoRenewal && term.noticeDays && term.noticeDays > 0
    ? addDays(termEndDate, -term.noticeDays) : null;
  const confidentialitySurvivalEnd = termEndDate && term.survivalMonths && term.survivalMonths > 0
    ? addMonths(termEndDate, term.survivalMonths) : null;

  return { effectiveDate: eff, termEndDate, confidentialitySurvivalEnd, noticeDeadline };
}

/**
 * Auto-renewal: once the term end has passed, the contract renews for `renewalMonths` (or the
 * original term) — repeatedly, until the end is today or later. Returns null when nothing rolls.
 */
export function rollForward(dates: ContractDates, term: ContractTerm, today: string): ContractDates | null {
  if (!term.autoRenewal || !dates.termEndDate) return null;
  const step = term.renewalMonths && term.renewalMonths > 0 ? term.renewalMonths : term.months ?? 0;
  if (step <= 0 || dates.termEndDate >= today) return null;
  let end = dates.termEndDate;
  for (let i = 0; i < 1200 && end < today; i++) end = addMonths(end, step);
  return {
    ...dates,
    termEndDate: end,
    noticeDeadline: term.noticeDays && term.noticeDays > 0 ? addDays(end, -term.noticeDays) : null,
    confidentialitySurvivalEnd: term.survivalMonths && term.survivalMonths > 0 ? addMonths(end, term.survivalMonths) : null,
  };
}

/** The next date that matters (for the dashboard and the documents list), today or later. */
export function nextContractEvent(dates: ContractDates, today: string): { kind: DateKind; date: string } | null {
  const order: DateKind[] = ['noticeDeadline', 'termEndDate', 'confidentialitySurvivalEnd'];
  const upcoming = order
    .map(kind => ({ kind, date: dates[kind] }))
    .filter((x): x is { kind: DateKind; date: string } => !!x.date && x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** Days an expired contract stays on "Próximos vencimientos" as "Venció hace N días". */
export const EXPIRED_VISIBLE_DAYS = 30;

/** The most recent date that already passed within `graceDays` (for "Venció hace…" rows). */
export function lastPassedContractEvent(
  dates: ContractDates, today: string, graceDays = EXPIRED_VISIBLE_DAYS,
): { kind: DateKind; date: string } | null {
  const order: DateKind[] = ['noticeDeadline', 'termEndDate', 'confidentialitySurvivalEnd'];
  const passed = order
    .map(kind => ({ kind, date: dates[kind] }))
    .filter((x): x is { kind: DateKind; date: string } => !!x.date && x.date < today && daysBetween(x.date, today) <= graceDays)
    .sort((a, b) => b.date.localeCompare(a.date));
  return passed[0] ?? null;
}

/** "Por vencer" when the term end or the notice deadline falls within this many days. */
export const EXPIRING_WINDOW_DAYS = 30;

/** Lifecycle from the dates. Manual end states (renewed, terminated, superseded) are kept. */
export function lifecycleFor(current: string, dates: ContractDates, today: string): 'active' | 'expiring' | 'expired' | null {
  if (current !== 'active' && current !== 'expiring' && current !== 'expired') return null;
  if (dates.termEndDate && dates.termEndDate < today) return 'expired';
  const soon = [dates.termEndDate, dates.noticeDeadline]
    .some(d => !!d && d >= today && daysBetween(today, d) <= EXPIRING_WINDOW_DAYS);
  return soon ? 'expiring' : 'active';
}

/** "15 nov 2026" */
export function formatContractDate(iso: string | null | undefined): string {
  if (!isIsoDate(iso)) return '—';
  return new Date(toUtc(iso)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
