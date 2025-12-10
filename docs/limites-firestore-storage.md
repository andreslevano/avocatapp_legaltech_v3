# Límites y Cuotas: Firestore, Storage y Servicios

## 🔴 Límites Críticos de Firestore

### Tamaño de Documento
- **Máximo por documento:** 1 MB
- **Impacto:** El campo `ocr.rawText` puede ser muy grande
- **Solución:** Limitar `rawText` a ~500KB o usar Storage para texto completo

### Tamaño de Campo
- **Máximo por campo:** 1 MB
- **Impacto:** `drafting.lastResponse` puede exceder esto
- **Solución:** Si el borrador es > 1MB, guardar en Storage

### Profundidad de Subcolecciones
- **Máximo:** 100 niveles
- **Nuestro caso:** `users/{uid}/reclamaciones_cantidades/{caseId}` = 3 niveles ✅

### Escrituras por Segundo
- **Por documento:** 1 escritura/segundo
- **Por colección:** Ilimitado (pero con throttling)
- **Impacto:** Múltiples actualizaciones simultáneas pueden fallar
- **Solución:** Usar transacciones o batch writes

### Lecturas
- **Límite:** 10,000 lecturas/día (plan Spark - gratis)
- **Pago:** Ilimitado (pero con costo)
- **Impacto:** Suscripciones en tiempo real consumen lecturas

## 📦 Límites de Firebase Storage

### Tamaño de Archivo
- **Máximo por archivo:** 32 GB
- **Nuestro caso:** PDFs típicamente < 10 MB ✅

### Tamaño Total
- **Plan Spark (gratis):** 5 GB
- **Plan Blaze (pago):** Ilimitado (pago por GB)
- **Costo:** $0.020 por GB/mes

### Operaciones
- **Descargas:** $0.05 por 10,000 operaciones
- **Subidas:** $0.05 por 10,000 operaciones

## 🤖 Límites de OpenAI

### Tokens por Request
- **GPT-4o:** 128,000 tokens (input + output)
- **Nuestro caso:** 
  - Input: ~2,000-5,000 tokens (prompt + OCR)
  - Output: ~3,000-4,000 tokens (escrito)
  - **Total:** ~7,000 tokens ✅

### Rate Limits
- **Requests por minuto:** 500 (tier 1)
- **Tokens por minuto:** 1,000,000 (tier 1)
- **Impacto:** Múltiples usuarios simultáneos pueden alcanzar límite

### Costos
- **GPT-4o Input:** $2.50 por 1M tokens
- **GPT-4o Output:** $10.00 por 1M tokens
- **Nuestro caso:** ~$0.03-0.05 por reclamación

## 💳 Límites de Stripe

### Checkout Sessions
- **Límite:** Prácticamente ilimitado
- **Rate limit:** 100 requests/segundo

### Webhooks
- **Timeout:** 30 segundos
- **Impacto:** Si `generate-final` tarda > 30s, el webhook falla
- **Solución:** Generar PDF de forma asíncrona (Cloud Function o queue)

## ⚠️ Límites Importantes para Nuestra Implementación

### 1. Tamaño de `ocr.rawText` en Firestore

**Problema:** Si un PDF tiene mucho texto, `rawText` puede exceder 1 MB.

**Solución Implementada:**
```typescript
// En ocr-and-draft/route.ts
const ocrSummary = rawTextConsolidado.substring(0, 2000) + '...';
```

**Mejora Recomendada:**
```typescript
// Guardar texto completo en Storage si > 500KB
if (rawTextConsolidado.length > 500000) {
  // Guardar en Storage: reclamaciones_cantidades/{uid}/{caseId}/ocr/raw-text.txt
  // Guardar solo resumen en Firestore
}
```

### 2. Tamaño de `drafting.lastResponse`

**Problema:** El borrador generado puede ser > 1 MB.

**Solución Actual:**
- OpenAI limita a 3,000-4,000 tokens (~12,000-16,000 caracteres)
- Normalmente < 1 MB ✅

**Si excede:**
```typescript
// Guardar en Storage si > 500KB
if (borrador.length > 500000) {
  const storagePath = `reclamaciones_cantidades/${uid}/${caseId}/draft.txt`;
  // Guardar en Storage
  // Guardar solo primeros 500KB en Firestore
}
```

### 3. Múltiples Actualizaciones Simultáneas

**Problema:** Si el usuario actualiza `formData` mientras se procesa OCR.

**Solución:**
```typescript
// Usar transacciones para actualizaciones críticas
import { runTransaction } from 'firebase/firestore';

await runTransaction(db, async (transaction) => {
  const caseRef = doc(db, 'users', uid, 'reclamaciones_cantidades', caseId);
  const caseDoc = await transaction.get(caseRef);
  // Actualizar solo si status es correcto
  transaction.update(caseRef, { formData });
});
```

### 4. Timeout del Webhook de Stripe

**Problema:** `generate-final` puede tardar > 30 segundos.

**Solución Recomendada:**
```typescript
// En webhook, solo marcar como paid y encolar generación
await updateDoc(caseRef, {
  'payment.status': 'paid',
  status: 'paid',
});

// Llamar a generate-final de forma asíncrona (no esperar respuesta)
fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
  method: 'POST',
  // No esperar respuesta
});
```

## 📊 Estimaciones de Uso

### Escenario: 1,000 reclamaciones/mes

**Firestore:**
- Documentos: 1,000 casos × ~50 KB = 50 MB
- Lecturas: ~10,000/día = 300,000/mes
- Escrituras: ~5,000/día = 150,000/mes
- **Costo:** ~$5-10/mes

**Storage:**
- PDFs input: 1,000 × 2 MB = 2 GB
- PDFs output: 1,000 × 1 MB = 1 GB
- **Total:** 3 GB
- **Costo:** ~$0.06/mes

**OpenAI:**
- 1,000 reclamaciones × $0.05 = $50/mes

**Total Estimado:** ~$60-70/mes para 1,000 reclamaciones

## ✅ Recomendaciones

1. **Monitorear tamaño de documentos:**
   - Alertar si `ocr.rawText` > 500 KB
   - Considerar guardar texto completo en Storage

2. **Optimizar lecturas:**
   - Usar suscripciones solo cuando necesario
   - Cachear datos en cliente cuando sea posible

3. **Manejar timeouts:**
   - Generar PDF de forma asíncrona desde webhook
   - Usar Cloud Functions para procesamiento pesado

4. **Rate limiting:**
   - Implementar rate limiting en endpoints de OCR
   - Queue para procesamiento si hay muchos usuarios

5. **Costos:**
   - Monitorear uso de OpenAI
   - Considerar cachear borradores similares

## 🔧 Código de Ejemplo: Validar Límites

```typescript
// Validar tamaño antes de guardar en Firestore
function validateFirestoreSize(data: any): { valid: boolean; size: number; error?: string } {
  const size = new Blob([JSON.stringify(data)]).size;
  const maxSize = 1 * 1024 * 1024; // 1 MB
  
  if (size > maxSize) {
    return {
      valid: false,
      size,
      error: `Documento excede 1 MB (${(size / 1024 / 1024).toFixed(2)} MB)`,
    };
  }
  
  return { valid: true, size };
}

// Usar antes de guardar
const validation = validateFirestoreSize(caseData);
if (!validation.valid) {
  // Guardar datos grandes en Storage
  // Guardar solo referencia en Firestore
}
```

