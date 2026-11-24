'use client';

// The app shell's theme (src/lib/ui-theme.ts). The account's choice wins; until it loads, the copy in
// localStorage; else dark. "Automático" follows prefers-color-scheme live.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_UI_THEME, isUiTheme, readLocalTheme, resolveTheme, writeLocalTheme, type ResolvedTheme, type UiTheme } from '@/lib/ui-theme';

interface Ctx { pref: UiTheme; resolved: ResolvedTheme; setPref: (t: UiTheme) => void }
const UiThemeCtx = createContext<Ctx>({ pref: DEFAULT_UI_THEME, resolved: 'dark', setPref: () => {} });

export const useUiTheme = () => useContext(UiThemeCtx);

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Theme state for the shell. `accountTheme`: users/{uid}.uiTheme once the account loads. */
export function useShellTheme(uid: string | null, accountTheme: unknown): Ctx {
  // Server render and first client render agree on dark; the stored choice applies before paint.
  const [pref, setPrefState] = useState<UiTheme>(DEFAULT_UI_THEME);
  const [prefersDark, setPrefersDark] = useState(true);

  useIsoLayoutEffect(() => {
    const local = readLocalTheme();
    if (local) setPrefState(local);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq) {
      setPrefersDark(mq.matches);
      const on = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
      mq.addEventListener?.('change', on);
      return () => mq.removeEventListener?.('change', on);
    }
  }, []);

  // The account's choice (another device may have changed it).
  useEffect(() => {
    if (isUiTheme(accountTheme)) { setPrefState(accountTheme); writeLocalTheme(accountTheme); }
  }, [accountTheme]);

  const setPref = useCallback((t: UiTheme) => {
    setPrefState(t);
    writeLocalTheme(t);
    if (db && uid) {
      updateDoc(doc(db, 'users', uid), { uiTheme: t, updatedAt: serverTimestamp() })
        .catch(err => console.warn('[theme] not saved to the account', (err as Error).message));
    }
  }, [uid]);

  return { pref, resolved: resolveTheme(pref, prefersDark), setPref };
}

export function UiThemeProvider({ value, children }: { value: Ctx; children: React.ReactNode }) {
  return <UiThemeCtx.Provider value={value}>{children}</UiThemeCtx.Provider>;
}
