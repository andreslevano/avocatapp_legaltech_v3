// Herramientas page: which tools sit under "Favoritos" vs "Principales", per user (users/{uid}.toolLayout).
import type { ToolLayout } from './auth';

export type ToolGroupId = keyof ToolLayout;

export const TOOL_GROUPS: { id: ToolGroupId; title: string }[] = [
  { id: 'favoritos', title: 'Favoritos' },
  { id: 'principales', title: 'Principales' },
];

/** Saved layout first (in saved order); tools the user never moved fall back to `featured`. */
export function resolveLayout(tools: { href: string; featured?: boolean }[], saved: ToolLayout | undefined): ToolLayout {
  const known = new Set(tools.map(t => t.href));
  const placed = new Set<string>();
  const out: ToolLayout = { favoritos: [], principales: [] };
  for (const g of TOOL_GROUPS) {
    for (const href of saved?.[g.id] ?? []) {
      if (known.has(href) && !placed.has(href)) { out[g.id].push(href); placed.add(href); }
    }
  }
  for (const t of tools) {
    if (!placed.has(t.href)) out[t.featured ? 'favoritos' : 'principales'].push(t.href);
  }
  return out;
}

/** Move `href` into `to`, before `beforeHref` (or at the end). */
export function moveTool(layout: ToolLayout, href: string, to: ToolGroupId, beforeHref?: string): ToolLayout {
  const next: ToolLayout = {
    favoritos: layout.favoritos.filter(h => h !== href),
    principales: layout.principales.filter(h => h !== href),
  };
  const i = beforeHref ? next[to].indexOf(beforeHref) : -1;
  if (i >= 0) next[to].splice(i, 0, href); else next[to].push(href);
  return next;
}
