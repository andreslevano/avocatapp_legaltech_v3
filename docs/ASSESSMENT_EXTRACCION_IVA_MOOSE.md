# Assessment: Por qué solo se extrae IVA 21% en moose.pdf (y no todos los tipos de IVA)

## Síntoma

En facturas como **moose.pdf** (Asesoría Pozuelo) el sistema muestra solo:
- **BASE 21%IVA** y **CUOTA 21%IVA**

y no extrae por separado las bases y cuotas de otros tipos de IVA (4%, 10%, etc.) que sí aparecen en el PDF (p. ej. base 95,94 con cuota 9,59 ≈ 10%; base 6,45 con 0,93; base 6,25 con 0,37 ≈ 4%).

---

## Causa raíz

### 1. Document AI se usa primero y solo devuelve “un IVA”

En `src/app/api.disabled/extraccion-datos/extract/route.ts`, para PDFs **sin** “split por página”:

```ts
// Phase A: Try Document AI Invoice Parser first for single PDFs (no split)
if (isPdf && !splitByPage) {
  const docAiResult = await processInvoiceWithDocumentAI(buffer, fileName, 'application/pdf', excelStructure);
  if (docAiResult && docAiResult.fields.length >= 3) {
    return NextResponse.json(docAiResult);  // ← salida inmediata, no se llama a OpenAI
  }
}
```

- El **Invoice Parser de Document AI** devuelve entidades genéricas: normalmente **una** “total tax amount” y **una** “net amount” (base imponible).
- No devuelve desglose por tipo de IVA (4%, 10%, 21%).
- Si Document AI devuelve ≥ 3 campos, la API **responde ya con ese resultado** y **no** llama a la extracción por OpenAI.

Por tanto, en flujo “un solo PDF sin split” toda la extracción puede venir solo de Document AI, que solo tiene “un total IVA” y “una base”.

### 2. Mapeo “Asesoría Pozuelo” colapsa todo a 21%

En `src/lib/document-ai.ts`, cuando `excelStructure === "asesoria-pozuelo"` se aplica:

```ts
const TO_POZUELO_KEY: Record<string, string> = {
  "Nº Factura": "Nº FACTURA",
  "Fecha factura": "FECHA",
  "Total": "TOTAL",
  "CIF/NIF emisor": "CIF",
  "Total IVA": "CUOTA 21%IVA",   // ← todo el IVA se etiqueta como 21%
  "Moneda": "MONEDA",
  "Base imponible": "BASE 21%IVA", // ← toda la base se etiqueta como 21%
};
```

- **Total IVA** → **CUOTA 21%IVA** (se mete todo el IVA en 21%).
- **Base imponible** → **BASE 21%IVA** (se mete toda la base en 21%).

Aunque en el PDF haya varias líneas de IVA (10%, 4%, 21%), Document AI solo entrega un total y una base, y este mapeo los asigna únicamente a los campos 21%. No existen mapeos para BASE/CUOTA 4% ni 10% en Document AI.

### 3. OpenAI sí tiene el esquema completo, pero no se usa si Document AI “acierta”

En `src/lib/openai.ts`, cuando `excelStructure === 'asesoria-pozuelo'`, el prompt de **extractDocumentDataWithAI** sí pide todos los tipos:

- BASE 0%IVA, CUOTA 0%IVA  
- BASE 4%IVA, CUOTA 4%IVA  
- BASE 10%IVA, CUOTA 10%IVA  
- BASE 21%IVA, CUOTA 21%IVA  

Esa ruta **sí** podría devolver 4%, 10% y 21% por separado. Pero para moose.pdf en flujo “un PDF, sin split”:

1. Se llama primero a Document AI.
2. Document AI devuelve suficientes campos (≥ 3).
3. Se hace `return NextResponse.json(docAiResult)` y **nunca** se llega a `extractDocumentDataWithAI`.

Por eso en “estos casos” solo ves 21%: es el camino Document AI + mapeo Pozuelo, no el de OpenAI.

---

## Resumen

| Factor | Efecto |
|--------|--------|
| Document AI se usa primero en PDF sin split | La respuesta es solo la de Document AI (un total IVA, una base). |
| Document AI no da desglose por tipo de IVA | No hay datos 4%/10%/21% para mapear. |
| TO_POZUELO_KEY solo mapea a 21% | Todo el IVA y toda la base se etiquetan como 21%. |
| No se llama a OpenAI cuando Document AI “triunfa” | No se usa el esquema completo (0%, 4%, 10%, 21%) que sí tiene el prompt de OpenAI. |

Conclusión: **no es que el sistema “solo quiera” 21%; es que en este flujo solo se usa Document AI y su mapeo a Pozuelo, y ahí todo se concentra en 21%.**

---

## Opciones de mejora

1. **Para Asesoría Pozuelo, no usar Document AI como atajo**  
   Si `excelStructure === 'asesoria-pozuelo'`, no llamar a `processInvoiceWithDocumentAI` (o no devolver su resultado como definitivo) y seguir siempre con extracción de texto + `extractDocumentDataWithAI`, para que el modelo llene BASE/CUOTA 0%, 4%, 10% y 21%.

2. **Mantener Document AI pero combinar con OpenAI**  
   Usar Document AI para campos básicos (emisor, receptor, nº factura, fecha, total) y llamar además a OpenAI solo para el bloque de IVA (o para “desglose de bases y cuotas por tipo”) y fusionar resultados.

3. **Enriquecer el mapeo Document AI → Pozuelo**  
   Solo tendría sentido si Document AI empezara a exponer entidades por tipo de IVA (p. ej. por rate o por línea). Hoy no es el caso, así que no basta con cambiar el mapeo.

Recomendación práctica: **opción 1** (para asesoria-pozuelo, no usar el atajo Document AI y usar siempre la extracción con OpenAI que ya pide todos los tipos de IVA).
