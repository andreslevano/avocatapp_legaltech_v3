// Design tokens v3 — single source of truth for Avocat brand system
// Mirrors tailwind.config.js + globals.css — use in non-Tailwind contexts (charts, canvas, PDF)

export const colors = {
  // Brand palette
  avocatBlack:   '#1e1e1e',
  avocatCream:   '#F9F4EA',
  avocatGold:    '#B8882A',
  avocatGoldL:   '#E8C97A',
  avocatGoldBg:  '#FDF3DC',
  avocatBorder:  '#C8C0B0',
  avocatMuted:   '#EDE8DE',
  avocatGray5:   '#5f5f5f',
  avocatGray9:   '#9a9a9a',

  // Dark surface (app shell)
  dsBg:     '#161410',
  dsCard:   '#1e1c16',
  dsCard2:  '#252218',
  dsBorder: '#2e2b20',
  dsText:   '#c8c0ac',
  dsHead:   '#e8d4a0',

  // Semantic
  textPrimary:   '#1e1e1e',
  textSecondary: '#5f5f5f',
  textOnDark:    '#F9F4EA',
} as const;

export const fonts = {
  display: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
  sans:    '"DM Sans", system-ui, sans-serif',
} as const;

export const fontSizes = {
  h1:    '40px',
  h2:    '28px',
  h3:    '20px',
  body:  '16px',
  small: '13px',
  label: '11px',
} as const;

export const lineHeights = {
  h1:    1.15,
  h2:    1.25,
  h3:    1.35,
  body:  1.6,
  small: 1.45,
  label: 1.4,
} as const;

export const radii = {
  xs:  '4px',
  sm:  '6px',
  md:  '8px',
  lg:  '12px',
  xl:  '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  card:     '0 1px 3px rgba(30,28,22,0.08), 0 4px 16px rgba(30,28,22,0.04)',
  elevated: '0 8px 32px rgba(30,28,22,0.12)',
  gold:     '0 0 0 2px #B8882A',
} as const;

// Chart.js palette — consistent with brand
export const chartColors = {
  gold:    colors.avocatGold,
  goldL:   colors.avocatGoldL,
  dark:    colors.avocatBlack,
  muted:   colors.avocatBorder,
  cream:   colors.avocatCream,
  gray:    colors.avocatGray5,
} as const;

export type ColorToken = keyof typeof colors;
export type FontToken = keyof typeof fonts;
