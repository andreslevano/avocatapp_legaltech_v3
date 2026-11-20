# Yousign as Avocat's primary e-signature provider — implementation plan

Status: **PLAN — awaiting approval. Nothing implemented yet.**
Date: 2026-11-20 · Branch (proposed): `feat/yousign` from `dev`
Related: `docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md` (DocuSign stays, as the secondary provider)

API facts below come from the Yousign v3 docs (now served at `developers.youtrust.com`; base URLs are
unchanged). Anything marked **[spike]** could not be confirmed from the docs and is checked in Phase Y0
against the sandbox before it is built on.

---

## 1. Goal and scope

A lawyer gets **the same "Firmar y enviar" workflow as today**, end to end, powered by Yousign:
- the same sheet;
- the same statuses: Pendiente de tu firma · Enviado · Visto · Firmado · Rechazado · Caducado · Anulado;
- the same actions: Recordar · Corregir email · Anular · Continuar firma · Actualizar estado;
- the same locking;
- the same filing next to the original;
- the same notifications and "Pendientes de firma" view.

DocuSign stays in the code, behind the same interface, as an optional secondary provider. Its behaviour and
tests do not change.

**Out of scope:**
- QES;
- AES activation (the model supports it; enabling it needs Yousign support and signer phones);
- bulk send;
- signature credit consumption (Precios v4: it doesn't change here, see §12);
- editing the legal pages without your OK.

---

## 2. What exists today (DocuSign) — read end to end

| Piece | Where | What it does |
|---|---|---|
| Sheet | `components/signatures/SignAndSendSheet.tsx` (`DigitalSignSheet`) | Signers (1–5) and CC (≤5); sequential or parallel; subject and message; advanced: reminder delay/frequency, expiry, language; "Pedir código de acceso"; "Conectar DocuSign" gate |
| Create | `POST /api/signatures` → `signatures/server.ts › startSignatureRequest` | Checks ownership, negotiation draft and active request. Builds the signing HTML (`buildDocHtml(…, {forSignature:true})` with anchors `\sN\` `\dN\`; adds missing "Firma:" blocks). Creates the envelope with a per-request webhook token, stores `signature_requests/{id}`, locks the document (`signatureRequestId`, `signatureStatus`, `lockedAt`, `kind:'original'`) and returns the owner's embedded signing URL |
| Owner signing | `FocusedSigningHost.tsx` (desktop modal) or a full-page redirect; `/signatures/return` → `POST …/return` | `signing_complete` → `sent`; decline → void + unlock |
| Status | `POST /api/signatures/webhook/[token]` → `handleConnectWebhook` → `sync.ts › deriveSync` | Monotonic, idempotent merge from the payload. Completion files the signed PDF **inline** (the SSR function may freeze after the response) |
| Actions | `…/[id]/{signing-url,remind,recipients,void,refresh}` | Continuar firma · Recordar (max 1 per hour) · Corregir email (DocuSign updates and resends) · Anular (unlock) · Actualizar estado (max 1 per 15 min) |
| Filing | `fileSignedDocument` + `filing.ts` | One combined PDF (documents + Certificate of Completion) as `kind:'signed'`, same folder, case and client; lease plus `signedDocumentId` guarantee exactly once; `startContractOnSigning` |
| UI | `SignaturePanel.tsx` (timeline + actions), `/documents` chips (`watchSignatureStatuses`), `SignatureNotifier`, case detail, `canSendForSignature` | Spanish labels in `types.ts` |
| Data | `signature_requests/{id}` (owner read-only); `documents.{signatureRequestId,signatureStatus,lockedAt,kind,signedFromDocumentId}` (server-only fields) | `provider: 'docusign'` is already stored on every record |
| Gate | `canUseDocusign(plan, who)` = Abogados + preview list; `requireDocusignUser` on the routes | — |

---

## 3. Architecture

### 3.1 `SignatureProvider` interface — `src/lib/signatures/providers/`

```ts
interface SignatureProvider {
  id: 'yousign' | 'docusign';
  createAndSend(ctx: CreateCtx): Promise<{ externalIds: ExternalIds; recipients: StoredRecipient[] }>;
  getSenderSigningSession(r: SignatureRequest, opts): Promise<SigningTarget>;     // Continuar firma
  getSignerLink(r, recipientKey): Promise<{ url: string; expiresAt?: string }>;  // fresh link, never stored
  remind(r, recipientKeys): Promise<void>;
  updateSignerEmail(r, recipientKey, email, name): Promise<'updated' | 'recreate_required'>;
  void(r, reason): Promise<void>;
  parseWebhook(req: RawRequest): Promise<NormalizedEvent[] | 'unauthorized'>;   // verify + normalise only
  downloadSigned(r): Promise<Buffer>;
  downloadAuditTrails(r): Promise<{ recipientKey: number; pdf: Buffer }[]>;     // DocuSign: [] (certificate is inside the combined PDF)
}
```

- **`providers/docusign.ts`:** wraps the existing `docusign/api.ts` calls moved out of `server.ts`. There is no logic change, and the existing tests must stay green (Phase Y1 does nothing else).
- **`providers/yousign/`:**
  - `client.ts`: `fetch` with a Bearer key, 429 handling and no retries in loops;
  - `requests.ts`: the API calls;
  - `webhook.ts`: HMAC verification and normalisation;
  - `map.ts`: pure status mapping.
- **`server.ts` stays the orchestrator.** It owns the Firestore record, locking, the timeline, notifications and filing, and calls `providerFor(r.provider)`.
- **Normalised events:** `owner_signed | recipient_delivered | recipient_completed | recipient_declined(reason) | completed | declined | voided | expired`. They feed the existing monotonic merge (`deriveSync` is generalised from DocuSign's summary to a normalised summary). The labels and statuses the UI reads do not change.

### 3.2 Provider selection

- **New request:** `SIGNATURE_PROVIDER_DEFAULT` (default `yousign`). DocuSign is used only when `DOCUSIGN_ENABLED=true` **and** the user has DocuSign connected **and** they pick it.
- **Choosing DocuSign in the sheet:** the "Firma digital" step shows "Con Yousign (recomendado)". "Con tu cuenta de DocuSign" appears only under those conditions.
- **Existing records:** they keep `provider: 'docusign'` and every action is routed to DocuSign, whatever the default.
- **No Yousign account for lawyers:** there is no per-lawyer Yousign account; one Avocat API key is used, server-side only. "Conectar DocuSign" is never required on the Yousign path.
- **Gate:** `canUseDigitalSignature(plan, who)` replaces `canUseDocusign` in the UI. It is Abogados and, during the sandbox phase, the same preview list. Opening it to all Abogados is decision **O4**.

---

## 4. DocuSign → Yousign mapping

| Concept | DocuSign (today) | Yousign v3 |
|---|---|---|
| Container | Envelope | Signature request: `POST /signature_requests` `{name, delivery_mode:'none', ordered_signers, expiration_date:'yyyy-mm-dd', signers_allowed_to_decline:true, external_id:<our request id>, audit_trail_locale:'es'\|'en', timezone:'Europe/Madrid'}` |
| Document | HTML with anchor strings | **PDF with a text layer** (`POST …/documents`, multipart `file`, `nature:'signable_document'`); see §5 |
| Field placement | Anchors `\sN\` `\dN\` | **Coordinates** from our own PDF renderer (`fields:[{document_id,type:'signature',page,x,y,width,height}]`); smart anchors `{{sN\|signature\|w\|h}}` as plan B |
| Signers | owner = embedded (`clientUserId`), others = remote | `POST …/signers` `{info:{first_name,last_name,email,locale}, signature_level:'electronic_signature', signature_authentication_mode:'no_otp'\|'otp_email', fields}`. All of them `delivery_mode:'none'`: Avocat delivers every link (§6) |
| Send | Envelope status `sent` | `POST …/activate` → `status:'ongoing'` + each signer's `signature_link` (valid **48 h** by default) |
| Order | routingOrder | `ordered_signers:true` for "En orden". "A la vez" = `ordered_signers:false` and Avocat emails the others only after the owner signs **[spike: ordering semantics with delivery_mode none]** |
| Owner signing | Recipient view / Focused View | **Yousign iframe SDK** (`new Yousign({signatureLink, iframeContainerId, isSandbox})`, events `started/success/declined/error/signature.done`); no `redirect_urls` |
| Access code | Our own code, shared by the owner | No equivalent. Maps to `signature_authentication_mode:'otp_email'` (Yousign emails the signer a code); decision **O3** |
| CC | `carbonCopies` (DocuSign emails them the result) | Avocat emails the signed PDF from our email service on completion (Yousign "followers" would be Yousign-branded email) |
| Reminders | DocuSign notification settings + manual resend | Yousign reminders are its own emails (intervals only 1, 2, 7 or 14 days), so they don't apply with `delivery_mode:'none'`. **Avocat sends the reminders** (our template, fresh link) from the existing hourly cron, every 3 days by default. "Recordar" = the same email on demand (max 1 per hour) |
| Correct email | `PUT recipients?resend_envelope=true` | Not possible after activation **[spike]** → cancel + recreate as a new version (the owner signs again), with a clear message; decision noted in §8 |
| Void | `PUT envelope {status:'voided'}` | `POST …/cancel` `{reason, custom_note}` **[spike: body]** |
| Status updates | Per-envelope Connect webhook + URL token | One account-level subscription → `POST /api/signatures/yousign/webhook`, HMAC (§7) |
| Viewed | `delivered` | `signer.link_opened` → Visto |
| Signed / declined | recipient `completed` / `declined` | `signer.done` / `signer.declined` (`data.reason`) |
| Done / expired / voided | envelope `completed` / voided "expir…" / `voided` | `signature_request.done` / `.expired` / `.canceled` (`.declined` too) |
| Filing | `documents/combined?certificate=true` (1 call) | Signed PDF **[spike: exact path, PDF or zip]** + one audit trail per signer `GET …/signers/{id}/audit_trails/download` |
| Expiry | `expireAfter` 1–120 days | `expiration_date` (date only, no offset; max 1 year); our field stays 1–120 |
| Language | email language | signer `info.locale` and `audit_trail_locale` `es`\|`en` |
| Level | — | `signatureLevel: 'ses' \| 'aes'` in our model → `electronic_signature` \| `advanced_electronic_signature` (AES needs `otp_sms`, a phone and activation by Yousign support; not enabled now) |

Status mapping (pure, unit-tested `map.ts`):

| Event | Request status | Recipient status |
|---|---|---|
| activate (owner not signed) | `pending_owner` · Pendiente de tu firma | owner `sent`, others `created` |
| iframe `success`, or `signer.done` for the owner | `sent` · Enviado | owner `completed`; next signer(s) `sent` |
| `signer.link_opened` (counterparty) | `delivered` · Visto (when all pending have opened, as today) | `delivered` |
| `signer.done` (counterparty) | stays, or completed on `signature_request.done` | `completed` |
| `signer.declined` / `signature_request.declined` | `declined` · Rechazado (+ reason) → unlock | `declined` |
| `signature_request.expired` | `expired` · Caducado → unlock | — |
| `signature_request.canceled` | `voided` · Anulado → unlock | — |
| `signature_request.done` | `completed` · Firmado → filing | all `completed` |

---

## 5. The document sent to Yousign (main technical risk)

Yousign signs **PDFs only**. Today's browser PDF is an image (html2canvas), so it has no text layer and no
reliable positions. The signing PDF is therefore rendered **on the server**, from the same source DocuSign
uses (`withSignatureBlocks(markdown)`, or the saved `.doc` via `signingHtmlFromSaved`).

| Option | How | Look | Cost and risk |
|---|---|---|---|
| **A (recommended)** | `pdfkit` (already a dependency, used in `src/lib/pdf/*`): a renderer for the doc-html block model (title, headings, paragraphs, lists, bold and italic, logo and header colours, footer credit on every page, signature blocks). It returns the PDF **plus the exact page and x/y of each "Firma:" and "Fecha:" block** → Yousign fields by coordinates | Close to the Word and PDF output; pdfkit standard fonts (Times / Helvetica) unless we embed the branding font | Light; deterministic; no anchor uncertainty |
| B | Headless Chromium on the SSR (`puppeteer-core` + `@sparticuz/chromium`) printing `buildDocHtml` → smart anchors `{{sN\|signature\|170\|60}}` in white | Identical to the Word and PDF output | About 60 MB more and slower cold starts on Cloud Run; anchors must be single-line and ≤ 150 pages |
| C | Smart anchors inside option A's PDF | As A | Fallback if coordinates misbehave |

**Date next to each signature:** a Yousign `mention` field with the signing date, or the date taken from the
audit trail **[spike]**. If neither works, the signed PDF keeps the empty "Fecha: ____" line and the audit
trail carries the timestamp (stated in the UI).

---

## 6. Owner and counterparty signing; links

- **The owner signs embedded:**
  - `POST /api/signatures` returns `{requestId, provider:'yousign', signingLink}`.
  - The link is fetched fresh and never stored. On sandbox it gets `&disable_domain_validation=true`.
  - `YousignSigningHost` (the counterpart of `FocusedSigningHost`, mounted in the app shell) loads the SDK script (pinned `iframe-sdk-1.6.1.min.js` + SRI) in a modal on **all** devices (mobile included: no full-page redirect is needed).
- **Owner iframe events:**
  - `success` → `POST …/return {event:'signing_complete'}` (as today) → `sent`, and the server emails the next signer(s);
  - `declined` → `owner_declined` (Yousign has already declined the request; we unlock);
  - `error` → error state with "Reintentar";
  - closing the modal before signing → stays "Pendiente de tu firma" with "Continuar firma".
  - The webhook (`signer.done` for the owner) is the source of truth if the iframe event is lost.
- **Counterparties: the Avocat email.**
  - Template: «<Nombre> (vía Avocat) te ha enviado un documento para firmar». Spanish or English, branded with `layout()`, through the existing `sendEmail`, reply-to = owner.
  - Signing links expire after 48 hours, while a request lives 30 days, and the docs show no endpoint to regenerate a link **[spike: does `GET /signature_requests/{id}/signers/{signerId}` or another call return a fresh link?]**. So the email never carries the Yousign link.
  - The email links to an **Avocat page `/firma/{token}`**: an opaque, revocable token; only its hash is stored, in `signature_invites/{hash}`, the same pattern as data requests and negotiations.
  - On open, the server fetches a **fresh** signing link and shows it in the Yousign iframe on our domain, so the signer never needs an account.
  - Reminders, "Recordar" and resends reuse the same invite link (or rotate it on email correction).
  - **Fallback if the spike shows no way to get a fresh link:** that signer uses `delivery_mode:'email'` (Yousign emails them, handles reminders and fresh links), with our text in `email_notification.custom_text`. That means Yousign-branded email; decision **O2**.

---

## 7. Webhooks (< 1 s) and background processing

- **Endpoint:** `POST /api/signatures/yousign/webhook`.
  - Reads the **raw body**.
  - Verifies `x-yousign-signature-256 == 'sha256=' + hex(HMAC_SHA256(YOUSIGN_WEBHOOK_SECRET, rawBody))` with `timingSafeEqual`.
  - Checks `sandbox` matches the environment.
  - `create()` on `signature_webhook_events/{event_id}`: an existing document means a retry, so it returns 200 without reprocessing.
  - Stored: `{event_name, event_time, yousignRequestId, externalId, payload (trimmed), receivedAt, processedAt:null}`.
  - Then **returns 200** (one Firestore write, well under 1 s).
- **Processing:** the SSR may freeze once the response is sent, so the work is not done in the request.
  - A Cloud Function `onDocumentCreated('signature_webhook_events/{id}')` (in `functions/`, the same pattern as `contractAlertsHourly`) calls `POST /api/signatures/yousign/process` on the SSR with `Authorization: Bearer CRON_SECRET`.
  - The processor loads the request by `external_id`, applies the normalised event (monotonic, idempotent transaction), creates notifications, sends counterparty emails, and files on `signature_request.done`. Then it sets `processedAt`.
  - Failures keep `processedAt:null` plus an `error`. The hourly cron retries unprocessed events older than 2 minutes (max 5 attempts).
  - The UI reads Firestore only. There is no polling, and "Actualizar estado" keeps its 15-minute throttle (one `GET /signature_requests/{id}`).
- **Rate limits:** sandbox 30 per minute and 200 per hour; production 60 per minute and 1,200 per hour; HTTP 429 handled with a clear message.
  - Calls per signature: about 4 + N to send, 1 per fresh link, 1 + N to file.
- **Secrets:** the API key and webhook secret are server-only, never logged and never sent to the browser. Signing links are treated as credentials: never stored, logged or put in a URL we keep.

---

## 8. Workflow parity — how each item is met

| # | Requirement | Yousign implementation |
|---|---|---|
| 1 | NDA with party emails | unchanged |
| 2 | Sheet prefilled; owner first; subject and message; advanced options | The same sheet. Changes: "Pedir código" → "Pedir código por email (Yousign)" (O3). Reminders: "cada N días" (our cron) |
| 3 | Save, lock, upload PDF, fields, signers, activate | `startSignatureRequest` → `provider.createAndSend` (render PDF §5 → create → upload → signers with fields → activate). The record and lock are written **before** activating; on any failure: cancel/delete the draft + unlock |
| 4 | Embedded owner signing with iframe events | §6 |
| 5 | Avocat emails the other party | §6 (invite page, our template) |
| 6 | Statuses via webhooks; timeline; notifications; Pendientes de firma | §4 mapping + §7 → existing `events[]`, `SignatureNotifier`, chips: unchanged UI |
| 7 | Recordar · Corregir email · Anular · Continuar firma | Recordar = our email (max 1/h). Corregir = cancel + recreate as a new version (the owner re-signs; the sheet says so), unless the spike shows a signer can be replaced. Anular = cancel + unlock. Continuar = fresh link → iframe |
| 8 | File signed PDF + audit trail | `fileSignedDocument`: signed PDF (`kind:'signed'`, "…_firmado_<fecha>.pdf") + audit trail per signer (`kind:'certificate'`, "…_registro_<Nombre>.pdf"), same folder, case and client; `signedDocumentId` + `auditTrailDocumentIds`; timeline "PDF firmado y registros de auditoría guardados"; case detail lists them |
| 9 | Declined, closed early, edit after sending, signed never edited | Unlock on declined, expired or voided (as today); "Pendiente de tu firma" + Continuar; Anular → edit → new version; signed records stay `kind:'signed'`, read-only |

---

## 9. Data model changes (Firestore — no SQL migrations)

```ts
// signature_requests/{id} — added (all optional; existing DocuSign records stay valid)
provider: 'yousign' | 'docusign';
signatureLevel?: 'ses' | 'aes';                         // default 'ses'
yousign?: { signatureRequestId: string; documentId: string;
            signers: { recipientKey: number; signerId: string }[] };
auditTrailDocumentIds?: string[];
// DocuSign-only fields stay (accountId, envelopeId, webhookTokenHash); typed as optional for Yousign records.

// signature_webhook_events/{event_id}  — server-only (no client rule → catch-all deny)
// signature_invites/{tokenHash}        — server-only: { requestId, recipientKey, expiresAt, revokedAt? }
// documents/{id}: kind 'certificate' reused for audit trails (already a server-only field)
```

- **No backfill:** every existing record already has `provider: 'docusign'`.
- **Rules:** the new collections are covered by the final deny-all, with an explicit comment and emulator tests (they need Java 21, as before).
- **Indexes:** `signature_webhook_events` `processedAt ASC + receivedAt ASC` (for the retry sweep).

---

## 10. Environment variables (you set them; never paste secrets in chat)

| Var | In `.env.local` now? | Note |
|---|---|---|
| `YOUSIGN_API_KEY` | **missing** | Sandbox key from the Yousign app (API → API keys) |
| `YOUSIGN_API_BASE` | **missing** | `https://api-sandbox.yousign.app/v3` now; production later |
| `YOUSIGN_WEBHOOK_SECRET` | **missing** | The subscription's secret key |
| `YOUSIGN_WEBHOOK_BASE_URL` | **missing** | Dev: a public HTTPS tunnel; prod: `https://avocatapp.com` |
| `SIGNATURE_PROVIDER_DEFAULT` | **missing** | `yousign` |
| `DOCUSIGN_ENABLED` | **missing** | `false` (keeps DocuSign hidden but working for existing records) |
| `CRON_SECRET` | check in Firebase Functions secrets | Reused by the webhook processor trigger |
| DocuSign vars, `EMAIL_USER/PASS`, `SIGNATURE_PROVIDER_LIVE` | present | Untouched. Set `SIGNATURE_PROVIDER_LIVE=true` once Yousign is live, so the pricing pages show "Firma Avocat" as available |

As for DocuSign, `.env.local` ships to the SSR on `firebase deploy --only hosting`.

---

## 11. Phases (one commit each; no push or deploy without your OK)

**Y0 — Sandbox spike (½–1 day).** Script `scripts/yousign-spike.ts`, which reads the env key and never prints it. It answers the **[spike]** items:
1. Render option A on a real NDA (persona and sociedad) and place fields by coordinates.
2. Ordered vs parallel with `delivery_mode:'none'`.
3. A fresh `signature_link` after activation.
4. The `cancel` body.
5. Signer update after activation.
6. The signed-document download path and format.
7. Date mention fields.
8. A real webhook payload captured through the tunnel.
9. The iframe on `localhost` with `disable_domain_validation`.

Output: a findings section appended here, then go/no-go on O2 and option A.

**Y1 — Provider abstraction (no behaviour change).** Move the DocuSign calls into `providers/docusign.ts`, generalise `deriveSync` to normalised events, and add `providerFor()`. All existing signature tests stay green.

**Y2 — Yousign send + owner embedded signing.**
- `providers/yousign/*`, the pdfkit signing renderer, `createAndSend`, `YousignSigningHost`;
- `…/return` and `…/signing-url` for Yousign;
- sheet changes (provider line, code → OTP, reminders);
- `canUseDigitalSignature`.

**Y3 — Webhooks.** Endpoint (HMAC, dedupe, < 1 s), `signature_webhook_events`, the Cloud Function trigger, the `/process` route, status mapping, notifications, the hourly retry sweep.

**Y4 — Counterparty delivery and actions.**
- `signature_invites`, the `/firma/[token]` page (public, light theme, iframe);
- the email template;
- Recordar, reminders in the cron, Corregir email (recreate flow), Anular, CC email on completion.

**Y5 — Filing.** Signed PDF + audit trails, idempotent with a lease; `startContractOnSigning`; case detail and timeline.

**Y6 — Copy, legal, docs.**
- Legal tooltip: «Firma electrónica simple (SES) conforme al Reglamento eIDAS, con Yousign. Firma avanzada (AES) disponible más adelante.»;
- provider wording in the UI;
- a runbook for the sandbox e2e test;
- a DocuSign plan note: secondary provider.

**Y7 — Production (with you).**
- Yousign production key and plan;
- iFraming → "Authorized domains only": `https://avocatapp.com`, `https://*.avocatapp.com`, the `web.app` host;
- a webhook subscription on the prod endpoint, `auto_retry: true`, events `signer.*` and `signature_request.*`;
- `SIGNATURE_PROVIDER_LIVE=true`;
- the privacy policy update (§13).

---

## 12. Test plan

- **Unit (`tests/unit/yousign*.node.spec.ts`):**
  - status mapping table (every row in §4);
  - normalised merge (monotonic, duplicates and out-of-order are no-ops, terminal frozen);
  - HMAC verification (valid, wrong secret, tampered body, missing header, `sha256=` prefix, constant-time path);
  - webhook idempotency (same `event_id` twice → processed once);
  - `expiration_date` formatting (no offset, max 1 year);
  - provider selection (default, `DOCUSIGN_ENABLED`, existing DocuSign record routes to DocuSign);
  - invite token rules;
  - signing PDF renderer (field coordinates for 2–6 blocks, missing blocks appended, page breaks);
  - email template escaping.
- **Existing DocuSign suites** (`docusign`, `signatures`, `signature-sync`, `signature-multi`, `signature-entry-points`, `signature-date`) must pass unchanged after Y1.
- **e2e (Playwright, mocked API):** the sheet with Yousign; the owner iframe host (fake SDK events: success, declined, error, closed); the `/firma/[token]` page states (valid, expired, revoked, signed); the panel actions.
- **Sandbox runbook (manual, Y6):**
  1. Generate an NDA.
  2. Firmar y enviar.
  3. Sign in the iframe.
  4. The other party's email arrives (the test inbox).
  5. Open → Visto.
  6. Sign → Firmado; the signed PDF and audit trails are filed in the case.
  7. Edge cases: counterparty declines (reason shown, document unlocked); owner closes before signing → Continuar firma; Anular → edit → new version; correct email → recreated version; expiry (short `expiration_date`); webhook replay (same event twice) → no duplicate filing.

---

## 13. Legal and privacy (to do with your OK)

Privacy policy changes needed (not edited yet):
- **New processor:** Yousign SAS (France, EU hosting) as data processor for e-signatures. Data it receives: signer names, emails, (AES) phone numbers, the signed documents, IP and evidence data in the audit trail.
- **Purpose and legal basis:** performance of the contract and legitimate interest in evidence. The retention period follows Yousign's archiving and our document retention.
- **Sub-processor list:** update it; DocuSign stays listed while it remains a secondary option.
- **DPA:** sign Yousign's DPA.

---

## 14. Open decisions (please answer before Y2)

| # | Decision | My recommendation |
|---|---|---|
| O1 | Parte A signer: sender only (as today) / client representative / both in order. The sheet will allow choosing; which default? | Default = sender (as today); option "El representante del cliente firma la Parte A" adds them as signer 1 (embedded only if it's the sender) |
| O2 | Counterparty link: Avocat email + `/firma/[token]` page (fresh link on open) vs Yousign's own email | Avocat page (our branding, links never expire for them); Yousign email only as the fallback if Y0 shows no fresh-link mechanism |
| O3 | "Pedir código de acceso" → Yousign OTP by email (the code is generated by Yousign, not chosen by the owner) | Yes; label "Verificación con código por email" |
| O4 | Who gets Yousign during sandbox / after go-live | Preview list now; all Abogados at production |
| O5 | Signing PDF rendering: pdfkit (A) vs headless Chromium (B) | A (lighter); B only if you need the signed PDF to look identical to the Word |
| O6 | Signature cost and credits (Precios v4 counts signature sends) | Keep it out of this task; track sends in `signature_requests` so credits can be wired later |
| O7 | Reminder default "every 3 days" is kept, sent by Avocat (Yousign only allows 1, 2, 7 or 14 days and only with its own emails) | Keep 3 days, owned by Avocat |
