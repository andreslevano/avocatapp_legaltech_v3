import { expect, test } from '@playwright/test';
import { DEFAULT_UI_THEME, isUiTheme, resolveTheme, UI_THEME_LABEL } from '@/lib/ui-theme';

test('theme preference → applied theme; default dark', () => {
  expect(DEFAULT_UI_THEME).toBe('dark');
  expect(resolveTheme('dark', false)).toBe('dark');
  expect(resolveTheme('light', true)).toBe('light');
  expect(resolveTheme('system', true)).toBe('dark');
  expect(resolveTheme('system', false)).toBe('light');
  expect(UI_THEME_LABEL).toEqual({ dark: 'Oscuro', light: 'Claro', system: 'Automático' });
  expect(isUiTheme('light')).toBe(true);
  expect(isUiTheme('blue')).toBe(false);
  expect(isUiTheme(undefined)).toBe(false);
});
