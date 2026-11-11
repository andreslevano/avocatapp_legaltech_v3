Stepper shows progress through a multi-step document wizard (reclamación de cantidades, acción de tutela, generar escrito).

**Consumer provides:** `steps` (labels), `current` (1-based), `compact` (mobile: numbers + current label only).

**Rules**
- Canonical wizard order: **Datos → Documentos → Revisión → Pago → Descarga.** Payment comes *after* the user has reviewed a preview of what they will get (v3 `ReclamacionProcessSimple.tsx` asks for payment in step 2 before any review).
- Done steps are reachable (go back without losing data); future steps are not links.
- `aria-current="step"`; completed steps announce “(completado)”.
- Save progress automatically; show “Guardado hace 1 min”.

**Replaces:** the hand-built 1-2-3 circles in `ReclamacionProcess*.tsx`, `TutelaProcessSimple.tsx`, `auth/OnboardingStep.tsx`.
