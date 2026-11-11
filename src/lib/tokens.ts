// Avocat Design System v4 — generated from tokens.json. For non-Tailwind contexts (Chart.js, canvas, PDF, email).
// In React/Tailwind use classes (bg-surface, text-text-muted); never import hex into className.

export const primitives = {
  'gold-50': '#fdf3dc',
  'gold-100': '#f8e8c2',
  'gold-200': '#e8d4a0',
  'gold-300': '#e8c97a',
  'gold-400': '#d2a54a',
  'gold-500': '#b8882a',
  'gold-600': '#a07824',
  'gold-700': '#8c6920',
  'gold-800': '#73561a',
  'gold-900': '#4a370f',
  'gold-950': '#2a2415',
  'neutral-0': '#ffffff',
  'neutral-50': '#f9f4ea',
  'neutral-100': '#ede8de',
  'neutral-200': '#ddd6c8',
  'neutral-300': '#c8c0b0',
  'neutral-400': '#a39985',
  'neutral-500': '#857b6b',
  'neutral-600': '#5e574b',
  'neutral-700': '#3f3a31',
  'neutral-800': '#2e2b20',
  'neutral-850': '#252218',
  'neutral-900': '#1e1c16',
  'neutral-950': '#161410',
  'success-50': '#e5f1e8',
  'success-300': '#8fd0a6',
  'success-600': '#2e7048',
  'success-700': '#235a39',
  'success-950': '#13261a',
  'warning-50': '#fceedc',
  'warning-300': '#f5b871',
  'warning-600': '#a3540a',
  'warning-700': '#844308',
  'warning-950': '#2e1d0a',
  'danger-50': '#fbe8e5',
  'danger-300': '#f4a094',
  'danger-600': '#b3261e',
  'danger-700': '#8e1d17',
  'danger-950': '#321311',
  'info-50': '#e6edf6',
  'info-300': '#9dbde6',
  'info-600': '#2e5c99',
  'info-700': '#234a7d',
  'info-950': '#121f31',
} as const;

export type ThemeId = 'light' | 'dark';

export const themes = {
  light: {
    bg: primitives['neutral-50'],
    surface: primitives['neutral-0'],
    surfaceRaised: primitives['neutral-0'],
    surfaceMuted: primitives['neutral-100'],
    surfaceInverse: primitives['neutral-900'],
    border: primitives['neutral-300'],
    borderStrong: primitives['neutral-500'],
    text: primitives['neutral-900'],
    textHeading: primitives['neutral-900'],
    textMuted: primitives['neutral-600'],
    textInverse: primitives['neutral-50'],
    textOnAccent: primitives['neutral-900'],
    accent: primitives['gold-500'],
    accentHover: primitives['gold-400'],
    accentText: primitives['gold-800'],
    accentSubtle: primitives['gold-50'],
    accentBorder: primitives['gold-300'],
    focus: primitives['gold-700'],
    actionPrimary: primitives['neutral-900'],
    actionPrimaryHover: primitives['neutral-700'],
    onActionPrimary: primitives['neutral-50'],
    danger: primitives['danger-600'],
    onDanger: primitives['neutral-0'],
    dangerText: primitives['danger-700'],
    successText: primitives['success-700'],
    warningText: primitives['warning-700'],
    infoText: primitives['info-700'],
    dangerSubtle: primitives['danger-50'],
    successSubtle: primitives['success-50'],
    warningSubtle: primitives['warning-50'],
    infoSubtle: primitives['info-50'],
    status: {
      'vencido': { bg: primitives['danger-600'], fg: primitives['neutral-0'], border: primitives['danger-600'], icon: 'circle-x' },
      'urgente': { bg: primitives['danger-50'], fg: primitives['danger-700'], border: primitives['danger-300'], icon: 'alarm-clock' },
      'proximo': { bg: primitives['warning-50'], fg: primitives['warning-700'], border: primitives['warning-300'], icon: 'clock' },
      'a-tiempo': { bg: primitives['success-50'], fg: primitives['success-700'], border: primitives['success-300'], icon: 'circle-check' },
      'borrador': { bg: primitives['neutral-100'], fg: primitives['neutral-600'], border: primitives['neutral-300'], icon: 'file-pen-line' },
      'en-revision': { bg: primitives['info-50'], fg: primitives['info-700'], border: primitives['info-300'], icon: 'eye' },
      'presentado': { bg: primitives['gold-50'], fg: primitives['gold-800'], border: primitives['gold-300'], icon: 'send' },
      'pagado': { bg: primitives['success-600'], fg: primitives['neutral-0'], border: primitives['success-600'], icon: 'badge-check' },
    },
    chart: [primitives['neutral-900'], primitives['gold-500'], primitives['info-600'], primitives['success-600'], primitives['warning-600'], primitives['neutral-400']],
    chartGrid: primitives['neutral-200'], chartAxis: primitives['neutral-600'],
  },
  dark: {
    bg: primitives['neutral-950'],
    surface: primitives['neutral-900'],
    surfaceRaised: primitives['neutral-850'],
    surfaceMuted: primitives['neutral-850'],
    surfaceInverse: primitives['neutral-50'],
    border: primitives['neutral-800'],
    borderStrong: primitives['neutral-500'],
    text: primitives['neutral-300'],
    textHeading: primitives['gold-200'],
    textMuted: primitives['neutral-400'],
    textInverse: primitives['neutral-900'],
    textOnAccent: primitives['neutral-900'],
    accent: primitives['gold-500'],
    accentHover: primitives['gold-300'],
    accentText: primitives['gold-300'],
    accentSubtle: primitives['gold-950'],
    accentBorder: primitives['gold-800'],
    focus: primitives['gold-300'],
    actionPrimary: primitives['neutral-50'],
    actionPrimaryHover: primitives['neutral-200'],
    onActionPrimary: primitives['neutral-900'],
    danger: primitives['danger-300'],
    onDanger: primitives['neutral-950'],
    dangerText: primitives['danger-300'],
    successText: primitives['success-300'],
    warningText: primitives['warning-300'],
    infoText: primitives['info-300'],
    dangerSubtle: primitives['danger-950'],
    successSubtle: primitives['success-950'],
    warningSubtle: primitives['warning-950'],
    infoSubtle: primitives['info-950'],
    status: {
      'vencido': { bg: primitives['danger-300'], fg: primitives['neutral-950'], border: primitives['danger-300'], icon: 'circle-x' },
      'urgente': { bg: primitives['danger-950'], fg: primitives['danger-300'], border: primitives['danger-700'], icon: 'alarm-clock' },
      'proximo': { bg: primitives['warning-950'], fg: primitives['warning-300'], border: primitives['warning-700'], icon: 'clock' },
      'a-tiempo': { bg: primitives['success-950'], fg: primitives['success-300'], border: primitives['success-700'], icon: 'circle-check' },
      'borrador': { bg: primitives['neutral-850'], fg: primitives['neutral-400'], border: primitives['neutral-700'], icon: 'file-pen-line' },
      'en-revision': { bg: primitives['info-950'], fg: primitives['info-300'], border: primitives['info-700'], icon: 'eye' },
      'presentado': { bg: primitives['gold-950'], fg: primitives['gold-300'], border: primitives['gold-800'], icon: 'send' },
      'pagado': { bg: primitives['success-300'], fg: primitives['neutral-950'], border: primitives['success-300'], icon: 'badge-check' },
    },
    chart: [primitives['gold-300'], primitives['neutral-300'], primitives['info-300'], primitives['success-300'], primitives['warning-300'], primitives['neutral-500']],
    chartGrid: primitives['neutral-800'], chartAxis: primitives['neutral-400'],
  },
} as const;

export type LegalStatus = 'vencido' | 'urgente' | 'proximo' | 'a-tiempo' | 'borrador' | 'en-revision' | 'presentado' | 'pagado';

export const fonts = {
  display: "\"Cormorant Garamond\", \"EB Garamond\", Georgia, serif",
  sans: "\"DM Sans\", system-ui, sans-serif",
  document: "\"EB Garamond\", Garamond, Georgia, serif",
  mono: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace",
} as const;

export const type = {
  display: { family: fonts.display, size: 56, lineHeight: 60, weight: 600, letterSpacing: '-0.02em' },
  h1: { family: fonts.display, size: 40, lineHeight: 46, weight: 600, letterSpacing: '-0.01em' },
  h2: { family: fonts.display, size: 28, lineHeight: 34, weight: 600, letterSpacing: '0' },
  h3: { family: fonts.sans, size: 20, lineHeight: 28, weight: 600, letterSpacing: '0' },
  h4: { family: fonts.sans, size: 16, lineHeight: 24, weight: 600, letterSpacing: '0' },
  bodyLg: { family: fonts.sans, size: 18, lineHeight: 28, weight: 400, letterSpacing: '0' },
  body: { family: fonts.sans, size: 16, lineHeight: 26, weight: 400, letterSpacing: '0' },
  bodySm: { family: fonts.sans, size: 14, lineHeight: 22, weight: 400, letterSpacing: '0' },
  small: { family: fonts.sans, size: 13, lineHeight: 20, weight: 400, letterSpacing: '0' },
  caption: { family: fonts.sans, size: 12, lineHeight: 16, weight: 400, letterSpacing: '0' },
  label: { family: fonts.sans, size: 11, lineHeight: 16, weight: 500, letterSpacing: '0.06em' },
  mono: { family: fonts.mono, size: 13, lineHeight: 20, weight: 400, letterSpacing: '0' },
  docTitle: { family: fonts.document, size: 22, lineHeight: 30, weight: 600, letterSpacing: '0.01em' },
  docHeading: { family: fonts.document, size: 17, lineHeight: 26, weight: 600, letterSpacing: '0' },
  docBody: { family: fonts.document, size: 17, lineHeight: 28, weight: 400, letterSpacing: '0' },
  docNote: { family: fonts.document, size: 14, lineHeight: 20, weight: 400, letterSpacing: '0' },
} as const;

export const space = {'0-5': 2, '1': 4, '1-5': 6, '2': 8, '3': 12, '4': 16, '5': 20, '6': 24, '8': 32, '10': 40, '12': 48, '16': 64, '20': 80, '24': 96} as const;
export const radius = {xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px'} as const;
export const zIndex = {base: 0, raised: 10, sticky: 100, nav: 200, drawer: 300, overlay: 400, modal: 500, popover: 600, toast: 700, tooltip: 800} as const;
export const motion = { fast: 120, base: 180, slow: 280, standard: 'cubic-bezier(0.2, 0, 0, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)' } as const;

/** Chart.js defaults for the active theme. Call once per theme switch. */
export function chartTheme(theme: ThemeId) {
  const t = themes[theme];
  return {
    color: t.chartAxis,
    borderColor: t.chartGrid,
    font: { family: fonts.sans, size: 12 },
    series: t.chart,
    tooltip: { backgroundColor: t.surfaceInverse, titleColor: t.textInverse, bodyColor: t.textInverse },
  };
}

/** Deadline → legal status (single rule; DeadlineList and casos-* pages must use this). */
export function deadlineStatus(daysLeft: number): LegalStatus {
  if (daysLeft < 0) return 'vencido';
  if (daysLeft <= 3) return 'urgente';
  if (daysLeft <= 7) return 'proximo';
  return 'a-tiempo';
}
