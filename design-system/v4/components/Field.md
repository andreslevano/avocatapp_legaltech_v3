Field wraps one form control with its label, help text and error message, and wires the ids for assistive tech.

**Consumer provides:** `label`, `required` or `optional`, `help`, `error`, and the control as a render function receiving `{id, aria-describedby, aria-invalid, required}`.

**Anatomy:** label (14/20, 500) · required asterisk (`danger-text`, `aria-hidden`; the input carries `required`) · control · help (13/20 `text-muted`) *or* error (13/20 500 `danger-text` + `circle-alert` icon).

**Validation pattern**
- Validate on blur and on submit, never on each keystroke.
- On submit with errors: show `ErrorSummary` (an `Alert` tone `danger` listing each error as a link to its field) at the top of the form, move focus to it.
- Error text says how to fix (“Indica un importe mayor que 0 €”), not just “Campo inválido”.
- Mark optional fields, not required ones, when most fields are required.

**Form layout:** single column on mobile; `av-form-grid` two columns ≥640px for short pairs (Nombre/Apellidos, Código postal/Ciudad). Group with `fieldset` + `legend`. Primary action bottom-left on desktop, full-width on mobile.

**Replaces:** the 86 `<label>` / 28 `htmlFor` pairs (most legacy inputs have a placeholder but no label), `.input-field`, and `SignupForm.tsx`'s single `setError()` banner.
