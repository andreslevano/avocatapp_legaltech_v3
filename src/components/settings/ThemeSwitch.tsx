'use client';

// Oscuro · Claro · Automático — a radio group (keyboard: arrows move within it, Tab leaves).
import { Monitor, Moon, Sun } from 'lucide-react';
import { useUiTheme } from '@/contexts/UiThemeContext';
import { UI_THEMES, UI_THEME_LABEL, type UiTheme } from '@/lib/ui-theme';

const ICON: Record<UiTheme, typeof Sun> = { dark: Moon, light: Sun, system: Monitor };

export default function ThemeSwitch({ compact = false, id = 'theme' }: { compact?: boolean; id?: string }) {
  const { pref, setPref } = useUiTheme();
  return (
    <fieldset>
      <legend className={compact ? 'sr-only' : 'text-small font-medium text-text mb-2'}>Tema</legend>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-surface-muted">
        {UI_THEMES.map(t => {
          const Icon = ICON[t];
          const on = pref === t;
          return (
            <label key={t}
              className={`flex items-center justify-center gap-1.5 min-h-touch sm:min-h-0 sm:h-8 px-2 rounded-md text-caption font-medium cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                on ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
              <input type="radio" name={`${id}-ui-theme`} value={t} checked={on} onChange={() => setPref(t)} className="sr-only" />
              <Icon size={16} aria-hidden /> {UI_THEME_LABEL[t]}
            </label>
          );
        })}
      </div>
      {!compact && <p className="mt-1.5 text-caption text-text-muted">Automático sigue el modo claro u oscuro de tu dispositivo. Los documentos se ven siempre en blanco.</p>}
    </fieldset>
  );
}
