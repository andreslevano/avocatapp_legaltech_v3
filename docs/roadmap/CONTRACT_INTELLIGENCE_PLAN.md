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
**F0 → F3 → D1 (folders) → F1 → F1b (optional, read-only) → F2a (on-upload review) → F2b (continuous monitoring)**.
D1 → F1 can also run first and on their own (F1 skips "Analizar como contrato" until F0 exists).
F3 is the quickest win; D1 is a prerequisite of F1 (imports must be able to keep the source
folder structure); F2b is the hardest and most legally sensitive.

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

## F2 — NDA legal-update review

Two parts. **F2a** is review on demand/upload against a curated, versioned rule base.
**F2b** is continuous monitoring of official sources, with human validation, that re-checks
existing NDAs when a relevant change is approved.

### Knowledge model (the core of F2 — lawyer-curated, AI-assisted)
```ts
// legal_rules/{id}  — admin-managed, versioned; this is the "checklist" the review applies
{ jurisdiction: 'ES'|'EU'|'CL'|'CO'|..., contractTypes: ['nda'],
  topic: 'trade_secrets'|'personal_data'|'whistleblowing'|'employment'|'ai'|'data_act'|...,
  title, requirement,            // what a compliant NDA must / must not contain
  clauseKeys: ClauseKey[],       // which clauses it concerns
  severity: 'critical'|'important'|'recommended',
  sources: [{ label, url, articleRef }],   // BOE / EUR-Lex / BCN links
  effectiveFrom: Timestamp, effectiveUntil?: Timestamp,
  suggestedClause?: { es: string, en?: string },
  version, status: 'draft'|'approved'|'retired', approvedBy, approvedAt }

// legal_updates/{id} — detected changes awaiting/after admin triage (F2b)
{ source: 'boe'|'eurlex'|'bcn'|'manual', externalId, title, url, publishedAt,
  jurisdiction, aiTriage: { relevant: boolean, topics: [], rationale, confidence },
  status: 'new'|'relevant'|'dismissed'|'converted', ruleIds?: string[] }

// contract_reviews/{id}
{ userId, contractId, documentId, rulesVersionHash, ranAt,
  findings: [{ ruleId, status: 'ok'|'missing'|'conflict'|'outdated', severity,
               explanation, excerpt?, suggestedRedline?, sources[] }],
  summary: { critical, important, recommended }, model }
```

Seed rule examples (to be validated by a lawyer before `approved`):
- **ES** — Ley 1/2019 de Secretos Empresariales (definition, permitted uses); RGPD + LOPDGDD
  3/2018 when personal data is exchanged; Ley 2/2023 (protección de informantes): NDA must not
  prevent protected reporting; employment NDAs with post-contract non-compete (Estatuto de los
  Trabajadores art. 21).
- **EU** — Directive (EU) 2016/943 trade secrets; Data Act (Reg. (EU) 2023/2854) for data-sharing
  NDAs; AI Act / internal policy: use of confidential info in AI tools.
- **CL** — Ley 21.719 (new personal-data law replacing Ley 19.628; check exact entry-into-force date)
  → NDAs with personal-data clauses may need updating.
- **CO** — Ley 1581 de 2012 (habeas data).

### F2a — Review on upload / on demand
- Action **"Revisar vigencia legal"** on a contract (and automatic after F0 confirmation, toggle).
- Pipeline: approved rules for the contract's jurisdiction(s) + type → for each rule, LLM checks
  the NDA text (clause excerpts from F0 + full text), with retrieval from the existing
  `legal_chunks` corpus (Vertex embeddings) for citations → JSON findings, validated.
- **UI:** review panel: traffic-light summary, findings grouped by severity, each with the
  explanation, the excerpt from the NDA, the legal source link, and a suggested clause.
  Actions: *Generar versión actualizada* (agent/generator drafts an amendment or new version
  using the suggested clauses → new document → optional DocuSign), *Ignorar con motivo*,
  *Exportar informe* (PDF).
- Disclaimer on every report: assistance tool, requires professional review; show rules-base
  version/date.

### F2b — Continuous monitoring
- Daily scheduled function fetching official feeds: **BOE** daily summary (open data API),
  **EUR-Lex** (new acts), later **BCN Ley Chile**. Keyword + AI triage → `legal_updates` (`new`).
- **Admin console** `/admin/legal-updates`: review triaged items, mark relevant, create/update
  `legal_rules` (AI can draft the rule; a human approves). Uses the existing `isAdmin` helpers.
- When a rule is approved/changed: find affected contracts (jurisdiction + type + clauseKeys +
  active lifecycle), re-run F2a for them, and notify users through F3's `notifications`
  ("Cambio normativo: 4 NDAs pueden requerir actualización").
- Never auto-approve a rule from AI output.

**Done when (F2a):** a seeded NDA missing a whistleblower carve-out and a personal-data clause
(ES) gets the right findings with sources, and "Generar versión actualizada" produces a new draft.
**Done when (F2b):** a manual `legal_update` converted into an approved rule triggers re-review and
notifications only for affected contracts.

---

## What the owner must provide

| Feature | Needed from you |
|---|---|
| F0 | 3–5 real (anonymised) NDAs per jurisdiction for testing extraction; confirm jurisdictions in scope (ES, EU, CL, CO…?) |
| F3 | Default thresholds & channels; confirm SMTP sender used for digest; Firebase Blaze plan allows Cloud Scheduler (already have Functions) |
| F1 | Microsoft Entra app registration (see below); a work/school test tenant + a personal Microsoft account; publisher verification (Microsoft Partner ID) before public launch |
| F2 | **Lawyer validation of the rule base** (the seed list above is a starting point, not legal advice); who is admin/approver; disclaimers text; sources per jurisdiction |

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

| Phase | Status | Notes |
|---|---|---|
| F0 Foundation | ☐ | |
| F3 Expiry alerts | ☐ | |
| D1 Folders in /documents | ☑ (2026-10-13; rules + indexes + hosting deployed) | `folders` + `documents.folderId`, rules + 47 emulator tests (`npm run test:rules`), 35 unit tests (`npm run test:node`: tree planner, `inferDocType` NDA fix). Routes `POST /api/folders/[id]/move` · `/delete`. Sidebar tree + smart views (Por caso / Por cliente; Microsoft & Pendientes de firma auto-hide until data exists; Contratos por vencer waits for F0/F3). Gated to Abogados via `FOLDERS_PLAN`. Generated docs still land in root (no "Mover a carpeta" toast in tools yet). |
| F1 Microsoft connector | ◐ connect + picker live in prod as preview (`MICROSOFT_PREVIEW_EMAILS`) | Done: OAuth (PKCE, `.default`, read-only scope guard), encrypted tokens in `integration_secrets/{uid}.microsoft`, `/api/integrations/microsoft/{auth,callback,token,disconnect}`, admin-consent screen, File Picker v8 (personal + work), "Importar desde OneDrive / SharePoint" in `/documents`. **Pending:** verify admin-consent path (AADSTS65004 currently maps to "cancelled"), import options sheet, `import_jobs` + Cloud Function, progress UI, source card, case/empty-state entry points, Integraciones Microsoft card, provider abstraction, publisher verification before removing the email allow-list. |
| F1b Resync (read-only, optional) | ☐ | |
| F2a Legal review on demand | ☐ | |
| F2b Continuous monitoring | ☐ | |
