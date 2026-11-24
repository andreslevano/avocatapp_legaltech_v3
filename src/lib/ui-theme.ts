// App appearance: Oscuro · Claro · Automático (follows the device). Default dark (unchanged for
// everyone until they choose). Stored on the account (users/{uid}.uiTheme, synced across devices)
// and mirrored in localStorage so the shell paints the right theme before the account loads.
// Only the private area: public pages stay light; documents, previews and signing stay white.
// Note: sign-up writes preferences.theme='light' but the app never used it — not read here.

export type UiTheme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const UI_THEMES: UiTheme[] = ['dark', 'light', 'system'];
export const UI_THEME_LABEL: Record<UiTheme, string> = { dark: 'Oscuro', light: 'Claro', system: 'Automático' };
export const DEFAULT_UI_THEME: UiTheme = 'dark';

export const isUiTheme = (v: unknown): v is UiTheme => v === 'dark' || v === 'light' || v === 'system';

export function resolveTheme(pref: UiTheme, prefersDark: boolean): ResolvedTheme {
  return pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref;
}

const KEY = 'avocat.uiTheme';
export function readLocalTheme(): UiTheme | null {
  try { const v = localStorage.getItem(KEY); return isUiTheme(v) ? v : null; } catch { return null; }
}
export function writeLocalTheme(t: UiTheme) {
  try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
}
