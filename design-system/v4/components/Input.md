Input is a single-line text control.

**Consumer provides:** `type`, `placeholder` (an example, never the label), `icon` (leading), `iconRight`, `inputMode`, `autoComplete`, plus the Field props.

**Spec:** height 40 (`size-control-md`), `radius-md`, 1px `border-strong` (≥3:1 on both themes — v3 `#C8C0B0` was 1.65:1 on cream), text 15/22, placeholder `text-muted` (v3 `#9a9a9a` was 2.57:1; app placeholder `#3a3630` was 1.42:1).

**States:** hover (border → `text-muted`), focus-visible (2px `focus` outline), invalid (2px `danger` border + Field error), disabled (`surface-muted`), read-only (no border change, selectable text).

**Do** use `inputMode="decimal"` for euro amounts and `autoComplete` on auth fields; 16px text on mobile to avoid iOS zoom. **Don't** remove the outline (`focus:outline-none` appears 50× in v3).
