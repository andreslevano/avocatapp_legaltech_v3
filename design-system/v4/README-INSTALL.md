# Avocat Design System v4 — one-prompt install

1. Put `avocat-ds-v4.zip` in the root of `avocatapp_legaltech_v3` (next to `package.json`).
2. In that folder run `claude` and paste:

```
Unzip avocat-ds-v4.zip into this folder (it adds design-system/v4/ and scripts/check-design-tokens.mjs; overwrite nothing else), delete the zip, then read design-system/v4/RUN.md and execute it completely and autonomously: create branch ds-v4, apply Phases 0–10, build + lint and commit after each phase, keep design-system/v4/PROGRESS.md updated, and finish with design-system/v4/REPORT.md. Don't ask me questions — use the defaults in RUN.md and leave TODO(ds-v4) comments. Don't push.
```

If the session stops midway, run `claude` again and say: `continue design-system/v4/RUN.md`.

When it finishes: read `design-system/v4/REPORT.md`, fill the TODOs (company data in `src/lib/company.ts`), check the QA list, then `git push -u origin ds-v4` and open a PR.
