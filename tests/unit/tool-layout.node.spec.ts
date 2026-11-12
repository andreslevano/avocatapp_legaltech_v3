import { test, expect } from '@playwright/test';
import { moveTool, resolveLayout } from '@/lib/tool-layout';

const tools = [
  { href: '/a', featured: true },
  { href: '/b', featured: true },
  { href: '/c' },
  { href: '/d' },
];

test.describe('tool layout', () => {
  test('defaults to featured', () => {
    expect(resolveLayout(tools, undefined)).toEqual({ favoritos: ['/a', '/b'], principales: ['/c', '/d'] });
  });

  test('saved layout wins; unknown hrefs dropped; new tools fall back to featured', () => {
    const saved = { favoritos: ['/d', '/gone'], principales: ['/b', '/a'] };
    expect(resolveLayout(tools, saved)).toEqual({ favoritos: ['/d'], principales: ['/b', '/a', '/c'] });
  });

  test('a tool saved in both groups appears once', () => {
    expect(resolveLayout(tools, { favoritos: ['/c'], principales: ['/c'] }).principales).not.toContain('/c');
  });

  test('moveTool across groups, before a card or at the end', () => {
    const base = resolveLayout(tools, undefined);
    expect(moveTool(base, '/c', 'favoritos', '/b')).toEqual({ favoritos: ['/a', '/c', '/b'], principales: ['/d'] });
    expect(moveTool(base, '/a', 'principales')).toEqual({ favoritos: ['/b'], principales: ['/c', '/d', '/a'] });
  });

  test('moveTool reorders within a group', () => {
    const base = resolveLayout(tools, undefined);
    expect(moveTool(base, '/d', 'principales', '/c').principales).toEqual(['/d', '/c']);
  });
});
