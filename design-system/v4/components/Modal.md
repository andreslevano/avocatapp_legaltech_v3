Modal interrupts for a decision that must be made now (confirm deletion, confirm payment, session expired).

**Consumer provides:** `title` (a question or the outcome), `icon`, `tone`, `children` (consequences, concrete), `footer` (cancel left, commit right), `alert` for destructive confirmations (`role="alertdialog"`).

**Rules:** native `<dialog>` or a focus-trapped equivalent; focus moves to the first focusable (the safe action in destructive dialogs); Esc and the X close; background inert; `radius-xl`, `shadow-lg`, scrim `rgba(22,20,16,.6)`; mobile: full-width buttons stacked, commit on top. Never use a modal for content that deserves a page (e.g. `AnalisisExitoModal` results) — use a Drawer or a route.

**Replaces:** `AccountDeactivationModal.tsx`, `AccountReactivationModal.tsx`, `AnalisisExitoModal.tsx` and inline modal markup.
