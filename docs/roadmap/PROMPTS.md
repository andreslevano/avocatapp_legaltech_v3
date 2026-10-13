# Contract Intelligence — Claude Code prompts (copy/paste)

How to use: one phase per session in the `avocat` folder · start in **plan mode** (shift+tab) ·
review the plan · implement · test manually · commit · `git push origin main:dev`.
Never paste secret values in the chat; put them in `.env.local` yourself.

---

## F0 — Contract foundation (do this first)

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md (sections "Shared rules" and F0).
Implement F0 only.

- Create the contracts collection, types, Firestore rules (+ emulator tests) and indexes.
- Generated NDAs from /tools/nda: create the contract record from the form values (no LLM),
  computing termEndDate / confidentialitySurvivalEnd from the selected duration.
- Uploaded documents: add an "Analizar como contrato" action in /documents (context menu and
  preview panel). Server route reuses the existing text extraction (find what /api/agent and
  /tools/analisis use, including OCR) and runs an LLM structured extraction validated against a
  JSON schema, with per-field confidence.
- ContractConfirmSheet: user verifies/edits parties and dates; low-confidence fields highlighted;
  only confirmed records count for alerts.
- ContractCard in the document preview panel; "Contrato" badge and an expiry-date filter in /documents.
- Unit tests for src/lib/contracts/dates.ts (fixed term, indefinite, survival, auto-renewal, notice).
- Backfill script in scripts/ for existing generated NDAs (dry-run by default; don't run it on prod).
Run type-check, lint, build, rules tests. Update the Progress table and give me a manual test script.
```

## F3 — NDA expiry alerts

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md ("Shared rules", F0 data model, F3).
Implement F3 only. F0 is already in place.

- Scheduled Cloud Function in functions/src (onSchedule, daily 08:00 Europe/Madrid) that scans
  confirmed contracts and creates notifications at the user's thresholds (default 90/30/7/0 days)
  for noticeDeadline, termEndDate and confidentialitySurvivalEnd, idempotent via contract_alerts.
  Follow the existing structure/conventions of functions/src/index.ts.
- notifications collection (rules + tests), bell with unread count in AppHeader, /notifications page.
- Daily grouped email digest using the existing SMTP/nodemailer setup (find how emails are sent today).
- Extend the dashboard vencimientos widget (src/components/dashboard/DeadlineList.tsx) with contract events.
- Alert actions: Renovar (open agent or /tools/nda prefilled to draft a renewal/amendment),
  Dejar vencer, Marcar como terminado, Posponer 7 días, Ver documento.
- Profile → Notificaciones settings: thresholds, email on/off, digest time.
- Admin-only route to run the scan for one user (QA), plus a seed script creating test contracts
  at +90/+30/+7/0 days.
Run type-check, lint, build and tests. Tell me the deploy commands for functions and rules
(don't deploy). Update the Progress table.
```

## D1 — Folders & hierarchy in /documents (before F1)

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md ("Shared rules" and D1).
Implement D1 only. Follow the D1 concepts strictly: folder = where a document lives (one folderId),
case/client = links, smart views are virtual; folders are metadata only (never move Storage blobs).

- folders collection + documents.folderId, Firestore rules (owner only; validate name, parentId
  ownership, depth ≤ 8) with emulator tests, and the indexes in the plan.
- Server routes for operations that touch many docs: move folder (update descendants' ancestors/
  depth in batches, reject cycles), delete folder (move content to parent by default, or delete all
  with explicit confirmation counts). Simple create/rename may be client-side if rules validate them.
- /documents UI:
  * On /documents the left app sidebar (src/components/layout/Sidebar.tsx, today the CASOS list)
    shows the folder tree instead, with "+ Nueva carpeta", drag-and-drop targets and the smart
    views (Por caso, Por cliente, Importados de Microsoft, Pendientes de firma, Contratos por vencer —
    hide the ones whose data doesn't exist yet). Other routes keep the cases list. Mobile: folder
    list + breadcrumb back button.
  * Breadcrumb in the header ("Mis documentos › …", clickable and droppable) and subtitle
    "N archivos · M carpetas".
  * DocTable: sub-folders first as rows (icon, item count, modified date), then files; existing
    sorting, preview panel, context menu, inline rename and bulk actions keep working. Add the
    "Origen" column (Avocat / Subido / OneDrive / SharePoint) and filter.
  * Search/filters scope toggle "En esta carpeta" (default) / "En todas las carpetas", showing the
    folder path under the name in global results.
  * "Mover a…" modal with tree picker (context menu, bulk bar), drag-and-drop rows to tree/breadcrumb,
    "Subir documento" becomes "Añadir ▾" (Subir desde mi equipo · Nueva carpeta; the OneDrive entry
    is added in F1). Uploads land in the current folder; empty-folder state as in the plan.
  * Existing documents (folderId missing) show in root. No data migration needed.
  * Optional "Organizar automáticamente" suggestion with preview before applying.
- Also fix inferDocType() in src/components/documents/helpers.ts: /\bnda\b/ fails on names like
  NDA_MAD_Cloud_Consulting_SL_Nike.doc; use a separator-aware pattern and add unit tests.
Keep the current design system (dark surfaces, avocat-gold accents). Run type-check, lint, build,
rules tests. Update the Progress table and give me a manual test script (desktop + mobile).
```

## F1 — Microsoft OneDrive / SharePoint connector (requires D1)

```
Read CLAUDE.md, docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md ("Shared rules", D1, F1 incl. product
decisions M1–M5 and the full user journey) and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md (D4
token storage). Implement F1 only (not F1b). Build the journey exactly as written in the plan,
including the Spanish copy.
Hard constraint (M2): Avocat is strictly read-only towards Microsoft. Request only read scopes, and
never call any Graph endpoint that creates, updates, moves, renames or deletes items.

Connect:
- Microsoft identity platform OAuth (auth code, confidential client, MS_AUTHORITY, multi-tenant +
  personal accounts, delegated read-only scopes from the plan). Tokens encrypted in
  integration_secrets/{uid}.microsoft using the shared crypto helper (create it per D4 if missing).
- Pre-redirect explainer modal; state carries uid + nonce + safe relative returnTo + intent=import
  + folderId + caseId so a successful connect returns straight to the picker.
- Outcome screens: success toast, admin-approval-required screen (copy admin-consent URL for the
  user's tenant + mailto with prefilled explanation + Reintentar), cancelled (neutral toast),
  generic error. Map the relevant Microsoft error codes; document which ones in the plan.
- Profile → Integraciones card (account, tenant name, connected date, imported count, Cambiar de
  cuenta, Desconectar with the non-destructive confirmation copy). Reconnect banner only when the
  connector is used with an expired/revoked token.

Pick & import:
- "Importar desde OneDrive / SharePoint" in the "Añadir ▾" menu, empty states and case detail.
- Microsoft OneDrive File Picker v8 in a modal (check the current official docs for the
  integration contract, auth handshake and CSP changes); files AND folders; supported types only.
  The token route returns only a short-lived access token, never the refresh token.
- import/preview route: expand selected folders recursively via Graph, return counts, sizes,
  unsupported items, > 25 MB items and duplicates (same driveId+itemId already imported).
- Import options sheet: destination folder (tree picker, defaults to current folder), "Mantener
  estructura de carpetas" (default ON when a folder is selected; mirrored folders get source
  metadata), case/client link, "Analizar como contrato" (pre-ticked by name heuristics), duplicate
  choice per item (Abrir existente / Importar como nueva versión / Omitir), limits 300 files / depth 8.
- import_jobs collection processed outside the HTTP request (Cloud Function on job creation or a
  task queue, following functions/src conventions); idempotent per item; client shows live
  progress with onSnapshot, survives navigation, global completion toast, per-file Reintentar.
- Each file → Storage (storage-paths.ts conventions) → documents with source 'microsoft', folderId
  and externalRef {provider, driveId, itemId, webUrl, path, eTag, importedAt, lastSyncedAt}.
- Preview panel source card with "Abrir en SharePoint/OneDrive ↗" and the copy-semantics note.
  If "Analizar como contrato" was ticked, open the F0 confirmation sheet as a skippable queue
  (if F0 isn't implemented yet, skip this and leave a TODO).
- Repository provider abstraction in src/lib/repositories/provider.ts.

Rules + emulator tests for import_jobs (owner read, server write). Run type-check, lint, build,
tests. Tell me deploy commands (don't deploy). Update the Progress table and give me a test script
covering: personal account, work account, simulated admin-consent block, single files, a SharePoint
folder tree with structure preserved, duplicates, a 30 MB file, closing the sheet mid-import.
```

## F1b — Resync from source (optional, read-only)

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md (F1 decision M2, F1b). Implement F1b only.
Strictly read-only towards Microsoft: no write scopes, no uploads, renames, moves or deletes in
OneDrive/SharePoint. Only Avocat's own copies change.
- eTag check when opening an imported document's preview (throttled) and in a daily job:
  badge "Hay una versión más nueva en OneDrive" + [Actualizar] creating a new version in Avocat and
  keeping the previous one; never replace a signed or reviewed document silently.
- "Origen no disponible" state when the source item is deleted, moved or access was lost.
Run type-check, lint, build, tests. Update the Progress table.
```

## F2a — Legal-update review (on demand / on upload)

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md ("Shared rules", F0, F2 knowledge
model, F2a). Implement F2a only.

- legal_rules and contract_reviews collections with rules + emulator tests (legal_rules readable
  by authenticated users, writable only by admins via server routes using src/lib/auth-admin.ts).
- Seed script with the example rules from the plan in status 'draft' (I'll validate and approve
  them; never mark them approved in code). Include source links and article references only
  where you are confident; leave TODO markers otherwise.
- Review route: load approved rules for the contract jurisdiction/type, retrieve supporting
  passages from the existing legal_chunks corpus (see src/lib/vertex-embeddings.ts and how
  agent-v2 does retrieval), run the LLM per rule (or batched) with JSON-schema-validated findings,
  store a contract_reviews record with the rules version hash.
- UI: "Revisar vigencia legal" on contracts; review panel with severity summary, findings,
  NDA excerpt, source link, suggested clause; actions "Generar versión actualizada" (creates a new
  draft document via the existing generation flow, linked as a new version), "Ignorar con motivo",
  "Exportar informe" (PDF). Visible disclaimer and rules-base date on every report.
- Minimal admin page /admin/legal-rules to list, edit and approve rules (isAdmin only).
- Tests with fixture NDAs: one compliant, one missing whistleblower carve-out and personal-data clause.
Run type-check, lint, build and tests. Update the Progress table.
```

## F2b — Continuous legal monitoring

```
Read CLAUDE.md and docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md (F2 knowledge model, F2b).
Implement F2b only. F2a and F3 are in place.

- Scheduled function (daily) fetching the BOE open-data daily summary and new EUR-Lex acts
  (check their current official APIs), keyword prefilter + LLM triage into legal_updates.
  Design sources as pluggable fetchers so BCN (Chile) can be added later.
- /admin/legal-updates: list new items with AI rationale; actions dismiss / mark relevant /
  "Crear regla" (AI drafts a legal_rules draft prefilled from the update; human edits and approves).
- On rule approval or change: find affected confirmed contracts (jurisdiction + type + clauseKeys,
  active lifecycle), re-run the F2a review in batches, and create notifications (reuse F3) like
  "Cambio normativo: N NDAs pueden requerir actualización".
- Never auto-approve rules. Log every triage decision.
Run type-check, lint, build and tests. Tell me deploy commands (don't deploy). Update the Progress table.
```
