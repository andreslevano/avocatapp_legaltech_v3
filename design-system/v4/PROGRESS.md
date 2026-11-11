# DS v4 — progress

Branch `ds-v4` (from `main` @ 7eca9518). Not pushed.
Checks after every phase: `npm run build` (note: next.config has `ignoreBuildErrors`, so `npx tsc --noEmit` is also run — 23 pre-existing errors at start), `npm run lint:tokens`, `npm run lint:tokens:baseline`, `tests/unit` (Playwright node).

lint:tokens at start (no baseline): **5,806 violations in 118 files** (5,810 before the token files were swapped).

| Phase | Title | Status | Commit | lint:tokens after |
|---|---|---|---|---|
| 0 | Foundations | done | (this commit) | 5,806 |

## Phase 0 — Foundations
- CLAUDE.md: "DESIGN SYSTEM v3" section replaced with `CLAUDE-section.md`.
- `tailwind.config.js`, `src/styles/globals.css`, `src/lib/tokens.ts` replaced with v4. No file imported the old `@/lib/tokens` exports, so nothing to remap.
- globals.css: Zapier override re-appended (now `var(--accent)`); the `body.app-surface .btn-Btn*` dark-button overrides kept (re-pointed to primitives) until Phase 1 — TODO(ds-v4) to remove.
- `src/app/layout.tsx`: EB Garamond (`--font-document`), `data-theme="light"` on `<html>`.
- `AppShellClient.tsx`: `data-theme="dark"` on shell + loading div, `bg-bg`. Also sets `data-theme="dark"` on `<body>` while the shell is mounted, so portaled modals inside the app resolve dark roles (they render outside the shell div).
- `public/brand/avocat-mark-{cream,ink,gold}.png`.
- `lint:tokens` scripts + `.ds-baseline.json`; `lucide-react@1.72.0` (exact).
- `README-INSTALL.md` from the zip moved into `design-system/v4/` (it isn't part of the app).
- Build: pass. tsc: 23 (unchanged).
- Visually risky: h3/h4 switch from Cormorant to DM Sans globally; `rounded-2xl` 24→16px; `shadow-xl/2xl` → `shadow-lg`; body text colour now `var(--text)`; `bg-card`/`bg-app` follow the theme (dark inside the app).
