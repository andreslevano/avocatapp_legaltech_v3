# Assessment: Pozuelo – explicit field list and “map by meaning” adjustment

## Requested change

For **Estructura asesoría Pozuelo**, the extraction should:

1. **Search for a fixed list of fields:** emisor, CIF proveedor, CIF cliente, nº factura, fecha, total, base/cuota 0%·4%·10%·21% IVA, % IRPF, cuota IRPF, **país proveedor**, **país cliente** (and moneda).
2. **Map by meaning, not by exact label:** even when the document uses different wording (e.g. “Mercancia”, “% IMP”, “Total Imp.”, “1-10,00%”, “2=21,00%”), assign each value to the field that makes sense (e.g. the 10% line → BASE 10%IVA and CUOTA 10%IVA).

## Current state

- **Cloud Function** (production): Asesoría Pozuelo prompt already lists CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, BASE/CUOTA 0·4·10·21% IVA, %JE IRPF, CUOTA IRPF, MONEDA. It does **not** ask for PAIS PROVEEDOR or PAIS CLIENTE; the Excel export infers them from CIF via `inferPaisFromCif`.
- **Next.js** `openai.ts`: Similar; uses a single “CIF” in the Pozuelo list (not CIF PROVEEDORES/CLIENTES); no PAIS PROVEEDOR/CLIENTE.
- **Rules:** There is a rule that says “Base imponible/Neto → BASE 21%IVA si no hay desglose”, which can push the model to put a single base/cuota in 21% and ignore multi-rate breakdowns. There is no explicit “map each tax line to the matching BASE/CUOTA X%” instruction for tables like Mercancia / % IMP / Total Imp.

## Assessment of the adjustment

### 1. Adding PAIS PROVEEDOR and PAIS CLIENTE

- **Pros:** Documents sometimes state “País: España” or “Country of supplier”. Extracting them allows using the document’s own country when present, and keeps inference from CIF as fallback.
- **Implementation:** Add to the JSON schema and to the prompt: “PAIS PROVEEDOR” (país del emisor/proveedor), “PAIS CLIENTE” (país del receptor/cliente). In the frontend, Excel export already has columns PAIS PROVEEDOR and PAIS CLIENTE; today they are filled only with `inferPaisFromCif`. We should use extracted value when present, else keep inference. Add COL_TO_KEYS entries for PAIS PROVEEDOR and PAIS CLIENTE so `getMappedValue` works.
- **Risk:** Low. If the model doesn’t find a country, it can leave "-"; inference still applies in export.

### 2. Explicit “search for these fields” and “map by meaning”

- **Pros:** Makes the model look for exactly this list and reduces dependence on exact wording. Helps with formats like “1-10,00%”, “Mercancia”, “Total Imp.” so that 10% base/cuota go to BASE 10%IVA/CUOTA 10%IVA, not only to 21%.
- **Implementation:** In the Pozuelo system prompt:
  - Start with a clear list: “Debes buscar y extraer SIEMPRE estos conceptos (aunque la etiqueta no sea exacta): Emisor, CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, BASE 0%IVA, CUOTA 0%IVA, BASE 4%IVA, CUOTA 4%IVA, BASE 10%IVA, CUOTA 10%IVA, BASE 21%IVA, CUOTA 21%IVA, %JE IRPF, CUOTA IRPF, PAIS PROVEEDOR, PAIS CLIENTE, MONEDA.”
  - Add: “No exijas que la etiqueta del documento coincida exactamente. Asigna cada valor al campo que tenga sentido (ej.: una línea con 10% y su base/cuota → BASE 10%IVA y CUOTA 10%IVA; ‘Mercancia’ con 10,00% → base/cuota 10%).”
- **Risk:** Low. Clarifies intent without changing output schema.

### 3. Multi-rate IVA and removal of “si no hay desglose” bias

- **Current:** “Base imponible/Neto → BASE 21%IVA si no hay desglose” can cause the model to put a single base/cuota in 21% even when there is a breakdown.
- **Adjustment:** Add an explicit rule: “Si el documento tiene un desglose de IVA por tipo (varias líneas con distintos %, p.ej. 4%, 10%, 21%), asigna cada línea a su BASE X%IVA y CUOTA X%IVA correspondiente. No concentres todo en 21%.” Optionally soften or remove the “si no hay desglose” sentence so it only applies when there is truly a single undifferentiated base/cuota.
- **Risk:** Low. Reduces incorrect merging into 21%.

### 4. Where to change

| Location | What to change |
|----------|----------------|
| **functions/src/index.ts** | `extractSingleWithOpenAI`: Pozuelo system prompt (field list, “map by meaning”, multi-rate rule, add PAIS PROVEEDOR/CLIENTE). `extractMultiWithOpenAI`: Pozuelo fieldsHint and, if needed, a short note on the same fields and mapping. |
| **src/lib/openai.ts** | `extractDocumentDataWithAI` and `extractMultiDocumentDataWithAI`: same Pozuelo logic for consistency when using the Next.js API. |
| **src/app/dashboard/autoservicio/extraccion-datos/page.tsx** | Add PAIS PROVEEDOR and PAIS CLIENTE to COL_TO_KEYS. In `toRowProveedores` and `toRowClientes`, use getMappedValue for PAIS PROVEEDOR/PAIS CLIENTE first; if empty, keep inferPaisFromCif. |

### 5. Output keys (unchanged)

Keep existing keys so Excel and UI keep working: CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, BASE 0%IVA, CUOTA 0%IVA, …, BASE 21%IVA, CUOTA 21%IVA, %JE IRPF, CUOTA IRPF, MONEDA. Add only PAIS PROVEEDOR and PAIS CLIENTE. The “IE IRPF %” in the user message is the same as “%JE IRPF” (typo/abbreviation).

### 6. Summary

- **Adjustment is sound:** Explicit field list + “map by meaning” + multi-rate rule + PAIS PROVEEDOR/CLIENTE improves Asesoría Pozuelo extraction without breaking existing behaviour. Excel and getMappedValue can use extracted country when present and fall back to CIF inference.
- **Implementation:** Update Cloud Function and Next.js Pozuelo prompts, and add PAIS handling in the extracción-datos page (COL_TO_KEYS + export rows).
