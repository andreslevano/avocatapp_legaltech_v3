Button triggers an action; five variants, three sizes, loading and disabled states.

**Consumer provides:** `variant` (`primary` · `accent` · `secondary` · `ghost` · `destructive`), `size` (`sm` 32 · `md` 40 · `lg` 48), `icon` / `iconRight` (Lucide id), `loading` + `loadingText`, `disabled`, `block`, `href` (renders `<a>`), `type`.

**Anatomy:** container (`radius-md`, `radius-sm` at sm) · optional leading icon 18px (16 at sm) · label DM Sans 500 · optional trailing icon.

**Variants**
- `primary` — `action-primary` / `on-action-primary`: black on light, cream on dark. One per view: the main commit.
- `accent` — gold `accent` + **ink** `text-on-accent` (5.35:1). v3 `BtnGold` put white on gold (3.19:1, fails AA). Use for AI actions (Generar, Preguntar) and marketing CTAs on dark bands.
- `secondary` — `surface` + `border-strong` outline.
- `ghost` — text only; toolbars, “Ver todo”.
- `destructive` — `danger` fill. Always paired with a confirmation `Modal`.

**States:** hover (`*-hover` roles, `dur-fast`), focus-visible (2px `focus` ring, 2px offset — v3 had `focus-visible` on 4 elements in the whole repo), active (1px press), disabled (45% opacity, `aria-disabled`), loading (spinner replaces icon, `aria-busy`, label changes to the verb in progress).

**Accessibility:** min 40px tall (44px on touch layouts → use `lg` or block on mobile); label states the result (“Descargar PDF”, not “Aceptar”); icon-only → `IconButton`.

**Do** sentence-case labels in Spanish verbs (“Crear caso”). **Don't** stack two primaries, use gold-on-white text, or write “Click aquí”.

**Replaces:** `ui/Button.tsx` (BtnGold/BtnDark/BtnOutlineDark/BtnOutlineGold/BtnGhost → accent/primary/secondary/secondary/ghost), `.btn-primary`, `.btn-secondary` in `globals.css`, and ~200 ad-hoc `<button className="bg-…">` in legacy pages.
