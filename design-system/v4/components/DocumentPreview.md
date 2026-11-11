DocumentPreview shows a generated legal document on “paper” (always light, EB Garamond) inside either theme, with the disclaimer, extracted-data highlights and export actions.

**Spec:** paper `neutral-0`, text `neutral-900`, `doc-body` 17/28 (print 12pt/1.5, A4, margins 25/25/25/30 mm), title in small caps, section headings uppercase 600. Data inserted from the user's documents is highlighted (`gold-100` + dashed `gold-700` underline) until confirmed.

**Rules:** review comes before payment and download; export as PDF and DOCX with the same typography (embed EB Garamond, OFL, in pdfkit via `registerFont`; DOCX sets “EB Garamond” with “Garamond” fallback). A `legal-doc--official` modifier switches to Times New Roman where a court or registry mandates it.

**Replaces:** the inline HTML print templates in `ReclamacionProcess.tsx` (Times New Roman / Arial), `ReclamacionProcessSimple.tsx`, `dashboard/estudiantes/page.tsx`, and the Helvetica used ~180× in `src/lib/pdf/*.ts`.
