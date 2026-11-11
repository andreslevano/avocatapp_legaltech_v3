Tabs switch between views of the same object; `segmented` is the PersonaTabs variant on marketing pages.

**Consumer provides:** `label` (tablist name), `tabs` `{value,label,icon,panel}`, `defaultValue`, `variant` (`underline` · `segmented`).

**Behaviour (WAI-ARIA tabs):** roving tabindex, ←/→/Home/End move and activate, panel is focusable and labelled by its tab. Selected = `text-heading` + 2px `accent` underline (underline) or raised `surface` pill (segmented).

**PersonaTabs rules:** labels are personas (“Abogado”, “Particular”, “Estudiante”) with Lucide icons, not emoji; each panel ends with the persona's CTA and its price, from the shared `PLANS` constant.

**Replaces:** `landing/PersonaTabs.tsx` (emoji ⚖️📚🧑‍💼, buttons without tab semantics), case-detail tab bars.
