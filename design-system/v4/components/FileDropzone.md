FileDropzone uploads documents for OCR and extraction; it shows upload → OCR → extracted states and always carries a privacy note.

**Consumer provides:** `state` (`idle` · `drag` · `uploading` · `ocr` · `done` · `error`), `fileName`, `accept` text, `privacy` (default on).

**Rules**
- The dropzone is also a button (“selecciónalo en tu equipo”) — drag-and-drop is never the only path.
- Long steps report real progress: bytes while uploading, **page n of N** while OCR runs (`aria-live="polite"`).
- On success, summarise what was extracted (“4 partes, 9 fechas, 3 riesgos”) and link to review it; never auto-fill a legal document without a review step.
- Errors say the cause and the fix (password-protected PDF, > 20 MB, unreadable scan) with Retry.
- The privacy line sits **next to** the upload, not in a footer: encryption, who can see it, no model training — and only claims that are true and documented.

**Replaces:** upload blocks in `ReclamacionProcessSimple.tsx`, `TutelaProcessSimple.tsx`, `tools/extraccion-datos`, `dashboard/analisis-caso`.
