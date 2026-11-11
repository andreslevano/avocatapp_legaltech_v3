# RUN.md — apply Avocat Design System v4 end to end (autonomous)

You are Claude Code working in the `avocatapp_legaltech_v3` repo. Apply the whole design system in one run. Work autonomously; do not ask questions — when something needs a human decision, use the default below, leave a `// TODO(ds-v4):` comment and add it to the final report.

## Sources of truth (read before starting)
1. `design-system/v4/PLAN.md` — plan, find/replace map, keep/delete table, route table
2. `design-system/v4/PROMPTS.md` — the detailed instructions for Phases 0–10 (each phase's code block is your task list for that phase)
3. `design-system/v4/CLAUDE-section.md`, `docs/04-foundations.md`, `docs/05-voice-and-tone.md`, `docs/06-patterns.md`
4. `design-system/v4/components/*.md` (component specs), `screens/*.md` (target screens), `reference/bundle.js` + `bundle.css` (working reference implementation — port to TSX + Tailwind role classes; do not import the bundle)

## How to run
- **Branch:** create and work on `ds-v4` (from the current branch). Never push, never touch `main`.
- **Progress file:** keep `design-system/v4/PROGRESS.md` updated (phase, status, commit hash, notes). On start, read it: if phases are already done, **resume from the first unfinished phase**. This makes the run restartable — if the session stops, the user just says "continue RUN.md".
- **Order:** Phase 0 → 10 as written in PROMPTS.md. Ignore the "Shift+Tab / new session / new branch" lines there; everything happens on `ds-v4`.
- **Context:** for Phases 6–9 (large), delegate each directory or flow to a subagent (Task tool) with the relevant spec files, then review its diff yourself. Keep your own context for coordination.
- **After every phase:**
  1. `npm run build` — must pass. Fix errors you caused; if a fix needs > ~30 min of unrelated refactoring, revert that part, add a TODO and move on.
  2. `npm run lint:tokens` — no new violations; then `npm run lint:tokens:baseline` to lower the baseline.
  3. If `tests/` Playwright specs exist and run locally, run them; note failures (don't spend the run fixing pre-existing ones).
  4. `git add -A && git commit -m "ds-v4: phase N — <title>"` and update PROGRESS.md.
- **Safety rules:**
  - Don't change business logic: API routes, Firestore reads/writes, Stripe calls, webhooks, auth and pricing amounts charged must behave the same. Only UI, styling, copy, structure and routing (with redirects).
  - Never delete a file that still has references (`grep` first).
  - Never commit secrets or edit `.env*`, `firebase.json`, `firestore.rules`, `storage.rules`, `functions/`.
  - Keep the old route paths working via 301 redirects in `next.config.js`.

## Defaults for human decisions (don't stop for these)
| Decision | Default |
|---|---|
| Particulares pricing | 10 €/escrito, pay per document; drop the 50 €/mes bundle from public pages (keep its Stripe code paths untouched) |
| Company legal data | placeholders in `src/lib/company.ts` (`[RAZÓN SOCIAL]`, `[NIF]`, `[DOMICILIO]`, `[REGISTRO MERCANTIL]`) |
| Social links | keep the home page set: linkedin.com/company/avocatapp, instagram.com/avocatapp |
| Zapier chatbot on home | keep, restyle accent to `var(--accent)`, add the inline AI disclaimer below it if possible |
| `WinProbabilityIndicator`, `SpainMap` | leave in place, add TODO for product review |
| Stripe price ids not found | TODO constant |
| Citation verification | UI shows "No localizada" by default; TODO server hook for CENDOJ/BOE |
| Fonts for PDFs | download EB Garamond TTFs (OFL) from Google Fonts into `public/fonts/`; if no network, TODO and keep Helvetica |

## Finish
When Phase 10 is done (or you've gone as far as is safe):
1. Final `npm run build` and `npm run lint:tokens`.
2. Write `design-system/v4/REPORT.md`: phases done with commit hashes, files deleted, redirects added, lint:tokens count before → after, every `TODO(ds-v4)` with file path, anything skipped and why, and a manual QA checklist (pages to open at 375 / 768 / 1280 px, light and dark).
3. Print a short summary in the terminal. Do not push.
