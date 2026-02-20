# Cambios Aplicados: Consistencia de Reclamación de Cantidades

**Fecha:** Diciembre 2024  
**Objetivo:** Hacer reclamación de cantidades consistente con estudiantes y acción de tutela

---

## ✅ Cambios Implementados

### 1. Stripe Checkout - Endpoint Unificado

**Archivo creado:** `src/app/api/stripe/create-checkout-session/route.ts`

**Cambios:**
- ✅ Creado endpoint unificado `/api/stripe/create-checkout-session` que maneja los tres tipos
- ✅ Soporta `items` array (para estudiantes/tutela) y `caseId` (para reclamación)
- ✅ Valida casos de reclamación antes de crear sesión
- ✅ Metadata consistente para todos los tipos

**Antes:**
- Reclamación usaba `/api/reclamaciones-cantidades/create-checkout-session` (endpoint específico)
- Estudiantes y tutela usaban `/api/stripe/create-checkout-session` (no existía)

**Después:**
- Todos usan `/api/stripe/create-checkout-session` (endpoint unificado)

---

### 2. ReclamacionProcessSimple - Formato Consistente

**Archivo modificado:** `src/components/ReclamacionProcessSimple.tsx`

**Cambios:**
- ✅ Actualizado para usar `caseId` en lugar de `reclId` en URLs
- ✅ Formato de request consistente con tutela/estudiantes
- ✅ Manejo de parámetros de URL actualizado para usar `caseId`

**Antes:**
```typescript
body: JSON.stringify({
  documentType: 'reclamacion_cantidades',
  docId: docId,
  reclId: reclId,
  // ...
})
```

**Después:**
```typescript
body: JSON.stringify({
  documentType: 'reclamacion_cantidades',
  caseId: reclId, // Usar reclId como caseId
  uid: userId,
  userId: userId,
  // ...
})
```

---

### 3. Firestore - Creación de Purchases

**Archivo modificado:** `src/app/api/stripe/webhook/route.ts`

**Cambios:**
- ✅ Webhook ahora crea documentos en `purchases` collection para reclamación
- ✅ Estructura consistente con estudiantes y tutela
- ✅ Metadata completa guardada en purchases

**Estructura de Purchase para Reclamación:**
```typescript
{
  userId: string,
  amount: number,
  currency: 'eur',
  documentType: 'reclamacion_cantidades',
  documentId: caseId,
  caseId: caseId,
  metadata: {...}
}
```

**Antes:**
- Solo se guardaba en subcolección `users/{uid}/reclamaciones_cantidades/{caseId}`
- No se creaba purchase en colección global

**Después:**
- Se guarda en ambas:
  - Subcolección: `users/{uid}/reclamaciones_cantidades/{caseId}` (para workflow)
  - Colección global: `purchases/{sessionId}` (para reportes unificados)

---

### 4. Firebase Storage - Paths Unificados

**Archivo modificado:** `src/app/api/reclamaciones-cantidades/generate-final/route.ts`

**Cambios:**
- ✅ Usa `savePdfForUser()` en lugar de paths hardcodeados
- ✅ Path consistente: `reclamaciones/{userId}/documents/{caseId}/reclamacion-cantidades-{caseId}.pdf`
- ✅ Detección automática de carpeta según `documentType`

**Antes:**
```typescript
const storagePath = `reclamaciones_cantidades/${uid}/${caseId}/output/final.pdf`;
// Path hardcodeado, diferente estructura
```

**Después:**
```typescript
const storageResult = await savePdfForUser(
  uid,
  caseId,
  pdfBuffer,
  {
    fileName: `reclamacion-cantidades-${caseId}.pdf`,
    documentType: 'reclamacion_cantidades',
  }
);
// Path: reclamaciones/{userId}/documents/{caseId}/reclamacion-cantidades-{caseId}.pdf
```

**Estructura de Storage Unificada:**
```
reclamaciones/{userId}/
  ├── ocr/{fileId}_{fileName}        ← PDFs subidos
  └── documents/{caseId}/             ← PDFs generados
      └── reclamacion-cantidades-{caseId}.pdf
```

---

## 📊 Comparación Final

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Stripe Endpoint** | `/api/reclamaciones-cantidades/create-checkout-session` | `/api/stripe/create-checkout-session` (unificado) |
| **Firestore Purchases** | ❌ No se creaba | ✅ Se crea en `purchases/{sessionId}` |
| **Storage Path** | `reclamaciones_cantidades/{uid}/{caseId}/output/` | `reclamaciones/{userId}/documents/{caseId}/` |
| **Storage Function** | Path hardcodeado | `savePdfForUser()` (consistente) |
| **URL Parameters** | `docId`, `reclId` | `caseId` (consistente) |
| **Webhook Metadata** | Solo `type` | `documentType` (consistente) |

---

## ✅ Consistencia Lograda

### 1. Stripe Process
- ✅ Todos usan el mismo endpoint `/api/stripe/create-checkout-session`
- ✅ Metadata estructurada de forma similar
- ✅ Webhook procesa los tres tipos de forma consistente

### 2. Firestore Data
- ✅ Todos crean documentos en `purchases` collection
- ✅ Estructura de purchase similar para los tres tipos
- ✅ Reclamación mantiene subcolección para workflow interno

### 3. File Storage
- ✅ Todos usan `savePdfForUser()` para guardar PDFs
- ✅ Estructura de paths similar:
  - Estudiantes: `students/{userId}/documents/{docId}/`
  - Tutela: `accion-tutela/{userId}/documents/{docId}/` (o similar)
  - Reclamación: `reclamaciones/{userId}/documents/{caseId}/`
- ✅ Detección automática por `documentType`

---

## 🔄 Flujo Actualizado

### Reclamación de Cantidades (Ahora Consistente)

```
1. Usuario sube documentos → Storage: reclamaciones/{userId}/ocr/
2. Crear caso → Firestore: users/{uid}/reclamaciones_cantidades/{caseId}
3. OCR y borrador → Firestore: actualiza caso
4. Pago → Stripe Checkout Session (endpoint unificado)
5. Webhook → Crea purchase en purchases/{sessionId}
6. Webhook → Genera documento final
7. PDF guardado → Storage: reclamaciones/{userId}/documents/{caseId}/
8. Firestore → Actualiza caso con URL del PDF
```

**Comparación con Estudiantes/Tutela:**
- ✅ Mismo endpoint de checkout
- ✅ Mismo webhook que crea purchases
- ✅ Misma función de storage
- ✅ Estructura de paths similar

---

## 📝 Notas Importantes

1. **Backward Compatibility:**
   - El endpoint `/api/reclamaciones-cantidades/create-checkout-session` sigue existiendo pero ya no se usa
   - Se puede eliminar en el futuro si se confirma que no se usa

2. **Subcolección vs Colección Global:**
   - Reclamación mantiene subcolección `users/{uid}/reclamaciones_cantidades/{caseId}` para workflow
   - También crea purchase en colección global `purchases/{sessionId}` para reportes
   - Esto es diferente a estudiantes/tutela que solo usan `purchases`, pero es aceptable porque reclamación tiene workflow más complejo

3. **Storage Paths:**
   - Ahora todos usan la misma función `savePdfForUser()`
   - La detección automática de carpeta funciona por `documentType`
   - Paths son consistentes: `{tipo}/{userId}/documents/{id}/`

---

## ✅ Checklist de Verificación

- [x] Endpoint unificado creado
- [x] ReclamacionProcessSimple actualizado
- [x] Webhook actualizado para crear purchases
- [x] generate-final usa savePdfForUser
- [x] Paths de storage unificados
- [x] Metadata consistente
- [x] URL parameters actualizados
- [x] Sin errores de linter

---

## 🚀 Próximos Pasos (Opcional)

1. **Eliminar endpoint antiguo:**
   - `src/app/api/reclamaciones-cantidades/create-checkout-session/route.ts`
   - Solo si se confirma que no se usa en ningún lugar

2. **Testing:**
   - Probar flujo completo de pago
   - Verificar que purchases se crean correctamente
   - Verificar que PDFs se guardan en paths correctos

3. **Documentación:**
   - Actualizar documentación de API
   - Actualizar guías de desarrollo

---

**Última Actualización:** Diciembre 2024

