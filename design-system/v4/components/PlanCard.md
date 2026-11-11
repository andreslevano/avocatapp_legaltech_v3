PlanCard presents one plan — on the pricing section (with features + CTA) and as a selectable radio card in signup.

**Consumer provides:** `plan` (from the single `PLANS` constant), `selectable`, `checked`, `compact`.

**Pricing as proposed (decision needed — see Content):**
- **Abogados** — 75 €/mes, 14 días gratis sin tarjeta. Badge “Más elegido”.
- **Particulares** — 10 €/escrito, pago único. Merges today's “Solo escritos 10 €/escrito” with the Autoservicio page's “pago por documento, sin suscripción”. The 50 €/mes · 100 créditos bundle either becomes an optional “Bono” or is dropped — the site currently states both.
- **Estudiantes** — 3 €/escrito.
- **Empresas** — link “Hablar con ventas”, not a card.

**Rules:** one constant feeds home, product pages, signup, Stripe price ids and `ProductsMenu`; consumer prices must be shown with IVA included (Spain, consumer law) and the card says so; selectable cards are `role="radio"` in a `radiogroup`.

**Replaces:** `landing/PricingSection.tsx`, `Pricing.tsx`, `auth/PlanCards.tsx` (which omits “Solo escritos”).
