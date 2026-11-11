ProductsMenu is the dropdown under a “Productos” trigger (desktop) or the first section of the mobile drawer: one row per persona with icon, name, one-line promise and price anchor.

**Rules:** prices here must equal the pricing section and signup (single source: a `PLANS` constant). Trigger is a button with `aria-expanded`; menu closes on Esc and outside click; focus returns to the trigger.

**Replaces:** `components/ProductsDropdown.tsx`.
