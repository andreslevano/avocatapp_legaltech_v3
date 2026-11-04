# Contract Intelligence — Implementation Plan

**Covers:** (F0) shared contract foundation · (F1) Microsoft repository connector ·
(F2) NDA legal-update review · (F3) NDA expiry alerts
**Companion:** `docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md` (shares `integration_secrets` + crypto)
**Created:** 2026-10-12 · Update the Progress table at the end of every phase.

---

## 0. Why one plan

F2 (legal review) and F3 (expiry alerts) both need the same thing: a **structured record of each
contract** (parties, jurisdiction, dates, term, clauses). F1 (Microsoft) is a new *source* of
documents that feeds that record. So we build a shared foundation first (F0) and the three
features sit on top.

```
 Sources                 Foundation (F0)                 Features
 ─────────               ───────────────                 ────────
 /tools/nda (generated) ─┐
 Upload in /documents  ──┼─► documents/{id} ──► contracts/{id} ──┬─► F3 Expiry alerts
 Microsoft OneDrive/SP ──┘     (file)         (structured data,  ├─► F2 Legal-update review
  (F1)                                          confirmed by user)└─► DocuSign (renewal → sign & send)
```

Recommended order (after DocuSign Phases 0–2):
**F0 → F3 → D1 (folders) → F1 → F1b (optional, read-only) → F2 (legal-change monitoring + NDA check)**.
D1 → F1 can also run first and on their own (F1 skips "Analizar como contrato" until F0 exists).
F3 is the quickest win; D1 is a prerequisite of F1 (imports must be able to keep the source
folder structure); F2 is the hardest and most legally sensitive.

## Shared rules (all phases)

- Ignore Finder duplicates (`* 2.ts`, `* 2.tsx`, folders `* 2`). Never edit or import them.
- All API routes verify `Authorization: Bearer <Firebase ID token>` with `authAdmin().verifyIdToken()`
  and check ownership (pattern: `src/app/api/gmail/auth/route.ts`).
- Secrets/tokens only in server-only `integration_secrets/{uid}` (encrypted, see DocuSign plan D4).
- LLM calls go through the existing server-side AI helpers (check `src/lib/ai/provider.ts`,
  `src/lib/openai*.ts`, `src/app/api/agent-v2/route.ts`); follow CLAUDE.md decision #4 unless
  told otherwise. Structured outputs must be JSON-schema validated; never trust raw model text.
- Feature gating: `plan === 'Abogados'` first (single constant per feature).
- Spanish UI copy, design system from CLAUDE.md.
- Firestore rules + emulator tests for every new collection; indexes in `firestore.indexes.json`.
  Don't deploy rules/functions — tell me the deploy commands.

---

## F0 — Contract foundation

### Data model
```ts
// contracts/{id}           — owner read/update (limited fields), server creates
{ userId, documentId, caseId: string|null, clientId: string|null,
  type: 'nda' | 'service' | 'other',
  title, language: 'es'|'en',
  jurisdiction: { country: 'ES'|'CL'|'CO'|'MX'|'AR'|'EU'|string, region?: string },
  governingLaw?: string,
  ndaKind?: 'unilateral' | 'bilateral',
  parties: [{ name, company?, role: 'disclosing'|'receiving'|'mutual', idType?, idNumber?, email? }],
  dates: {
    effectiveDate?: Timestamp,
    termEndDate?: Timestamp,              // agreement term end (null = indefinite)
    confidentialitySurvivalEnd?: Timestamp, // obligations surviving after term
    noticeDeadline?: Timestamp,           // last day to give notice of non-renewal
  },
  term: { durationText?: string, months?: number, indefinite?: boolean,
          autoRenewal?: boolean, renewalMonths?: number, noticeDays?: number },
  clauses: [{ key: ClauseKey, present: boolean, excerpt?: string, page?: number }],
  // ClauseKey examples: definition_confidential_info, exclusions, permitted_disclosure,
  // whistleblower_carveout, personal_data, return_destruction, non_solicit, non_compete,
  // penalty, governing_law, jurisdiction_forum, term, survival, ai_tools_use
  extraction: { source: 'generated'|'llm', model?, confidence: number,
                fieldConfidence: Record<string, number>, extractedAt },
  confirmedByUser: boolean, confirmedAt?: Timestamp,
  lifecycle: 'active'|'expiring'|'expired'|'renewed'|'terminated'|'superseded',
  renewedByContractId?: string,
  review?: { lastReviewId?: string, status?: 'ok'|'attention'|'outdated', reviewedAt? },
  createdAt, updatedAt }
```

### Behaviour
- **Generated NDAs** (`/tools/nda`): create the contract record directly from the form values
  (no LLM): parties, kind, jurisdiction, duration → dates. `extraction.source = 'generated'`, confidence 1.
- **Uploaded / imported NDAs**: "Analizar como contrato" action → server route extracts text
  (reuse the existing PDF/DOCX extraction used by `/api/agent` and `/tools/analisis`, incl. OCR path)
  → LLM structured extraction with per-field confidence → **confirmation sheet** where the user
  verifies/edits dates and parties (low-confidence fields highlighted) → `confirmedByUser = true`.
  Alerts (F3) only run on confirmed records.
- `/documents`: badge "Contrato" + expiry date column/filter; preview panel shows a contract card.
- Backfill script (dry-run default) to create contract records for existing generated NDAs.

### Routes / files
`src/lib/contracts/{types.ts, extract.ts, dates.ts, server.ts, client.ts}`,
`src/app/api/contracts/route.ts` (POST create/extract), `src/app/api/contracts/[id]/route.ts`
(GET, PATCH confirm/edit), `src/components/contracts/{ContractConfirmSheet,ContractCard}.tsx`.

**Done when:** a generated NDA and an uploaded PDF NDA both produce a confirmed contract record
with correct dates; unit tests for date computation (term, survival, auto-renewal, notice).

---

## F3 — NDA expiry alerts

### UX
- **Dashboard (Abogados):** extend the existing vencimientos widget (`DeadlineList`) with contract
  events: "NDA Acme vence en 28 días", "Último día para preaviso de no renovación: 15 nov".
- **Notification bell** in AppHeader with unread count + `/notifications` list.
- **Email digest** (existing nodemailer/SMTP setup): one email per user per day max, grouped.
- **Each alert has actions:** *Renovar* (opens agent/generator prefilled to draft a renewal or
  amendment → optional DocuSign sign & send), *Dejar vencer*, *Marcar como terminado*,
  *Posponer 7 días*, *Ver documento*.
- **Settings (Profile → Notificaciones):** thresholds (default 90/30/7/0 days), channels (in-app
  always, email on/off), digest time.

### Mechanics
- Scheduled Cloud Function (`onSchedule`, daily 08:00 `Europe/Madrid`) in `functions/src`
  scanning `contracts` where `confirmedByUser == true` and lifecycle in (active, expiring),
  computing the next relevant date among `noticeDeadline`, `termEndDate`,
  `confidentialitySurvivalEnd`.
- Idempotency: `contract_alerts/{contractId}_{dateKind}_{threshold}` written once → never duplicate.
- Writes `notifications/{id}` `{ userId, type, contractId, documentId, title, body, dueDate,
  severity, readAt?, actions[] , createdAt }` and enqueues the digest email.
- Lifecycle transitions: `expiring` inside the smallest-but-one threshold, `expired` after term end.
- Auto-renewal contracts: alert on `noticeDeadline`, then roll dates forward if no action.
- Manual "Probar alertas" admin route to run the scan for one user (for QA).

**Done when:** seeded contracts with dates at +90/+30/+7/0 days produce exactly one notification
each, a single grouped email, and the dashboard shows them; re-running the job creates nothing new.

---

## D1 — Folders & hierarchy in `/documents` (prerequisite of F1)

Today `/documents` is a flat list (46+ files, most without case/client). Lawyers organise work in
folder trees (OneDrive/SharePoint libraries), so Avocat needs the same mental model.

### Concepts (keep them separate — this is the key design decision)
- **Folder = where a document lives.** Each document has exactly one `folderId` (null = root
  "Mis documentos"). User-managed tree, like OneDrive.
- **Case / client = what a document is about.** Stay as links/labels (`caseId`, `clientId`).
  A document in folder *Clientes › Acme › NDAs* can still be linked to case AVC-2026-555.
- **Smart views (virtual, not folders):** *Por caso*, *Por cliente*, *Importados de Microsoft*,
  *Pendientes de firma*, *Contratos por vencer*. Computed from fields; nothing is moved.
- Folders are **metadata only**: Storage paths do NOT change when a document is moved
  (no blob copies, download URLs stay valid).

### Data model
```ts
// folders/{id}   — owner read/write (validated)
{ userId, name, parentId: string|null,
  ancestors: string[],            // ids root→parent, for breadcrumbs & subtree queries
  depth: number,                  // max 8
  color?: string,
  source?: { provider: 'microsoft', driveId, itemId, webUrl, path } | null, // mirrored from import
  createdAt, updatedAt }

// documents/{id} — add
{ folderId: string | null }
```
- Folder name unique within the same parent (case-insensitive); forbidden chars `/ \ : * ? " < > |`.
- Move folder = update its `parentId/ancestors/depth` and all descendants' `ancestors/depth`
  in a server-side batched operation (route), rejecting cycles and depth > 8.
- Delete folder: only via server route; options *Mover contenido a la carpeta superior* (default)
  or *Eliminar todo* (explicit confirmation with counts). Never orphan documents.
- Indexes: `folders: userId + parentId + name`, `documents: userId + folderId + createdAt DESC`.

### UX
- **Contextual sidebar:** on `/documents` the left app sidebar (currently the CASOS list) shows the
  **folder tree** instead (expand/collapse, "+ Nueva carpeta", drag-and-drop targets, smart views
  below the tree). Other routes keep the cases list.
- **Breadcrumb** in the page header: `Mis documentos › Clientes › Acme` (each segment clickable,
  also a drop target). Header subtitle: "12 archivos · 3 carpetas".
- **Table, OneDrive-style:** sub-folders listed first as rows (folder icon, item count, modified
  date), then files. Double-click / click opens the folder. Existing columns, sorting and preview
  panel unchanged for files. New column **Origen** (Avocat / Subido / OneDrive / SharePoint).
- **Search & filters scope toggle:** "En esta carpeta" (default) / "En todas las carpetas"; global
  results show the folder path under the name.
- **Actions:** Nueva carpeta (button + context menu + `Shift+N`), Renombrar inline, **Mover a…**
  (modal with tree picker; also in bulk actions bar and context menu), drag-and-drop rows onto
  tree nodes/breadcrumb, Eliminar carpeta (dialog above).
- **Uploads & generated docs:** upload/drag-drop lands in the **current folder**. Generated docs
  (agent, /tools/*) land in root unless the tool was opened from a folder; their toast offers
  "Mover a carpeta".
- **Mobile:** tree becomes a folder list with breadcrumb back button; "Mover a…" modal as bottom sheet.
- **Empty folder state:** "Carpeta vacía · Arrastra archivos aquí · Subir · Importar desde OneDrive".
- **Optional helper "Organizar automáticamente"** (one-time suggestion for existing users): proposes
  `Clientes/{cliente}` and `Casos/{ref}` folders from current links; preview before applying.

### Related fix spotted during D1 review
`inferDocType()` uses `/\bnda\b/`, which fails on names like `NDA_MAD_Cloud_Consulting_SL_Nike.doc`
(underscore is a word character), so NDAs show as "Otro". Use a separator-aware pattern such as
`/(^|[^a-z0-9])nda([^a-z0-9]|$)/i`.

**Done when:** a user can create/rename/move/delete nested folders, move documents by drag-drop
and "Mover a…", search in-folder and globally, and existing documents appear in root untouched;
rules tests cover folder ownership, cycles and depth.

---

## F1 — Microsoft repository connector (OneDrive + SharePoint)

### Product decisions (fixed)
| # | Decision |
|---|---|
| M1 | **Import = copy** into Avocat (analysis, signatures and history stay stable). Source link kept. |
| M2 | **Strictly read-only, permanently.** Only read scopes (`Files.Read.All`, `Sites.Read.All`); Avocat never writes, moves, renames or deletes anything in OneDrive/SharePoint. No write scopes in any phase. |
| M3 | **One Microsoft account per user** in v1. |
| M4 | **Folder hierarchy is preserved** on import using D1 folders (option ON by default). |
| M5 | Microsoft's **OneDrive File Picker v8** for browsing (files AND folders); no custom browser. |

### User journey (build exactly this)
**Stage 0 — Entry points**
- `/documents`: the "Subir documento" button becomes **"Añadir ▾"** → *Subir desde mi equipo* ·
  *Importar desde OneDrive / SharePoint* · *Nueva carpeta*.
- Empty state of `/documents` and of any empty folder: "¿Tus contratos están en OneDrive o SharePoint? Impórtalos aquí."
- Case detail "Añadir documento ▾" → same option, pre-linked to the case.
- Profile → **Integraciones** card.

**Stage 1 — Connect (just-in-time, first time only)**
- Pre-redirect explainer modal (copy):
  "Avocat abrirá el inicio de sesión de Microsoft. ✓ Solo importamos los archivos que tú selecciones
  ✓ Nunca modificamos ni borramos nada en tu OneDrive ✓ Puedes desconectar cuando quieras.
  Microsoft te pedirá permiso para «leer los archivos a los que tienes acceso»: es necesario para que puedas elegirlos desde Avocat."
  [Cancelar] [Continuar]
- Microsoft account chooser (personal or work) + consent → callback.
- Outcomes:
  - Success → return **directly to the picker** (state carries `returnTo` + `intent=import` +
    `folderId` + `caseId`), toast "Conectado como {email}".
  - Admin approval required (`AADSTS65001`/`consent_required`/`admin_consent` style errors) →
    dedicated screen: "Tu organización requiere que un administrador apruebe Avocat." with
    **[Copiar enlace para tu administrador]** (admin-consent URL for their tenant) and
    **[Enviar por email]** (mailto with prefilled explanation of scopes and purpose) + [Reintentar].
  - User cancelled → back to `/documents`, neutral toast "Conexión cancelada".
  - Other errors → "No pudimos conectar con Microsoft" + Reintentar.

**Stage 2 — Pick**
- File Picker in a modal: Mis archivos · Compartido · Recientes · SharePoint sites/libraries · search.
- Multi-select **files and folders**; only supported types selectable
  (pdf, docx, doc, xlsx, xls, png, jpg); remembers last location.

**Stage 3 — Import options sheet**
- List of selected items (folders show "N archivos" after server-side expansion preview).
- **Destino:** current Avocat folder (breadcrumb, changeable with tree picker).
- **☑ Mantener estructura de carpetas** (default ON when a folder is selected): creates
  `{destino}/{folder name}/…` mirroring the source tree (folders get `source` metadata).
- **Vincular a:** Caso / Cliente (prefilled if started from a case).
- **☑ Analizar como contrato después de importar** (pre-ticked when names match
  NDA/confidencialidad/contrato/acuerdo; runs F0 extraction).
- Pre-validation shown inline: too large (> 25 MB), unsupported, **already imported**
  (same driveId+itemId → choose *Abrir existente* / *Importar como nueva versión* / *Omitir*).
- Limits: max 300 files and depth 8 per import; above that, ask to narrow the selection.
- [Cancelar] [Importar N →]

**Stage 4 — Import progress & result**
- Import runs as a **background job** (survives closing the sheet / navigating): progress list per
  file ⏳ → ✅ / ⚠️; global toast when done: "N archivos importados · Ver"; partial failures listed
  with per-file *Reintentar*.
- Imported files show the OneDrive/SharePoint icon and **Origen** value; preview panel shows a
  source card: "☁️ Importado de SharePoint · Bufete › Contratos › 2026 · 13 oct 2026 · [Abrir en SharePoint ↗]"
  and "Avocat guarda una copia. Los cambios en OneDrive no se reflejan automáticamente."
- If "Analizar como contrato" was ticked → F0 confirmation sheet opens as a queue (one by one, skippable).

**Stage 6 — Manage connection** (Profile → Integraciones)
- "ana@bufete.com · Bufete Pérez (Microsoft 365) · Conectado el … · N archivos importados",
  [Cambiar de cuenta] [Desconectar].
- Disconnect confirmation: "Los N archivos importados seguirán en Avocat. Ya no podrás importar ni
  actualizar desde OneDrive." Nothing is deleted.
- Expired/revoked token → inline banner only when the user next uses the connector: "Reconecta tu cuenta de Microsoft".

### Mechanics
- Microsoft identity platform OAuth 2.0 auth code flow (confidential client, `MS_AUTHORITY=…/common`,
  multi-tenant + personal accounts), delegated scopes:
  `openid profile email offline_access User.Read Files.Read.All Sites.Read.All`.
- Routes `src/app/api/integrations/microsoft/`: `auth`, `callback`, `disconnect`, `token`
  (short-lived Graph token for the File Picker only — never the refresh token), `admin-consent-url`,
  `import/preview` (expand selected folders recursively via Graph, return counts, sizes,
  duplicates, unsupported), `import` (creates the job).
- **Import jobs:** `import_jobs/{id}` `{ userId, status, destinationFolderId, keepStructure,
  caseId, clientId, analyze, items[{driveId,itemId,path,name,size,status,error,documentId}],
  counts, createdAt, updatedAt }`, processed **outside the request** (Cloud Function triggered on
  job creation or a task queue, following functions/src conventions) because folder imports can
  exceed the SSR request timeout. Client listens with onSnapshot. Idempotent per item.
- Download `/drives/{driveId}/items/{itemId}/content` server-side → Storage (storage-paths.ts
  conventions) → `documents` with `source: 'microsoft'`, `folderId`, and
  `externalRef { provider: 'onedrive'|'sharepoint', driveId, itemId, webUrl, path, eTag, importedAt, lastSyncedAt }`.
- Provider abstraction `src/lib/repositories/provider.ts` (Google Drive / Dropbox later).
- Tokens: encrypted in `integration_secrets/{uid}.microsoft` (same crypto helper as DocuSign).

**Done when:** a personal and a work account can connect (including the admin-consent screen,
simulated), import individual files and a SharePoint folder tree with structure preserved into a
chosen Avocat folder, duplicates are detected, progress survives navigation, and no Microsoft
refresh token ever reaches the browser.

## F1b — Resync from source (read-only, optional)
Still read-only: it only **reads** from Microsoft and updates the copy **inside Avocat**.
- `eTag` check on preview open / daily job → badge "Hay una versión más nueva en OneDrive" **[Actualizar]**
  (keeps previous version; never overwrites a signed or reviewed document silently).
- Source gone/moved/no access → "Origen no disponible" (copy intact).
- Optional later: "Vigilar esta carpeta" with Graph delta queries (read-only).

**Out of scope (decided 2026-10-13):** any write to Microsoft — "Guardar en OneDrive / SharePoint",
`Files.ReadWrite*` / `Sites.ReadWrite*` scopes, uploads, renames, moves or deletes in the source.

---

## F2 — Legal-change monitoring & NDA check (redesigned 2026-11-02)

**One feature, not two.** There is no separate "legal review on demand": Avocat monitors legal
changes, and the user checks **one, a selection, or all** NDAs against them. (Replaces the earlier
F2a review-on-upload / F2b monitoring split.)

### Decisions (owner, 2026-11-02)
| # | Decision |
|---|---|
| L1 | **Admin approves** every detected change before it is used to check NDAs (AI detects + drafts; never auto-approved). |
| L2 | **Baseline = changes + key current law:** each NDA is checked against approved changes in force after its effective date **plus** a short fixed list of current requirements (e.g. whistleblower carve-out, personal data), so already non-compliant NDAs are caught too. |
| L3 | **Jurisdictions:** Spain (BOE) and EU (EUR-Lex) first. Chile (BCN) later. |
| L4 | Re-checks are **user-triggered** (cost control); new approved changes only **flag** affected NDAs + notify. |

### Knowledge model
```ts
// legal_changes/{id} — detected from official feeds (or added manually), triaged by AI, approved by an admin
{ source: 'boe'|'eurlex'|'manual', externalId, url, title, publishedAt, effectiveFrom?,
  jurisdiction: 'ES'|'EU', topics: ('trade_secrets'|'personal_data'|'whistleblowing'|'employment'|'ai'|'data_act'|…)[],
  clauseKeys: ClauseKey[],          // F0 clause keys it concerns
  aiTriage: { relevant, rationale, confidence, model },
  summary,                          // what changed, plain Spanish
  requirement,                      // what an NDA must / must not contain now
  severity: 'critical'|'important'|'recommended',
  suggestedClause?: { es, en? },
  status: 'new'|'approved'|'dismissed', approvedBy?, approvedAt? }

// legal_baseline/{id} — the short fixed list of current requirements (same shape as an approved change,
// source 'baseline'), lawyer-validated before go-live.

// nda_checks/{id} — one result per NDA per run
{ userId, contractId, documentId, runId, ranAt, model,
  changeIds: string[],              // approved changes + baseline items applied (versioning)
  verdict: 'ok'|'review'|'outdated',
  findings: [{ changeId, status: 'ok'|'missing'|'conflict', severity, explanation, excerpt?, suggestedClause?, sourceUrl }] }

// nda_check_runs/{id} — a user-triggered run over 1..N NDAs (progress)
{ userId, contractIds, total, done, failed, status: 'running'|'done'|'error', createdAt }

// contracts/{id}.legal = { verdict, checkedAt, lastCheckId, flaggedByChangeIds[] }  (server-written)
```

### Monitoring (daily)
- Scheduled trigger (same pattern as F3: thin function → Next route with a shared secret).
- **BOE:** daily summary via the open-data API (sections I / III), keyword prefilter, then AI triage.
- **EUR-Lex:** new regulations / directives (Official Journal L series), same prefilter + triage.
- Relevant items → `legal_changes` (`new`) with AI summary, topics, clause keys, suggested clause.
- **Admin page `/admin/legal-changes`** (`users.isAdmin`): review, edit, **Aprobar** / **Descartar**;
  add a change manually (URL + text).
- On approval: flag affected NDAs (confirmed contracts with matching jurisdiction — ES contracts also
  get EU changes — and clause keys, lifecycle active/expiring, effective date before the change) →
  `contracts.legal.flaggedByChangeIds`, F3 notification per user ("Cambio normativo: 4 NDAs pueden
  requerir actualización"), and a "Afectado por cambio legal" chip in `/documents`.

### NDA check (user-triggered)
- **One:** "Revisar cambios legales" in the contract card. **Several:** bulk bar in `/documents`.
  **All:** button on the user's "Cambios legales" page (list of approved changes + "Revisar todos mis NDAs").
- NDAs without a confirmed contract record are skipped with a hint ("Confirma los datos del contrato").
- Per NDA: approved changes for its jurisdiction in force after its effective date + baseline → one
  LLM call with the NDA text (F0 `documentText`) → JSON-schema-validated findings → `nda_checks`.
  Runs in batches with progress (`nda_check_runs`); results stream into the UI.
- **Result:** traffic light per NDA (✅ Al día / 🟡 Revisar / 🔴 Desactualizado), findings with the
  affected excerpt, the official link and a suggested clause; **Generar versión actualizada** opens
  `/tools/nda` (or the agent for uploaded NDAs) with the fixes → new document → Firmar y enviar.
- Disclaimer on every result: assistance tool, needs professional review; shows the changes applied.

**Done when:** a manually added change, once approved, flags only the affected NDAs and notifies their
owners; checking 1 / several / all NDAs returns validated findings with sources; a seeded ES NDA
without a whistleblower carve-out is flagged by the baseline; dismissed changes never affect results.

---

## What the owner must provide

| Feature | Needed from you |
|---|---|
| F0 | 3–5 real (anonymised) NDAs per jurisdiction for testing extraction; confirm jurisdictions in scope (ES, EU, CL, CO…?) |
| F3 | Default thresholds & channels; confirm SMTP sender used for digest; Firebase Blaze plan allows Cloud Scheduler (already have Functions) |
| F1 | Microsoft Entra app registration (see below); a work/school test tenant + a personal Microsoft account; publisher verification (Microsoft Partner ID) before public launch |
| F2 | **Lawyer validation of the baseline list** (not legal advice); who approves changes (`users.isAdmin`); disclaimer text |

**Microsoft Entra app registration (Azure portal → App registrations → New):**
- Supported account types: *Accounts in any organizational directory and personal Microsoft accounts*.
- Redirect URIs (Web): `http://localhost:3000/api/integrations/microsoft/callback`,
  `https://avocatapp.com/api/integrations/microsoft/callback`.
- SPA redirect for the File Picker: `http://localhost:3000`, `https://avocatapp.com`.
- Certificates & secrets → new client secret (note expiry date!).
- API permissions (Microsoft Graph, delegated): `User.Read`, `Files.Read.All`, `Sites.Read.All`, `offline_access`.
- Env vars (you type them in `.env.local`): `MS_CLIENT_ID`, `MS_CLIENT_SECRET`,
  `MS_AUTHORITY=https://login.microsoftonline.com/common`.

---

## Progress

> **Preview access (2026-11-04):** besides the named emails, every user with a **verified** email at a `PREVIEW_DOMAINS` organisation (`src/lib/preview.ts`: `mobilityforwork.es`) gets DocuSign, Microsoft and contracts/alerts/legal features (Abogados plan). Unverified email/password accounts see a banner to verify (Firebase verification email). Server gates use the ID token's `email_verified`; scans use Firebase Auth.


| Phase | Status | Notes |
|---|---|---|
| F0 Foundation | ◐ deployed as preview (2026-11-02; rules + indexes + hosting; `CONTRACTS_PREVIEW_EMAILS`) | `src/lib/contracts/{config,types,dates,extract,server,client,route-helpers}.ts`. **Deviations from the data model:** dates are calendar strings `YYYY-MM-DD` (not Timestamps — a contract ends on a day, no time-zone drift); `contracts` is owner **read-only** (all writes via `/api/contracts*`, dates always recomputed server-side); extra `term.fixedEndDate` / `term.survivalMonths`, `snoozedUntil`, `alertsMuted`, `renewsContractId`. Documents carry a server-only summary (`contractId/contractConfirmed/contractNextDate/contractLifecycle`, protected in rules like the signature fields). Generated NDAs: `/tools/nda` → `POST /api/contracts` from the form (no LLM, confirmed; term from Duración; starts on the DocuSign signing day when signed — `startContractOnSigning`). Uploaded/imported: "Analizar como contrato" (context menu + preview panel `ContractCard`) → `POST /api/contracts/extract` (text: Avocat .doc HTML / DOCX mammoth / PDF text layer via pdf-parse 2.x `PDFParse` / txt; scanned PDFs → 422 with message) → GPT-4o strict JSON schema → validated (`contractFromExtraction`) → unconfirmed → `ContractConfirmSheet` (low-confidence fields amber, live date preview) → `PATCH /api/contracts/[id]`. "Contrato" chip in the table, smart view "Contratos por vencer" (confirmed + expiring/expired or a date ≤ 90 days). Backfill `scripts/contracts-backfill.ts` (dry-run; creates **unconfirmed** records). Verified read-only on real data: both saved NDAs and a signed PDF extract parties, 24-month term, ES law correctly. Tests: 26 unit (dates incl. month clamping, indefinite, survival, auto-renewal roll-forward, notice; extraction validation; schema strictness), 11 rules. |
| F3 Expiry alerts | ◐ deployed as preview (2026-11-02) except the hourly function (needs `CRON_SECRET` in Secret Manager); prod seed check: 4 contracts → 4 alerts, re-run → 0 | Hourly scheduled function `contractAlertsHourly` (`functions/src/contract-alerts.ts`, thin trigger, secret `CRON_SECRET`) → `POST /api/cron/contract-alerts` on the SSR Cloud Run URL (bypasses Hosting's 60 s). Logic in `src/lib/contracts/{alerts,server-alerts}.ts`: scan **once per Madrid day** (`system/contract_alerts.lastScanOn`, released on failure) — auto-renewal roll-forward, lifecycle (expiring ≤ 30 days), only the **current threshold band** fires (a contract at 20 days gets the 30-day alert, not 90 too), day-0 grace 7 days, idempotent `contract_alerts/{contractId}_{kind}_{threshold}` created in a transaction with the notification; deleted documents retire their contract. Digest: every run, users whose `digestHour` (default 08:00 Madrid) is now get one grouped email per day (nodemailer, `EMAIL_USER`), unread only; email off → marked skipped. UI: bell with unread count in every `AppHeader`, `/notifications` (Renovar → `/tools/nda?renew=<id>` prefilled, new contract marks the old one Renovado; Dejar vencer = mute; Marcar como terminado; Posponer 7 días; Ver documento → `/documents?doc=`), "Revisar ahora" (= `POST /api/admin/contract-alerts`, own uid; another uid needs `users.isAdmin`), dashboard "Próximos vencimientos" merges contract dates (≤ 120 days), Perfil → Notificaciones (thresholds 90/60/30/14/7/1/0, email on/off, hour). Seed `scripts/contracts-seed-alerts.ts` (+90/+30/+7/0, `--clean`). Tests: alert bands, seeded +90/+30/+7/0 → one key each, grace, snooze/mute/unconfirmed, prefs normalization, texts, digest escaping. Indexes: notifications(userId, createdAt desc), contracts(confirmedByUser, lifecycle), contracts(userId, confirmedByUser, lifecycle). |
| D1 Folders in /documents | ☑ (2026-10-13; rules + indexes + hosting deployed) | `folders` + `documents.folderId`, rules + 47 emulator tests (`npm run test:rules`), 35 unit tests (`npm run test:node`: tree planner, `inferDocType` NDA fix). Routes `POST /api/folders/[id]/move` · `/delete`. Sidebar tree + smart views (Por caso / Por cliente; Microsoft & Pendientes de firma auto-hide until data exists; Contratos por vencer waits for F0/F3). Gated to Abogados via `FOLDERS_PLAN`. Generated docs still land in root (no "Mover a carpeta" toast in tools yet). |
| F1 Microsoft connector | ◐ connect + picker live in prod as preview (`MICROSOFT_PREVIEW_EMAILS`) | Done: OAuth (PKCE, `.default`, read-only scope guard), encrypted tokens in `integration_secrets/{uid}.microsoft`, `/api/integrations/microsoft/{auth,callback,token,disconnect}`, admin-consent screen, File Picker v8 (personal + work), "Importar desde OneDrive / SharePoint" in `/documents`. **Import deployed as preview (2026-11-03) — step 1 files + step 2 folders:** `ImportOptionsSheet` after the picker — `POST …/import/preview` (Graph item metadata: size, OneDrive vs SharePoint from `driveType`, readable source path, unsupported / > 25 MB / folder, earlier copies by `externalRef.itemId`), destination = current folder, link to case / client, "Analizar como contrato" (pre-ticked for contract-like names → F0 extraction → confirmation queue), duplicates skipped unless "Importar otra copia"; `POST …/import/file` copies ONE file per request (Graph `/content` GET, Storage `users/{uid}/{plan}/importados|casos/{id}/…`, `documents` `source: 'microsoft'` + full `externalRef`), per-file progress + Reintentar; source card in the preview panel. Max 50 files per import. Verified read-only against a real connection (preview + 1.4 MB download, 1.5 s). **Step 2:** selected folders are expanded read-only in the preview (breadth-first, `/children` paging, max 300 files / 8 levels, duplicates via the user's `source: microsoft` docs) and imported through `import_jobs/{id}` (owner read; items leased 2 min, so a closed tab resumes and two tabs never double-import). Deviation from the plan's Cloud Function: the app-wide `ImportJobsProvider` (app shell) drives `POST …/jobs/[id]/next` one file per request — survives navigation and closing the sheet; after a closed tab it offers "Reanudar"; reconnect pauses the job ("Reconectar" + "Reanudar"); progress pill bottom-left with Detener / Reintentar errores. "Mantener estructura de carpetas" recreates `{destino}/{carpeta}/…` (reuses same-name folders, D1 depth ≤ 8 → deeper files go to the deepest folder; folders carry `source`). Case detail "OneDrive / SharePoint" (pre-linked to the case, list refreshes when files land), empty-folder hint in `/documents`, Perfil → Integraciones Microsoft card (account, org, connected date, imported count, Cambiar de cuenta, Desconectar keeping files). Verified read-only: real folder expanded (946 ms). **Still pending:** import options sheet, `import_jobs` + Cloud Function, progress UI, source card, case/empty-state entry points, Integraciones Microsoft card, provider abstraction, publisher verification before removing the email allow-list. |
| F1b Resync (read-only, optional) | ☐ | |
| F2 Legal-change monitoring + NDA check | ◐ **step 1 deployed as preview (2026-11-02; admins: both andres.levano accounts)** — monitoring + admin approval + flagging. **Step 2 deployed as preview (2026-11-02):** NDA check 1/several/all | `src/lib/legal/{types,sources,triage,match,server,client,route-helpers}.ts`. Feeds: BOE open-data daily summary (section I only; object-or-array nesting handled) + item XML text; EU via Publications Office CELLAR SPARQL (REG + DIR, Spanish titles, corrigenda dropped) + XHTML by CELEX (eur-lex.europa.eu serves a bot challenge). Monitor runs from the hourly cron once per Madrid day from 09:00 (`system/legal_monitor`; BOE window re-includes the latest day; EU window 14 days), dedup via `legal_seen/{source_id}`, GPT-4o title triage in batches of 40 → full-text analysis (max 10/run, rest deferred) → `legal_changes` `new`. Admin page `/admin/legal-changes` (`users.isAdmin`, checked server-side): edit summary / requirement / clause / severity / scope / topics / date, Aprobar · Guardar · Descartar, Añadir manualmente (AI drafts from pasted text), Buscar ahora. Approval flags confirmed open contracts of the same type in scope (ES ← ES + EU law), started before the change → `contracts.legal.flaggedByChangeIds`, `documents.contractLegalFlag` (server-only), one `legal_change` notification per user (deterministic id), "Cambio legal" chip, view "Afectados por cambios legales", contract card lists the changes. **Security fix:** `users.isAdmin` could be self-granted by any user; rules now forbid it (create only `false`). Verified: dry run on the last 7 days of real feeds (28 items → 0 relevant, all energy/admin orders); triage on landmark titles 8/8 (Ley 2/2023, Ley 1/2019, Data Act, AI Act, RDL non-compete flagged; fishing aid, energy order, antidumping rejected). Tests: 10 unit (real BOE/EU samples in `tests/fixtures`), 5 rules. **Step 2:** `src/lib/legal/{baseline,check,check-server,check-client}.ts`. Rules per NDA (L2): active `legal_baseline` items for its jurisdiction (defaults in code until an admin loads them; 5 seeds: Ley 2/2023 informantes, Ley 1/2019 secretos, RGPD/LOPDGDD, ET art. 21.2 no competencia, IA — all "pendiente de validación por un abogado") + approved changes in force after its start. One GPT-4o call per NDA (strict schema), one finding per rule (skipped rules count as missing, never ok), verdict ok / review / outdated (critical missing) / no_rules. `POST /api/legal/check {contractId}` — one NDA per request; the client (`LegalCheckRunner`) drives 1 / several / all with progress (deviation: no `nda_check_runs` doc, so no call nears Hosting's 60 s). 200 checks/user/day. Results `nda_checks/{id}` (owner read), `contracts.legal.{verdict,checkedAt,lastCheckId}` (clears flags), `documents.contractLegalVerdict` chip. Entry points: contract card, `/documents` bulk bar, `/legal-changes` (approved changes + baseline + "Revisar todos mis NDAs"; user menu "Cambios legales"). `NdaCheckSheet`: findings with excerpt, source, suggested clause (copy), disclaimer; "Generar versión actualizada" → `/tools/nda?renew=&check=` (prefilled incl. purpose; fixes sent as `legalUpdates`, bounded server-side; old contract → Sustituido). Admin tab "Requisitos base" (load defaults, edit, validate, activate). Verified read-only on the real NDA_MFW_MCC: outdated — missing whistleblower carve-out (critical) and AI clause; trade secrets ok; RGPD and ET non-compete correctly not applicable; ~5 s, ~2.8k tokens. Tests: 9 unit, 2 rules. |
