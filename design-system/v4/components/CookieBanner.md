CookieBanner collects consent before any non-essential cookie fires.

**Rules (AEPD guidance, RGPD/LSSI-CE):**
- **Rechazar todas** and **Aceptar todas** have equal weight, same level, same style; “Configurar” opens per-category toggles (Analíticas, Publicidad) off by default.
- Google Ads (`gtag AW-16479671897`) and Microsoft Clarity in `src/app/layout.tsx` load `afterInteractive` with no consent check today — gate them on consent (Google Consent Mode v2 defaults to denied).
- A persistent “Configurar cookies” link in the footer reopens the panel.
- Copy names the actual providers; `/cookies` lists each cookie with duration.
