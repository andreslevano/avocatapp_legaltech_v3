# Patterns & guidelines

## Templates

Each template names the components it is built from. Theme in brackets.

**Marketing home** [light] — Navbar · hero (eyebrow, `display` headline with one italic `accent-text` phrase, `body-lg` lead, primary + secondary CTA, three verifiable proof points, product mock in the dark theme) · problem section · PersonaTabs (segmented Tabs) · “Cómo funciona” in 4 steps · features 4×3 with Lucide icons · PlanCard ×3 + “Hablar con ventas” · FAQ (disclosure list) · closing CTA band (`surface-inverse`, accent button) · Footer · CookieBanner.

**Persona product page** [light] — Navbar (current persona marked) · hero with the persona's promise and *its* price · what you can do (3–6 cards) · how it works (Stepper visual) · example output (DocumentPreview excerpt, with AIDisclaimer) · plan card · FAQ specific to the persona · Footer. Particulares pages add “¿Cuándo necesitas un abogado?” (legal thresholds per procedure). No stats unless sourced.

**Auth** [light, split layout ≥ 1024: form 7/12, value panel 5/12 dark]
- *Signup:* plan radio cards → Google → email fields (Nombre, Apellidos, Email, País combobox, Contraseña) → two separate unticked consents → primary “Crear cuenta y empezar la prueba” (Abogados) / “Crear cuenta” (others). `?plan=` preselects.
- *Login:* email + password, “¿Olvidaste tu contraseña?” (quiet link), Google; no persona tabs (the account knows its plan).
- *Onboarding:* only what the plan needs (Abogados: despacho name, areas, import first case; Particulares: “¿Qué quieres hacer?” → wizard; Estudiantes: university, year). Never ask for the plan again.

**App shell** [dark] — AppShell (Rail + Sidebar + header) for every authenticated route, including profile and subscription.
- *Lawyer dashboard (Panel):* 4 KPICards · overdue Alert if any · DeadlineItem list (8) + status distribution · recent cases DataTable · agent shortcut.
- *Case list → detail:* list = DataTable with status filter chips (Todos · Urgentes · Próximos · Vencidos · A tiempo — replacing the `casos-*` routes), search, Pagination. Detail = Breadcrumbs · header (title, client, nº procedimiento, StatusTag, actions) · Tabs (Resumen · Documentos · Plazos · Notas · Agente) · agent panel docked ≥ 1280.
- *Agent workspace:* AgentChat (760 column), ContextChips, history drawer; on case detail as a 400px panel.
- *Document generation wizard:* Stepper (Datos → Documentos → Revisión → Pago → Descarga) · one question group per screen · FileDropzone with OCR progress · extracted data in a Drawer for confirmation · DocumentPreview with AIDisclaimer · confirmations · payment (Stripe Checkout) · AIJobProgress · download (PDF + DOCX) + “Qué hacer ahora” (where and how to file).
- *Repository:* DocumentCard list grouped by case, filters (tipo, estado, fecha), search; empty state teaches upload.
- *Subscription & billing:* current plan card, CreditsMeter, payment method, invoices table (DataTable), cancel flow (Modal with consequences, no dark patterns: cancel as easy as subscribe).
- *Profile:* Field forms in sections (Datos, Despacho, Idioma y país, Notificaciones, Privacidad y datos — export / delete account).

**Legal & static pages** [light] — Navbar · `size-prose` column · `h1` + “Última actualización” · table of contents for long pages · numbered sections in `body` · Footer. Pages: Aviso legal, Privacidad, Cookies (with the cookie table), Términos, Seguridad / Subencargados.

## Trust & compliance patterns

*Design guidance; validate wording with counsel.*

1. **AI disclaimer placement** — block form on: every DocumentPreview, the export/download confirmation, the wizard review step, product pages beside any “listo para presentar” claim. Inline form under the agent composer. Text is fixed (see AIDisclaimer card). Generated files carry a footer note until the user confirms review.
2. **Human-review checkpoint before export** — export/download is enabled only after (a) highlighted extracted data is confirmed and (b) the user ticks “He revisado el documento” (Particulares also: “Entiendo que debo presentarlo yo”). Abogados can turn the tick into a per-account setting, logged with time and user.
3. **Citations** — every legal claim links to a CitationBlock entry with reference and verification status; un-located citations are flagged in the answer and excluded from exports unless the user explicitly keeps them.
4. **Upload privacy notice** — under every FileDropzone: encryption, who can access, retention, no training. Link to the processor list. Say it only if true and contractually guaranteed (e.g. OpenAI API data-use terms).
5. **Cookie consent** — CookieBanner before any non-essential script; “Rechazar todas” and “Aceptar todas” equal; per-category settings; consent logged; “Configurar cookies” in the footer.
6. **Footer legal identification** — razón social, NIF, domicilio, registro mercantil, email; “Avocat no es un despacho de abogados y no presta asesoramiento jurídico.”
7. **Claims** — badges link to evidence (Seguridad page, status page, DPA). No unsourced numbers.
8. **Consumer pricing** — taxes included and stated for Particulares and Estudiantes; renewal terms next to subscription CTAs; cancellation path one click from Subscription.
9. **Escalation** — Particulares answers include “¿Necesitas un abogado?” when the matter exceeds self-representation thresholds or the agent's confidence is low.

## Accessibility checklist (WCAG 2.2 AA)

- [ ] Text ≥ 4.5:1, large text ≥ 3:1, controls/focus/icons ≥ 3:1 — use roles only (all pairs pre-checked in both themes).
- [ ] Visible `:focus-visible` on every interactive element; never `outline: none` without replacement; focus not obscured by sticky headers/bottom nav (2.4.11).
- [ ] Every control has a programmatic label; errors linked via `aria-describedby`; ErrorSummary on submit.
- [ ] Status never by colour alone (icon + word).
- [ ] Touch targets ≥ 24×24 (2.5.8) everywhere, 44×44 on touch layouts.
- [ ] Keyboard: Tabs, Combobox, DatePicker, Menu, Modal follow WAI-ARIA patterns; modals trap focus and restore it.
- [ ] Live regions: agent log `role="log"`, upload/OCR/generation progress `aria-live="polite"`, errors `role="alert"`.
- [ ] Streaming text doesn't announce per token; Stop button available.
- [ ] `prefers-reduced-motion` respected.
- [ ] Charts: `role="img"` + summary, “Ver como tabla”.
- [ ] Documents: generated PDFs tagged (title, language `es`, headings) where the library allows.
- [ ] Zoom to 200 % and 320px reflow without horizontal scroll (except data tables, which switch to cards).
- [ ] Accessible authentication (3.3.8): allow paste and password managers; no cognitive tests.
- [ ] `lang="es"` (and `lang` per locale).

## Responsive rules

| | 375 (phone) | 768 (tablet) | 1280+ (desktop) |
|---|---|---|---|
| Public nav | Logo + primary CTA + menu drawer | Full links if they fit, else drawer | Full |
| Hero | 1 column, product mock below copy, `display` 40 | 1 column | 7/5 split, `display` 56 |
| Pricing | Cards stacked, featured first | 2 + 1 | 3 across |
| App nav | Header + BottomNav (5) | Rail; sidebar as overlay | Rail + sidebar |
| Agent | Full-screen; BottomNav hidden while typing | Full content width | 760 column; or docked 400 panel on case detail |
| Tables | Card list | Table, horizontal scroll if > 5 columns | Table |
| Wizard | One question group per screen, sticky bottom CTA (48px) | Same, centred 600 | Form + live preview side by side |
| Modals | Bottom sheet, full width buttons | Centred | Centred |
| Document preview | Paper at full width, 16/26 | Paper 720 | Paper 720 + side panel (extracted data) |

Test at 375 × 667 with the on-screen keyboard open for every form and the composer.
