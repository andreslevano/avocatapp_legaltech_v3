# DocuSign — Claude Code prompts (copy/paste)

How to use:
- **One phase per Claude Code session**, opened in the `avocat` folder.
- Start each session in **plan mode** (shift+tab), review the plan, then let it implement.
- Never paste secret values in the chat. Put them in `.env.local` yourself; prompts only reference variable names.
- After each phase: review the diff, run the app, then commit and `git push origin main:dev`.

---

## Phase 0 — Spike (document format & anchors)

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Execute Phase 0 only.

Context: we're adding DocuSign "Firmar y enviar". The current PDF export (buildPdfBlob in
src/lib/agent-export.ts) is an html2canvas raster image, so DocuSign anchor tabs can't work on it.

Tasks:
1. Add a `forSignature` option to the document HTML builder in src/lib/agent-export.ts that
   omits the stamped signatureUrl image and emits invisible anchor strings (\s1\ \d1\ for the
   owner, \s2\ \d2\ for the counterparty) in the signature blocks. Check how /tools/nda renders
   the Parte A / Parte B signature blocks and put the anchors there.
2. Write scripts/docusign-spike.ts that reads DOCUSIGN_SPIKE_ACCESS_TOKEN, DOCUSIGN_SPIKE_ACCOUNT_ID
   and DOCUSIGN_SPIKE_BASE_URI from .env.local and creates a DRAFT envelope (status "created")
   with a sample NDA sent as fileExtension 'html', with signHere/dateSigned anchor tabs for two
   recipients. Print the envelope id and the sender-view URL so I can inspect tab placement.
3. If HTML conversion looks wrong, add a second variant rendering a text-based PDF with pdfkit
   (already a dependency) containing the same anchors, so I can compare.
Use plain fetch against eSignature REST v2.1 (no docusign-esign SDK).
Stop after giving me the commands to run. I'll report back which variant places tabs correctly,
and then you'll record the decision under D7 in the plan and update the Progress table.
Ignore any Finder duplicate files named "* 2.*".
```

## Phase 1 — Connect DocuSign

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Implement Phase 1 only
(Connect DocuSign), following decisions D1–D4, D12 and sections 3–5.

- Reuse the auth/state/nonce pattern from src/app/api/gmail/{auth,callback,disconnect}, but store
  tokens ONLY in integration_secrets/{uid} encrypted with AES-256-GCM (shared INTEGRATION_TOKEN_ENC_KEY via src/lib/integrations/crypto.ts);
  users/{uid}.integrations.docusign gets display-only fields.
- state must carry uid, nonce and a validated relative returnTo path (no open redirects).
- Handle users with several DocuSign accounts (account picker; default to is_default).
- getValidAccessToken(uid) refreshes when <5 min to expiry and throws a typed ReconnectRequired error.
- Add an "Integraciones" section to the profile UI with ConnectDocusignCard, following the
  design system in CLAUDE.md (dark app surfaces, avocat-gold CTA, Spanish copy).
- Find out how OPENAI_API_KEY reaches production on Firebase Hosting SSR and document in the
  plan how the DOCUSIGN_* vars must be set the same way. Don't change deployment config.
- Add unit tests for crypto and token refresh. Run type-check, lint and build.
Update the Progress table in the plan when done and summarize what I need to test manually.
```

## Phase 2 — Sign & send MVP

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Implement Phase 2 only
(sign & send MVP from /tools/nda), following D5–D11 and sections 4–5.

- Add email to the NDA Parte (prefill from the selected client when available).
- Build SignAndSendButton + SignAndSendSheet exactly as described in the plan (pre-filled
  owner/counterparty, default subject/message, collapsed advanced options with defaults,
  lock warning). If DocuSign isn't connected, show the inline connect banner and resume the
  sheet after OAuth via returnTo.
- POST /api/signatures: verify Firebase ID token + document ownership, ensure the document is
  saved, build the envelope with the Phase 0 format (forSignature mode), owner = embedded signer
  (clientUserId = uid, routingOrder 1), counterparty = remote signer (routingOrder 2),
  envelope-level eventNotification to DOCUSIGN_WEBHOOK_BASE_URL/api/signatures/webhook/{token}
  (store only the sha256 of the token), create signature_requests, lock the document, return the
  recipient view URL. The webhook route itself is Phase 3; a stub returning 200 is fine.
- /signatures/return page handling signing_complete, cancel, decline, ttl_expired, session_timeout,
  exception — with the copy from the plan ("Firmado por ti. Enviado a …", "Pendiente de tu firma").
- POST /api/signatures/[id]/signing-url for "Continuar firma".
- Map DocuSign errors to friendly Spanish messages (reconnect, quota, invalid email).
- Add the Firestore rules + indexes from section 4 and emulator tests; don't deploy them.
Gate everything behind plan === 'Abogados'. Run type-check, lint, build and the rules tests.
Update the Progress table and give me a manual test script for the happy path and cancel path.
```

## Phase 3 — Tracking

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Implement Phase 3 only
(tracking), following D8–D9.

- Webhook route /api/signatures/webhook/[token]: look up by token hash, ignore the payload
  content except as a trigger, re-fetch envelope + recipients with the owner's token, update
  signature_requests (status, recipients, events timeline) and documents.signatureStatus.
  Must be idempotent and respond fast; unknown tokens → 404 without leaking info.
- GET /api/signatures/[id]/refresh, called on window focus for non-terminal requests.
- POST remind, POST void (unlocks the document), PATCH recipients (correct counterparty email).
- SignatureStatusChip in DocTable, SignatureTimeline + action buttons in DocPreviewPanel,
  "Pendientes de firma" quick filter in /documents. Live updates via onSnapshot.
Explain how I can test the webhook locally with a tunnel (cloudflared or ngrok) and
DOCUSIGN_WEBHOOK_BASE_URL. Run type-check, lint, build. Update the Progress table.
```

## Phase 4 — Completion filing & notifications

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Implement Phase 4 only.

- When a request reaches `completed` (from webhook or refresh, exactly once), download the
  combined signed PDF and the Certificate of Completion server-side, upload them to Storage
  using src/lib/storage-paths.ts conventions next to the original, and create two documents
  records (kind 'signed' and 'certificate', same caseId/clientId, signedFromDocumentId).
- In-app toast/badge when a counterparty views, signs or declines (listener on the user's
  signature_requests), and show signed docs + timeline on /cases/[id].
Run type-check, lint, build. Update the Progress table.
```

## Phase 5 — Roll out & polish

```
Read CLAUDE.md and docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md. Implement Phase 5.
Add SignAndSendButton to /tools/generacion, the /documents context menu and preview panel,
case detail, and the agent "document saved" toast — all using the same sheet. Add multiple
signers + CC, sequential/parallel toggle, optional access code for counterparties, Focused View
on desktop (keep redirect on mobile; check CSP), and a "Documentos esperando firma" KPI on the
Abogados dashboard. Add Playwright e2e for the sheet with mocked API routes.
Update the Progress table.
```

## Separate task — Gmail token hardening

```
Read docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md ("Related hardening"). Gmail OAuth tokens
(gmailAccessToken, gmailRefreshToken) live in users/{uid}, which the owner's browser can read.
Move them to integration_secrets/{uid}.gmail using the shared crypto helper src/lib/integrations/crypto.ts
(move it to a shared location if cleaner), update all src/app/api/gmail routes and src/lib/gmail.ts,
and write a one-off migration script in scripts/ (dry-run by default) that moves existing tokens
and deletes the old fields. Don't run the migration against production.
```
