AIJobProgress is the long-running AI generation state (30–90 s): named steps, real progress, expected duration, permission to leave, cancel.

**Rules**
- Steps describe what is happening in the user's terms (“Extrayendo datos del deudor”), driven by backend events — not a fake timer.
- Show the typical duration; after 2× that, swap to “Está tardando más de lo normal” + Retry/Contact.
- The user can leave: generation continues server-side and notifies by email/in-app (v3 has polling logic in `POLLING_AND_PARALLEL_GENERATION_ASSESSMENT.md`; surface it).
- If payment was taken and generation fails, say so explicitly and state the refund/credit outcome.

**Replaces:** the spinner + “Generando Reclamación” overlay in `ReclamacionProcessSimple.tsx` and `TutelaProcessSimple.tsx`.
