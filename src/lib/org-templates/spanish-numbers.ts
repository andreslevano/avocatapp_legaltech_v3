// Spanish amounts in words ("treinta y cinco", "mil doscientos") for contract templates. Pure — unit tested.

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function below1000(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 30 ? (r ? UNITS[r] : '') : `${TENS[Math.floor(r / 10)]}${r % 10 ? ` y ${UNITS[r % 10]}` : ''}`;
  return [h ? HUNDREDS[h] : '', rest].filter(Boolean).join(' ');
}

/** Integer 0 … 999 999 999 in Spanish words ("uno" form; use `apocope` for "un"/"veintiún" before a noun). */
export function numberToSpanish(n: number, apocope = false): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new Error('out of range');
  if (n === 0) return 'cero';
  const millions = Math.floor(n / 1_000_000), thousands = Math.floor((n % 1_000_000) / 1000), rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? 'un millón' : `${numberToSpanish(millions, true)} millones`);
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${numberToSpanish(thousands, true)} mil`);
  if (rest) parts.push(below1000(rest));
  let out = parts.join(' ');
  if (apocope) out = out.replace(/veintiuno$/, 'veintiún').replace(/(^|\s)uno$/, '$1un');
  return out;
}

export type Currency = 'USD' | 'EUR';
const CURRENCY_WORDS: Record<Currency, { one: string; many: string; cents: string }> = {
  USD: { one: 'dólar estadounidense', many: 'dólares estadounidenses', cents: 'centavos' },
  EUR: { one: 'euro', many: 'euros', cents: 'céntimos' },
};

/** 35 → "treinta y cinco dólares estadounidenses"; 42.5 → "cuarenta y dos dólares estadounidenses con cincuenta centavos". */
export function amountToSpanish(amount: number, currency: Currency): string {
  const cents = Math.round(amount * 100);
  const whole = Math.floor(cents / 100), frac = cents % 100;
  const w = CURRENCY_WORDS[currency];
  const main = `${numberToSpanish(whole, true)} ${whole === 1 ? w.one : w.many}`;
  return frac ? `${main} con ${numberToSpanish(frac, true)} ${w.cents}` : main;
}

/** "35", "42,50" (Spanish decimal comma, no thousands separator under 10 000). */
export function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? amount.toLocaleString('es-ES') : amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-08-10" → "10 de agosto de 2026" */
export function spanishDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]} de ${m[1]}`;
}
