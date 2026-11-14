// Document branding ("Identidad de marca"): logo, header colours and font applied to every
// document Avocat generates (Word, PDF, preview, DocuSign, server PDF/DOCX).
// Pure and client/server safe — the single source for types, defaults, fonts and validation.
//
// Ownership: `resolveBranding(owner)` takes ANY document with a `branding` field. Today that is
// users/{uid}; a future "Empresa" space plugs in as resolveBranding(empresaDoc ?? userDoc) without
// changing callers.

import { primitives } from '@/lib/tokens';

// ── Fonts ─────────────────────────────────────────────────────────────────────

export const FONT_IDS = ['eb-garamond', 'times', 'georgia', 'arial', 'calibri', 'dm-sans', 'lato'] as const;
export type FontId = typeof FONT_IDS[number];

export interface FontDef {
  id: FontId;
  label: string;
  group: 'serif' | 'sans';
  /** CSS font-family stack. Always ends in a web-safe family + generic. */
  css: string;
  /** Web-safe part of the stack (used where web fonts can't load, e.g. DocuSign if it drops them). */
  safeCss: string;
  /** Google Fonts css2 `family=` value for browser outputs (preview, PDF). */
  google?: string;
  /** Shown under the selector: what Word does with this font. */
  wordNote?: string;
  /** pdfkit: bundled OFL TTFs under public/fonts, else the standard PDF font. */
  pdfkit: { files?: { regular: string; bold: string; italic: string }; standard: 'Times' | 'Helvetica' };
}

const SERIF_SAFE = "'Times New Roman', Times, serif";
const SANS_SAFE = 'Arial, Helvetica, sans-serif';
const G_WEIGHTS = ':ital,wght@0,400;0,700;1,400';

export const FONT_CATALOG: Record<FontId, FontDef> = {
  'eb-garamond': {
    id: 'eb-garamond', label: 'EB Garamond', group: 'serif',
    css: `'EB Garamond', Garamond, ${SERIF_SAFE}`, safeCss: `Garamond, ${SERIF_SAFE}`,
    google: `EB+Garamond${G_WEIGHTS}`,
    wordNote: 'En Word se verá en EB Garamond solo si está instalada; si no, en Garamond o Times New Roman.',
    pdfkit: { files: { regular: 'EBGaramond-Regular.ttf', bold: 'EBGaramond-SemiBold.ttf', italic: 'EBGaramond-Italic.ttf' }, standard: 'Times' },
  },
  times: {
    id: 'times', label: 'Times New Roman', group: 'serif',
    css: SERIF_SAFE, safeCss: SERIF_SAFE,
    pdfkit: { standard: 'Times' },
  },
  georgia: {
    id: 'georgia', label: 'Georgia', group: 'serif',
    // Gelasio: OFL, metric-compatible with Georgia (for machines without Georgia, and pdfkit).
    css: `Georgia, Gelasio, ${SERIF_SAFE}`, safeCss: `Georgia, ${SERIF_SAFE}`,
    google: `Gelasio${G_WEIGHTS}`,
    pdfkit: { files: { regular: 'Gelasio-Regular.ttf', bold: 'Gelasio-Bold.ttf', italic: 'Gelasio-Italic.ttf' }, standard: 'Times' },
  },
  arial: {
    id: 'arial', label: 'Arial', group: 'sans',
    css: SANS_SAFE, safeCss: SANS_SAFE,
    pdfkit: { standard: 'Helvetica' },
  },
  calibri: {
    id: 'calibri', label: 'Calibri', group: 'sans',
    // Carlito: OFL, metric-compatible with Calibri.
    css: `Calibri, Carlito, ${SANS_SAFE}`, safeCss: `Calibri, ${SANS_SAFE}`,
    google: `Carlito${G_WEIGHTS}`,
    wordNote: 'Si el equipo no tiene Calibri, Word usará Arial.',
    pdfkit: { files: { regular: 'Carlito-Regular.ttf', bold: 'Carlito-Bold.ttf', italic: 'Carlito-Italic.ttf' }, standard: 'Helvetica' },
  },
  'dm-sans': {
    id: 'dm-sans', label: 'DM Sans', group: 'sans',
    css: `'DM Sans', ${SANS_SAFE}`, safeCss: SANS_SAFE,
    google: `DM+Sans${G_WEIGHTS}`,
    wordNote: 'En Word se verá en DM Sans solo si está instalada; si no, en Arial.',
    pdfkit: { files: { regular: 'DMSans-Regular.ttf', bold: 'DMSans-Bold.ttf', italic: 'DMSans-Italic.ttf' }, standard: 'Helvetica' },
  },
  lato: {
    id: 'lato', label: 'Lato', group: 'sans',
    css: `Lato, ${SANS_SAFE}`, safeCss: SANS_SAFE,
    google: `Lato${G_WEIGHTS}`,
    wordNote: 'En Word se verá en Lato solo si está instalada; si no, en Arial.',
    pdfkit: { files: { regular: 'Lato-Regular.ttf', bold: 'Lato-Bold.ttf', italic: 'Lato-Italic.ttf' }, standard: 'Helvetica' },
  },
};

/** <link> href loading the font from Google Fonts, or null for system fonts. */
export function googleFontsHref(font: FontDef): string | null {
  return font.google ? `https://fonts.googleapis.com/css2?family=${font.google}&display=swap` : null;
}

/** First family of the stack, unquoted — what `document.fonts.load()` needs. */
export function primaryFamily(font: FontDef): string {
  return font.css.split(',')[0].trim().replace(/^'|'$/g, '');
}

// ── Stored shape ─────────────────────────────────────────────────────────────

export type LogoPosition = 'left' | 'right';

export interface Branding {
  logoUrl: string | null;
  logoPath: string | null;
  logoWidth: number;
  logoHeight: number;
  logoPosition: LogoPosition;
  /** primary = company name + header rule; secondary = NIF / date / footer text. */
  colors: { primary: string; secondary: string };
  font: FontId;
  applyColorsToHeadings: boolean;
  updatedAt?: unknown;
}

/** Today's look: documents without branding render exactly as before. */
export const DEFAULT_BRANDING: Branding = {
  logoUrl: null,
  logoPath: null,
  logoWidth: 0,
  logoHeight: 0,
  logoPosition: 'left',
  colors: { primary: '#444444', secondary: '#999999' },
  font: 'times',
  applyColorsToHeadings: false,
};

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MAX_WIDTH_PX = 600;
export const LOGO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
export type LogoMime = keyof typeof LOGO_TYPES;
export const logoStoragePath = (uid: string, ext: string) => `users/${uid}/branding/logo.${ext}`;

export interface ColorPreset { id: string; label: string; primary: string; secondary: string }

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'avocat-tinta', label: 'Avocat tinta', primary: primitives['neutral-900'], secondary: primitives['neutral-500'] },
  { id: 'avocat-oro', label: 'Avocat oro', primary: primitives['gold-700'], secondary: primitives['neutral-600'] },
  { id: 'marino', label: 'Azul marino', primary: '#1f3a5f', secondary: '#5b6b7f' },
  { id: 'verde', label: 'Verde', primary: '#1e5b45', secondary: '#5f6f66' },
  { id: 'burdeos', label: 'Burdeos', primary: '#7a1f2b', secondary: '#6f5f61' },
  { id: 'clasico', label: 'Gris clásico', primary: DEFAULT_BRANDING.colors.primary, secondary: DEFAULT_BRANDING.colors.secondary },
];

// ── Validation ───────────────────────────────────────────────────────────────

const HEX6 = /^#[0-9a-fA-F]{6}$/;
export const isHex6 = (v: unknown): v is string => typeof v === 'string' && HEX6.test(v);
export const isFontId = (v: unknown): v is FontId => typeof v === 'string' && (FONT_IDS as readonly string[]).includes(v);

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Header text on a white page below WCAG AA for normal text → warn (never block). */
export const lowContrastOnWhite = (hex: string) => isHex6(hex) && contrastRatio(hex, '#ffffff') < 4.5;

/** Logo sources a document may embed: our Storage download URLs or an inline raster data URI. */
export function isSafeLogoSrc(src: unknown): src is string {
  if (typeof src !== 'string' || src.length > 3_000_000) return false;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(src)) return true;
  return /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\/[^\s"'<>]+$/.test(src);
}

const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : 0);

/** Whatever is stored (possibly partial / old / tampered) → a valid Branding; bad fields → default. */
export function sanitizeBranding(raw: unknown): Branding {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const colors = (r.colors && typeof r.colors === 'object' ? r.colors : {}) as Record<string, unknown>;
  const logoUrl = isSafeLogoSrc(r.logoUrl) && !String(r.logoUrl).startsWith('data:') ? (r.logoUrl as string) : null;
  return {
    logoUrl,
    logoPath: logoUrl && typeof r.logoPath === 'string' ? r.logoPath : null,
    logoWidth: logoUrl ? num(r.logoWidth, 10_000) : 0,
    logoHeight: logoUrl ? num(r.logoHeight, 10_000) : 0,
    logoPosition: r.logoPosition === 'right' ? 'right' : 'left',
    colors: {
      primary: isHex6(colors.primary) ? colors.primary.toLowerCase() : DEFAULT_BRANDING.colors.primary,
      secondary: isHex6(colors.secondary) ? colors.secondary.toLowerCase() : DEFAULT_BRANDING.colors.secondary,
    },
    font: isFontId(r.font) ? r.font : DEFAULT_BRANDING.font,
    applyColorsToHeadings: r.applyColorsToHeadings === true,
  };
}

/** Same visuals as DEFAULT_BRANDING (logo position alone changes nothing without a logo). */
export function isDefaultBranding(b: Branding): boolean {
  const d = DEFAULT_BRANDING;
  return !b.logoUrl && b.font === d.font && !b.applyColorsToHeadings
    && b.colors.primary === d.colors.primary && b.colors.secondary === d.colors.secondary;
}

// ── Resolution ───────────────────────────────────────────────────────────────

/** Any document that can own branding + header data (users/{uid} today, Empresa later). */
export interface BrandingOwner {
  branding?: unknown;
  legalCompanyName?: unknown;
  legalIdType?: unknown;
  legalIdNumber?: unknown;
  displayName?: unknown;
  name?: unknown;
}

/** An organisation's validated template (MOBIFORWORK NDA / contrato de servicios). */
export interface OrgTemplateContext {
  company: string;
  cif: string;
  /** The generating user belongs to that organisation (orgNdaTemplateFor(user) matched). */
  member: boolean;
}

export interface ResolvedLogo { src: string; width: number; height: number; position: LogoPosition }

export interface ResolvedBranding {
  /** Visuals identical to Avocat's default → buildDocHtml emits exactly the legacy HTML. */
  isDefault: boolean;
  header: { authorName: string; authorNif?: string };
  logo: ResolvedLogo | null;
  primary: string;
  secondary: string;
  /** Heading colour, or null to keep headings black. */
  headingColor: string | null;
  font: FontDef;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Header text for a user's own documents (company name or full name + ID). */
export function ownerHeader(owner: BrandingOwner | null | undefined): ResolvedBranding['header'] {
  const idNo = str(owner?.legalIdNumber);
  return {
    authorName: str(owner?.legalCompanyName) || str(owner?.displayName) || str(owner?.name),
    authorNif: idNo ? `${str(owner?.legalIdType)} ${idNo}`.trim() : undefined,
  };
}

/** Header logo box: max height 18 mm (≈ 68 px at 96 dpi), max width 200 px, aspect kept. */
export const LOGO_BOX = { maxHeight: 68, maxWidth: 200 };

export function fitLogo(width: number, height: number): { width: number; height: number } {
  if (!(width > 0 && height > 0)) return { width: LOGO_BOX.maxWidth, height: LOGO_BOX.maxHeight };
  const scale = Math.min(LOGO_BOX.maxHeight / height, LOGO_BOX.maxWidth / width, 1);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * The branding a document is rendered with.
 *
 * Org-template rule (the ONLY place it lives): an organisation's validated template always shows
 * the organisation's header (company + CIF). The owner's logo/colours/font are applied to it only
 * when the user belongs to that organisation; otherwise the template keeps the default look.
 */
export function resolveBranding(owner: BrandingOwner | null | undefined, org?: OrgTemplateContext | null): ResolvedBranding {
  const stored = sanitizeBranding(owner?.branding);
  const b = org && !org.member ? DEFAULT_BRANDING : stored;
  const header = org ? { authorName: org.company, authorNif: `CIF ${org.cif}` } : ownerHeader(owner);
  const logo = b.logoUrl
    ? { src: b.logoUrl, ...fitLogo(b.logoWidth, b.logoHeight), position: b.logoPosition }
    : null;
  return {
    isDefault: isDefaultBranding(b),
    header,
    logo,
    primary: b.colors.primary,
    secondary: b.colors.secondary,
    headingColor: b.applyColorsToHeadings ? b.colors.primary : null,
    font: FONT_CATALOG[b.font],
  };
}

/** Same branding with the logo embedded as a data URI (browser PDF / DocuSign). */
export function withLogoSrc(r: ResolvedBranding, src: string | null | undefined): ResolvedBranding {
  if (!r.logo || !src || !isSafeLogoSrc(src)) return r;
  return { ...r, logo: { ...r.logo, src } };
}

/** For outputs where web fonts can't load: keep only the web-safe part of the stack. */
export function withSafeFont(r: ResolvedBranding): ResolvedBranding {
  return { ...r, font: { ...r.font, css: r.font.safeCss, google: undefined } };
}
