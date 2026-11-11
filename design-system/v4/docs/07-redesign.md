# Redesign proof

Five screens rebuilt with the v4 components, each shown **before → after** on its card in the *Screens* group of Components (live, both rendered from this system's bundle). The “before” panels are recreations from the repository code and live copy, not screenshots — logged-in screens were not available.

| Screen | Card | Before (source) | What changed |
|---|---|---|---|
| 1. Home hero + persona tabs + pricing | **ScreenHome** | `landing/HeroSection.tsx`, `PersonaTabs.tsx`, `PricingSection.tsx`; live `/` | Cream hero with the real product (dark theme) as the image; black primary CTA; verifiable proof points; segmented persona tabs with prices; one pricing model across home, product pages and signup. |
| 2. Signup with plan selection | **ScreenSignup** | `auth/SignupForm.tsx`, `auth/PlanCards.tsx`; live `/signup` | Plan radio cards from `PLANS`; country Combobox (México, Perú); per-field errors; separate unticked consents; value panel tied to plan. |
| 3. Lawyer dashboard | **ScreenDashboard** | `src/app/dashboard/page.tsx`, `dashboard/KPICard.tsx`, `DeadlineList.tsx` | Accessible muted text; KPI trends with sign + arrow; overdue surfaced as an Alert; StatusTag deadlines; status distribution; recent cases table — all inheriting the dark theme. |
| 4. Agent chat with citation + disclaimer | **ScreenAgent** | `agent/AgentMessage.tsx`, `AgentInput.tsx`, `ToolCallBadge.tsx` | Readable 15/24 answers; tool steps with state; superscript citations → CitationBlock with verification; disclaimer that names the unverified source; composer with context chips and visible placeholder. |
| 5. Reclamación de cantidades at 375px | **ScreenWizardMobile** | `ReclamacionProcessSimple.tsx` | Five labelled steps; review before payment; highlighted extracted data on paper; explicit confirmations; sticky 48px CTA with price; autosave. |

## Pricing — the consistent version (decision required)

The live site states three incompatible models for particulares. v4 proposes the simplest consistent set; the business owner decides.

| Plan | Price | Model | Where shown |
|---|---|---|---|
| Abogados | 75 €/mes | Subscription, 14-day trial, no card | Home, product page, signup, ProductsMenu |
| Particulares | 10 €/escrito | Pay per document — matches “Solo escritos” and the Autoservicio page's “sin suscripción” | All of the above |
| Estudiantes | 3 €/escrito | Pay per document | All of the above |
| Empresas | Hablar con ventas | Link, not a card | Pricing footnote, ProductsMenu |

Open question: keep the 50 €/mes · 100 créditos bundle as an optional “Bono Particulares” (shown only inside the app when a user has bought ≥ 3 escritos) or retire it. Whichever wins, it lives in one `PLANS` constant that also holds the Stripe price ids.

## Assumptions

- Example names, amounts, case numbers and ECLI references are illustrative placeholders, not real or verified data.
- The calligraphic A is treated as the canonical mark; a vector version should be commissioned.
- “Datos alojados en la UE” in the hero is shown with an asterisk: keep it only if Firebase region and processors confirm it.
