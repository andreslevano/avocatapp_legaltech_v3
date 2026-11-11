Navbar is the single marketing header for every public page — home, product pages, auth, contact and legal.

**Items (fixed order):** Abogados · Particulares · Estudiantes · Precios · Nosotros | Iniciar sesión · **Probar 14 días gratis** (primary). Below 768px: logo + primary CTA + menu button opening a Drawer.

**Rules:** one component, one item list. Today the home uses `layout/Navbar.tsx` (persona links) while `/contacto`, `/privacidad`, `/terminos`, `/cookies`, `/gdpr` use the legacy `Header.tsx` with “Características”/“Precios” pointing at `#caracteristicas`/`#precios` anchors that don't exist on those pages, different casing (“Iniciar Sesión”, “Comenzar”) and a flag-emoji language selector. Links to home sections are absolute (`/#precios`). Current page: `aria-current="page"` + gold underline.

**Replaces:** `components/Header.tsx`, `layout/Navbar.tsx`, `UserTypeSelector.tsx` (header part).
