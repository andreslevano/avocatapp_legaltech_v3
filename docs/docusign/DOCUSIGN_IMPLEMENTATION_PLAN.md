# DocuSign "Firmar y enviar" — Implementation Plan

**Status:** Approved for implementation · **Owner:** Andrés Levano · **Created:** 2026-10-09
**Source of truth for Claude Code sessions.** Every implementation prompt references this file.
Update the "Progress" section at the end of each phase.

---

## 1. Goal

From a finished document, the user clicks **"Firmar y enviar"**, reviews a pre-filled sheet,
signs inside DocuSign (embedded signing), and DocuSign automatically emails the counterparty.
Avocat tracks status live and files the signed PDF + Certificate of Completion back into
`/documents` and the linked case.

Model: **each user connects their own DocuSign account** (OAuth Authorization Code Grant).
Envelopes are sent from the user's account and count against the user's DocuSign plan.

Out of scope for v1: Avocat-owned DocuSign account, templates managed in DocuSign,
bulk send, advanced/qualified signatures (IDV), non-DocuSign providers
(but the code must keep a thin provider abstraction so they can be added later).

---

## 2. Architecture decisions (fixed)

| # | Decision | Value |
|---|---|---|
| D1 | Auth | OAuth Authorization Code Grant (confidential client), scopes `signature extended` |
| D2 | API access | Plain `fetch` against eSignature REST API v2.1 via a small typed client in `src/lib/docusign/`. **Do not** add the `docusign-esign` SDK. |
| D3 | Base URI | Always from `GET {oauthBase}/oauth/userinfo` → selected account's `base_uri` + `/restapi`. Never hard-code. |
| D4 | Token storage | Server-only Firestore collection `integration_secrets/{uid}`, tokens encrypted AES-256-GCM with the shared `INTEGRATION_TOKEN_ENC_KEY` (same key and helper `src/lib/integrations/crypto.ts` as the Microsoft connector, F1). No client rule → denied by catch-all. Only non-secret display info goes to `users/{uid}.integrations.docusign`. |
| D5 | Signing order | Routing order 1 = the user as **embedded signer** (`clientUserId` = Firebase uid); routing order 2+ = counterparties as remote signers (DocuSign emails them). |
| D6 | Embedded signing UX | v1: full-page redirect to the recipient view, `returnUrl` = `/signatures/return?rid={requestId}`. Focused View (in-page modal) is Phase 5. |
| D7 | Document sent to DocuSign | Text-based document (NOT the html2canvas raster PDF). Format chosen in the Phase 0 spike: preferred = the same HTML from `buildDocHtml()` sent with `fileExtension: 'html'` (or a pdfkit-rendered PDF) containing invisible anchor strings `\\s1\\`, `\\d1\\`, `\\s2\\`, `\\d2\\` … for signature/date tabs. The stamped `signatureUrl` image must be omitted in this mode. |
| D8 | Status updates | Envelope-level `eventNotification` (no admin config needed on the user's account). Webhook URL carries an opaque per-request token; the handler **does not trust the payload** — it re-fetches envelope + recipients from the API with the owner's token and updates Firestore from that. |
| D9 | Fallback sync | `GET /api/signatures/[id]/refresh` re-syncs on demand (called on page focus for non-terminal requests). |
| D10 | Plan gating | Feature visible for `plan === 'Abogados'` only in v1 (constant, easy to extend to Autoservicio). |
| D11 | Locking | Once an envelope exists, the source document is locked (`lockedAt`). Edit = void + new version. |
| D12 | Repo hygiene | Ignore Finder duplicates (`* 2.ts`, `* 2.tsx`, `* 2.md`, folders `* 2`). Never edit or import them. |

---

## 3. Environment variables

| Var | Where | Example / note |
|---|---|---|
| `DOCUSIGN_INTEGRATION_KEY` | server | Integration Key (client id) from Apps & Keys |
| `DOCUSIGN_SECRET_KEY` | server | Secret key of the app |
| `DOCUSIGN_OAUTH_BASE` | server | `https://account-d.docusign.com` (demo) → `https://account.docusign.com` (prod) |
| `INTEGRATION_TOKEN_ENC_KEY` | server | Shared by all integrations (DocuSign, Microsoft, Gmail). 32 random bytes base64 (`openssl rand -base64 32`). Already set if F1 is done. |
| `DOCUSIGN_WEBHOOK_BASE_URL` | server | Public HTTPS base for webhooks. Dev: tunnel URL; prod: `https://avocatapp.com` |
| `NEXT_PUBLIC_APP_URL` | both | Already exists. `http://localhost:3000` in dev |

Redirect URIs registered in the DocuSign app:
- `http://localhost:3000/api/integrations/docusign/callback`
- `https://avocatapp.com/api/integrations/docusign/callback`

Production secrets must be provided to Firebase Hosting SSR **the same way `OPENAI_API_KEY` is today** (verify the mechanism in the repo before adding; do not invent a new one).

---

## 4. Data model

```ts
// integration_secrets/{uid}           — server-only (Admin SDK), no client rule
{ docusign: {
    accessTokenEnc, refreshTokenEnc, expiresAt: number,
    accountId, accountName, baseUri, userEmail, userName,
    connectedAt, updatedAt } }

// users/{uid}                          — display-only fields (client readable)
{ integrations: { docusign: { connected: boolean, email, accountName, connectedAt } } }

// signature_requests/{id}              — owner read-only; writes Admin SDK only
{ userId, documentId, caseId: string|null, clientId: string|null,
  provider: 'docusign', accountId, envelopeId,
  status: 'pending_owner'|'sent'|'delivered'|'completed'|'declined'|'voided'|'expired'|'error',
  recipients: [{ role: 'owner'|'signer'|'cc', name, email, routingOrder,
                 status, deliveredAt?, signedAt?, declinedReason? }],
  subject, message,
  options: { reminderDelayDays, reminderFrequencyDays, expireAfterDays, language: 'es'|'en' },
  webhookTokenHash,                    // sha256 of the opaque token in the webhook URL
  events: [{ type, at, by? }],         // timeline for the UI
  signedDocumentId?: string,           // documents/{id} of the signed PDF
  certificateDocumentId?: string,
  errorMessage?, createdAt, updatedAt }

// documents/{id}                       — add fields
{ signatureRequestId?: string,
  signatureStatus?: SignatureRequest['status'],
  lockedAt?: Timestamp,
  signedFromDocumentId?: string,       // on the signed PDF / certificate records
  kind?: 'original'|'signed'|'certificate' }
```

Status mapping for `/documents` chip (Spanish UI):
`pending_owner` → "Pendiente de tu firma" · `sent` → "Enviado" · `delivered` → "Visto" ·
`completed` → "Firmado" · `declined` → "Rechazado" · `voided` → "Anulado" · `expired` → "Caducado".
Keep the existing `DOC_ESTADOS` working for documents without a signature request.

Firestore rules to add:
- `signature_requests/{id}`: `allow read: if request.auth != null && resource.data.userId == request.auth.uid;` no client writes.
- `documents`: prevent clients from modifying `signatureRequestId`, `signatureStatus`, `lockedAt`, `kind`, `signedFromDocumentId`.
- Add emulator tests alongside the existing 33.

Indexes: `signature_requests`: `userId ASC + updatedAt DESC`; `userId ASC + status ASC + updatedAt DESC`.

---

## 5. File layout

```
src/lib/docusign/
  config.ts          # env reading + validation, constants (scopes, plan gating)
  # crypto: reuse src/lib/integrations/crypto.ts (AES-256-GCM, INTEGRATION_TOKEN_ENC_KEY) — don't add a second helper
  oauth.ts           # auth URL, code exchange, refresh, userinfo
  tokens.ts          # getValidAccessToken(uid): load, refresh if <5 min, persist; throws ReconnectRequired
  client.ts          # typed fetch wrapper: createEnvelope, getEnvelope, listRecipients,
                     # createRecipientView, updateRecipients, voidEnvelope, resend,
                     # getCombinedDocument, getCertificate
  envelope.ts        # build envelope definition from document + recipients + options
  status.ts          # DocuSign status → internal status, timeline events
src/lib/signatures/
  provider.ts        # SignatureProvider interface (docusign implements it)
  server.ts          # Firestore ops for signature_requests (Admin SDK)
  client.ts          # browser helpers calling the API routes with the ID token

src/app/api/integrations/docusign/
  auth/route.ts        # GET → { url } (nonce + state = uid:nonce:returnTo)
  callback/route.ts    # GET → exchange, userinfo, account selection, store, redirect to returnTo
  accounts/route.ts    # GET list / POST select account (multi-account users)
  disconnect/route.ts  # POST → revoke locally, warn if active requests
src/app/api/signatures/
  route.ts                      # POST create envelope + return signingUrl
  [id]/signing-url/route.ts     # POST → fresh recipient view (resume "Continuar firma")
  [id]/refresh/route.ts         # GET  → re-sync from DocuSign
  [id]/remind/route.ts          # POST → resend
  [id]/void/route.ts            # POST → void + unlock document
  [id]/recipients/route.ts      # PATCH → correct counterparty email/name
  webhook/[token]/route.ts      # POST → DocuSign eventNotification

src/app/(app)/signatures/return/page.tsx   # handles ?event= signing_complete|cancel|decline|ttl_expired…
src/components/signatures/
  SignAndSendButton.tsx     # gating + opens sheet
  SignAndSendSheet.tsx      # review panel (recipients, message, advanced, lock warning)
  ConnectDocusignCard.tsx   # used in Profile → Integraciones and inline banner
  SignatureStatusChip.tsx
  SignatureTimeline.tsx     # used in DocPreviewPanel and case detail
```

All API routes authenticate with `Authorization: Bearer <Firebase ID token>` verified via
`authAdmin().verifyIdToken()` (same pattern as `src/app/api/gmail/auth/route.ts`),
and check ownership of `documentId` / `signature_requests/{id}`.

---

## 6. Phases & acceptance criteria

### Phase 0 — Spike: document format & anchors (half day)
- Script in `scripts/docusign-spike.ts` that (using a manually pasted demo access token from env) creates a draft envelope from a sample NDA via `buildDocHtml()` HTML and checks anchor tabs land on the signature blocks for Parte A / Parte B. Compare with a pdfkit PDF if HTML conversion looks wrong.
- **Done when:** a decision is recorded in this file (D7) with a screenshot/description of tab placement, and the doc builder has a `forSignature: true` mode that omits `signatureUrl` and emits anchors.

### Phase 1 — Connect DocuSign
- `src/lib/docusign/{config,crypto,oauth,tokens}.ts`, `api/integrations/docusign/*`.
- Profile → **Integraciones** section with `ConnectDocusignCard` (connected as …, account, change account, disconnect).
- `returnTo` support so the connect flow can resume the sign sheet.
- Multi-account picker when userinfo returns >1 account.
- Unit tests for crypto + token refresh logic.
- **Done when:** connect → refresh after expiry → disconnect works against demo; no secret ever appears in `users/{uid}` or in the browser network tab.

### Phase 2 — Sign & send MVP (entry point: `/tools/nda` only)
- Add `email` to the NDA `Parte` (prefill from `clients` when a client is picked).
- `SignAndSendButton` + `SignAndSendSheet` (pre-filled: owner from DocuSign account; counterparty from Parte B; default subject/message; advanced collapsed with defaults: reminder 3/3 days, expire 30 days, language = doc language).
- If not connected: inline banner → connect → come back with the sheet re-opened.
- `POST /api/signatures`: save document first if not saved, build envelope (status `sent`, owner routing 1 embedded, counterparty routing 2, eventNotification with token URL), create `signature_requests`, lock document, return recipient view URL → redirect.
- `/signatures/return`: handle `signing_complete` (refresh + success screen "Firmado por ti. Enviado a X"), `cancel` ("Pendiente de tu firma" + Continuar firma), `decline` (void + unlock), other events.
- Friendly errors: reconnect required, quota exceeded, invalid email.
- **Done when:** full happy path works in demo with a real second inbox; counterparty receives the DocuSign email only after the owner signs.

### Phase 3 — Tracking
- Webhook route (token lookup by hash → re-fetch from API → update request + document status + timeline). Idempotent; always 200 quickly for known tokens.
- `refresh` endpoint + on-focus resync for non-terminal requests.
- `SignatureStatusChip` in `DocTable`; `SignatureTimeline` + actions (Recordar / Corregir email / Anular / Continuar firma) in `DocPreviewPanel`.
- "Pendientes de firma" quick filter in `/documents`.
- **Done when:** statuses update live (onSnapshot) through sent → delivered → completed, and declined/voided paths, tested via tunnel.

### Phase 4 — Completion filing & notifications
- On `completed`: download combined signed PDF + certificate (server), upload to Storage next to original (same path rules in `storage-paths.ts`), create two `documents` records (`kind: 'signed' | 'certificate'`, same caseId/clientId), set original `signatureStatus: 'completed'`.
- In-app toast/badge when counterparty views/signs/declines (listener on the user's `signature_requests`).
- Case detail shows signed docs and the timeline.
- **Done when:** signed PDF + certificate appear in `/documents` and the case within a minute of the counterparty signing.

### Phase 5 — Roll out & polish
- Entry points: `/tools/generacion`, `/documents` context menu + preview panel, case detail, agent saved-doc toast.
- Multiple signers + CC, sequential/parallel toggle, optional access code / SMS for counterparty.
- Focused View (in-page modal) on desktop; keep redirect on mobile.
- Dashboard KPI "Documentos esperando firma".
- **Done when:** all entry points use the same sheet; Playwright e2e for the sheet (mocked API).

### Phase 6 — Go-live
- Run ≥20 successful demo API calls, submit go-live review in DocuSign, promote key.
- Switch `DOCUSIGN_OAUTH_BASE` to production, add prod redirect URI, set prod secrets, `DOCUSIGN_WEBHOOK_BASE_URL=https://avocatapp.com`.
- Privacy policy update (DocuSign as processor), tooltip on legal validity (SES under eIDAS).
- Smoke test with a real account.

### Related hardening (separate task, recommended)
Gmail OAuth tokens are currently stored in `users/{uid}` (`gmailAccessToken`, `gmailRefreshToken`), which the owner's browser can read under current rules. Migrate them to `integration_secrets/{uid}` using the same crypto helper.

---

## 7. Progress

| Phase | Status | Notes |
|---|---|---|
| 0 | ☐ | |
| 1 | ☐ | |
| 2 | ☐ | |
| 3 | ☐ | |
| 4 | ☐ | |
| 5 | ☐ | |
| 6 | ☐ | |
