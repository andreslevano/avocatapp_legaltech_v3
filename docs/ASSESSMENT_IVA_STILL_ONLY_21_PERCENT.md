# Assessment: Why extraction still shows only 21% IVA (before applying changes)

## 1. Process we are using (end-to-end)

### Frontend (Extracción de datos page)

1. **User selects structure:** Dropdown “Estructura para Excel” with options:
   - `estandar` (default)
   - `asesoria-pozuelo` (“2. Estructura asesoría Pozuelo”)

2. **Request payload:** For each document, the frontend sends a POST to the extraction endpoint with:
   - `downloadURL` (when file is in Storage), or
   - `preExtractedText` / `preExtractedTextPerPage` (when OCR has already run)
   - `fileName`, `splitByPage`, **`excelStructure`**, `multiInvoicePerPage`, and optionally `pageOffset` / `pageLimit`.

3. **Endpoint in production:** On avocatapp.com / avocat-legaltech-v3.web.app, `getExtraccionDatosExtractEndpoint()` returns the **Cloud Function** URL:  
   `https://extracciondatosextract-xph64x4ova-uc.a.run.app`  
   So production uses the Firebase Cloud Function, not the Next.js API route.

4. **OCR flow:**  
   - If the user provides only `downloadURL` (no pre-extracted text), the **backend** fetches the PDF and uses **pdf-parse** to get text.  
   - The frontend runs **Tesseract OCR** only in fallback: when the first response has “no useful data” or when specific pages need OCR (e.g. split-by-page with empty pages).  
   - So for a **first pass** with only `downloadURL`, the backend never sees client-side OCR text unless that fallback path runs afterward.

5. **Display:** The UI shows whatever is in `doc.fields` (or edited copy). There is no filtering by IVA type — so if the API returns only BASE 21%IVA and CUOTA 21%IVA, only those appear.

---

### Backend (Cloud Function `extraccionDatosExtract`)

1. **Body:** Reads `downloadURL`, `fileName`, `preExtractedText`, `preExtractedTextPerPage`, `splitByPage`, **`excelStructure`**, `multiInvoicePerPage`, `pageOffset`, `pageLimit`.

2. **Phase A – Document AI (single PDF, no split):**
   - Condition: `isPdf && !splitByPage && excelStructure !== "asesoria-pozuelo"`.
   - If true: call `processInvoiceWithDocumentAI(...)`. If it returns ≥3 fields, **return that result immediately** and do not call OpenAI.
   - Document AI returns a single “Total IVA” and a single “Base imponible”, which are mapped in the function’s Document AI layer to **CUOTA 21%IVA** and **BASE 21%IVA** only (no 4%, 10%, etc.).

3. **Text for OpenAI:**  
   - If Phase A is skipped or Document AI returns &lt;3 fields:
     - If `downloadURL` was used: backend fetches the PDF and gets text via **pdf-parse** (no OCR).
     - If `preExtractedText` / `preExtractedTextPerPage` were sent: that text is used.
   - So for a **scanned PDF** with only `downloadURL`, pdf-parse often returns little or no text (e.g. “[Documento sin texto extraíble: …]”).

4. **Phase B – OpenAI:**  
   - Single document: `extractSingleWithOpenAI(documentText, fileName, undefined, excelStructure)`.
   - Multi-document (split or multi-invoice): `extractMultiWithOpenAI(..., excelStructure)`.
   - The **user prompt** is: `Documento: ${fileName}\n\nTexto:\n${documentText.slice(0, 12000)}\n\nDevuelve el JSON:`  
   So the model only sees whatever text the backend put in `documentText`.

5. **Response:** The function returns `{ country, documentType, emisor, receptor, fields }` (and, when applicable, `split`, `items`, `totalPages`, etc.). The frontend stores and displays `fields` as-is.

---

## 2. Prompt we are using (Asesoría Pozuelo)

For **single-document** extraction with `excelStructure === "asesoria-pozuelo"`, the Cloud Function uses this **system** prompt (abbreviated; full text in `functions/src/index.ts`, `extractSingleWithOpenAI`):

- Role: expert in extracting invoice/receipt data for “Estructura Asesoría Pozuelo”.
- Output: a single JSON with `country`, `documentType`, `emisor`, `receptor`, `fields`.
- `fields` must include (among others):
  - CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL
  - **BASE 0%IVA**, **CUOTA 0%IVA**
  - **BASE 4%IVA**, **CUOTA 4%IVA**
  - **BASE 10%IVA**, **CUOTA 10%IVA**
  - **BASE 21%IVA**, **CUOTA 21%IVA**
  - %JE IRPF, CUOTA IRPF, MONEDA

- Critical rules in the prompt:
  - Do not infer Emisor/Receptor from the file name; use only document content.
  - Map NIF/CIF → CIF PROVEEDORES/CLIENTES, Fecha → FECHA, Total → TOTAL.
  - **“Base imponible”/“Neto” → BASE 21%IVA si no hay desglose.**
  - Include all fields that can be extracted; use "-" only when there is no equivalent.

So the prompt **does** ask for 0%, 4%, 10%, and 21% IVA, but it also says that when there is **no breakdown** (“si no hay desglose”), a single “Base imponible”/“Neto” should go to BASE 21%IVA. It does **not** explicitly say: “When the document has a tax table with several rates (e.g. 10%, 21%, 4%), map each line to the corresponding BASE X%IVA and CUOTA X%IVA.”

For **multi-document** (multiple invoices per page), the Pozuelo hint is:

- “Usa claves: CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, **BASE 21%IVA, CUOTA 21%IVA, etc.** …”  
So the multi-document prompt emphasizes “21%” and “etc.” and does not spell out 4% and 10% in the same way as the single-document prompt.

---

## 3. Potential issues in this case (why you still see only 21%)

### A. **Estructura not set to Asesoría Pozuelo (most likely)**

- Default in the UI is **`estandar`**.
- If the user runs extraction **without** selecting “2. Estructura asesoría Pozuelo”, `excelStructure` is `estandar`.
- Then the condition `excelStructure !== "asesoria-pozuelo"` is **true**, so the backend **uses Document AI** for single PDFs.
- Document AI returns only one total tax and one base, mapped to CUOTA 21%IVA and BASE 21%IVA → **only 21%** appears.

**Check:** Before “Apply changes”, confirm that the user has selected “Estructura asesoría Pozuelo” in the dropdown when running extraction for the invoice in the screenshot.

---

### B. **Poor or empty PDF text (scanned PDF, no client OCR)**

- When the request contains only **`downloadURL`** (no `preExtractedText`), the backend gets text with **pdf-parse** only.
- For **scanned** or image-based PDFs, pdf-parse often returns very little or placeholder text (e.g. “[Documento sin texto extraíble: …]”).
- That (or very short garbage) is what is sent to OpenAI. The model has almost no content to work with, so it may:
  - Return a minimal structure,
  - Fill only the most “common” IVA (21%), or
  - Misassign numbers (e.g. one base/cuota pair into 21%).
- The frontend only runs **Tesseract OCR** and resends with `preExtractedText` when it considers the first response “no useful data” or when pages need OCR. If the first response already has 7 fields (e.g. Nº FACTURA, FECHA, TOTAL, BASE 21%IVA, CUOTA 21%IVA, etc.), that condition may **not** be met, so OCR is never run and the backend never gets real text.

**Result:** Backend keeps using bad/empty text → model keeps returning only or mainly 21%.

---

### C. **Prompt bias and format mismatch**

- The Pozuelo prompt says: **“Base imponible”/“Neto” → BASE 21%IVA si no hay desglose.**  
  So when the model is unsure whether there is a breakdown, it may put a single base/cuota into 21%.
- The document in your case uses a table with labels like **“1-10,00%”**, **“2=21,00%”**, **“5=4,00%”** (Mercancia, % IMP, Total Imp.). The prompt does not explicitly describe this format or say “map 10,00% → BASE 10%IVA / CUOTA 10%IVA”, etc. So the model may:
  - Not recognize this as a multi-rate breakdown, or
  - Map only the 21% line, or
  - Put the first or largest line into 21% and ignore the rest.

---

### D. **Misalignment between totals and 21% fields**

- In the screenshot, BASE 21%IVA = 95,94 and CUOTA 21%IVA = 10,89 → ratio ≈ 11,35%, not 21%. And 95,94 + 10,89 ≠ TOTAL 120,53.
- That is consistent with:
  - **Document AI** having returned one “net” and one “total tax” (possibly from one line, e.g. the 10% line) and the backend mapping both to 21%; or
  - **OpenAI** having received bad/insufficient text and filling only one IVA line (or merging) into 21%.

So the numbers suggest either Document AI was used (and everything collapsed to 21%) or the model received poor input and still only filled 21%.

---

### E. **Multi-document path (split / multi-invoice)**

- If the user uses “split by page” or “multi-invoice per page”, the backend uses **extractMultiWithOpenAI**.
- The Pozuelo hint there only says “BASE 21%IVA, CUOTA 21%IVA, etc.” and does not list 4% and 10% explicitly. So the model might be less likely to output 4% and 10% in that path.

---

## 4. Summary table

| Factor | Effect |
|--------|--------|
| **excelStructure = estandar** | Document AI used → single total/base → only 21% in UI. |
| **excelStructure = asesoria-pozuelo** but **PDF text empty/poor** (pdf-parse on scanned PDF) | OpenAI gets bad input → minimal or wrong fields, often only 21%. |
| **Prompt: “si no hay desglose” → BASE 21%IVA** | Model may treat tables as “no breakdown” and put base/cuota in 21%. |
| **Prompt: no explicit “map 10% line → BASE 10%IVA”** | Format “1-10,00%” etc. may not be mapped to 4%/10%/21% correctly. |
| **OCR only in fallback** | First request with only downloadURL often has no OCR → bad text for OpenAI. |

---

## 5. Recommended checks before changing code

1. **Confirm structure:** In the UI, for the run that produced “only 21%”, was “2. Estructura asesoría Pozuelo” selected?
2. **Confirm PDF type:** Is the PDF digital (selectable text) or scanned? If scanned, the backend likely got almost no text from pdf-parse.
3. **Inspect Network:** In DevTools, for the request to `extracciondatosextract-...`, check the request payload and confirm `excelStructure: "asesoria-pozuelo"` when you expect Pozuelo.
4. **Optional backend log:** Temporarily log `excelStructure` and `documentText.length` (or first 200 chars) in the Cloud Function to see what is actually received and sent to the model.

No code changes were applied in this assessment; the above is to narrow down the cause before applying fixes.
