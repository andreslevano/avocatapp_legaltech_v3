# Comparación: Reclamación de Cantidades vs Estudiantes y Acción de Tutela

## 📋 Resumen Ejecutivo

**Reclamación de Cantidades** NO está siguiendo exactamente la misma lógica que Estudiantes y Acción de Tutela en:
1. ❌ **Stripe**: No usa Payment Link (usa Checkout Session, pero diferente endpoint)
2. ⚠️ **Firestore**: Usa subcolección en lugar de colección `purchases`
3. ⚠️ **Storage**: Estructura similar pero con paths adicionales

---

## 1️⃣ Stripe Payment Link

### ❌ **NO estamos usando el Payment Link**

**Payment Link proporcionado:** `https://buy.stripe.com/9B6eVd058etB0EW7jh8g006`

**Estado Actual:**

#### Reclamación de Cantidades
- **Método:** Stripe Checkout Session (NO Payment Link)
- **Endpoint usado:** `/api/stripe/create-checkout-session` (línea 379 en `ReclamacionProcessSimple.tsx`)
- **Alternativo:** `/api/reclamaciones-cantidades/create-checkout-session` (existe pero no se usa en el componente)

```typescript
// ReclamacionProcessSimple.tsx:379
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    documentType: 'reclamacion_cantidades',
    docId: docId,
    reclId: reclId,
    // ...
  })
});
```

#### Estudiantes
- **Método:** Stripe Checkout Session
- **Endpoint:** `/api/stripe/create-checkout-session`
- **Estructura:** Similar a reclamación

```typescript
// estudiantes/page.tsx:242
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    items: cart.map(item => ({...})),
    documentType: 'estudiantes',
    // ...
  })
});
```

#### Acción de Tutela
- **Método:** Stripe Checkout Session
- **Endpoint:** `/api/stripe/create-checkout-session`
- **Estructura:** Similar a reclamación

```typescript
// TutelaProcessSimple.tsx:537
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    items: [{...}],
    documentType: 'accion_tutela',
    // ...
  })
});
```

### ⚠️ **Problema Identificado**

El Payment Link `https://buy.stripe.com/9B6eVd058etB0EW7jh8g006` **NO se está usando** en el código. Todos los módulos usan Checkout Sessions.

**Recomendación:**
- Si quieres usar el Payment Link, necesitas cambiar el código para redirigir directamente a esa URL
- O mantener Checkout Sessions (más flexible para metadata)

---

## 2️⃣ Firestore - Estructura de Datos

### ⚠️ **NO sigue la misma lógica**

#### Reclamación de Cantidades
**Estructura:** Subcolección bajo usuario
```
users/{uid}/reclamaciones_cantidades/{caseId}
```

**Campos principales:**
```typescript
{
  id: string,
  uid: string,
  status: 'draft' | 'waiting_payment' | 'paid',
  formData: {...},
  ocr: {
    rawText: string,
    extracted: {...}
  },
  drafting: {
    lastResponse: string,
    history: [...]
  },
  payment: {
    status: string,
    stripeCheckoutSessionId?: string
  },
  storage: {
    inputFiles: [...],
    finalPdf: {...}
  }
}
```

**Endpoint de creación:** `/api/reclamaciones-cantidades/create-case`

#### Estudiantes
**Estructura:** Colección global `purchases`
```
purchases/{purchaseId}
```

**Campos principales:**
```typescript
{
  id: string,
  userId: string,
  customerEmail: string,
  documentType: 'estudiantes',
  items: Array<{
    documentType: 'estudiantes',
    quantity: number,
    // ...
  }>,
  total: number,
  currency: 'EUR',
  status: 'completed',
  stripeSessionId?: string,
  // ...
}
```

**Creación:** Automática en webhook de Stripe

#### Acción de Tutela
**Estructura:** Colección global `purchases` (igual que estudiantes)
```
purchases/{purchaseId}
```

**Campos principales:**
```typescript
{
  id: string,
  userId: string,
  documentType: 'accion_tutela',
  tutelaId?: string,
  docId?: string,
  formData?: Record<string, any>,
  items: Array<{
    documentType: 'accion_tutela',
    // ...
  }>,
  // ...
}
```

**Creación:** Automática en webhook de Stripe

### 🔍 **Diferencias Clave**

| Aspecto | Reclamación | Estudiantes | Acción de Tutela |
|---------|------------|-------------|------------------|
| **Estructura** | Subcolección | Colección global | Colección global |
| **Path** | `users/{uid}/reclamaciones_cantidades/{caseId}` | `purchases/{purchaseId}` | `purchases/{purchaseId}` |
| **Creación** | Endpoint específico | Webhook automático | Webhook automático |
| **Datos** | OCR, borradores, casos | Compras, items | Compras, formData |
| **Estado** | `draft`, `waiting_payment`, `paid` | `completed` | `completed` |

### ⚠️ **Problema Identificado**

Reclamación de Cantidades usa una **estructura diferente**:
- ✅ **Ventaja:** Más organizado por usuario, permite múltiples casos
- ❌ **Desventaja:** No es consistente con otros módulos
- ❌ **Desventaja:** No aparece en colección `purchases` (dificulta reportes unificados)

**Recomendación:**
1. **Opción A:** Mantener estructura actual pero también crear en `purchases` para consistencia
2. **Opción B:** Migrar a estructura de `purchases` como estudiantes y tutela
3. **Opción C:** Mantener ambas (subcolección para casos, `purchases` para compras)

---

## 3️⃣ Firebase Storage - Estructura de Archivos

### ⚠️ **Similar pero con diferencias**

#### Reclamación de Cantidades

**Estructura Principal (en generate-final):**
```
reclamaciones_cantidades/{uid}/{caseId}/output/final.pdf
```

**Estructura Alternativa (en storage.ts):**
```
reclamaciones/{userId}/
  ├── ocr/{fileId}_{fileName}        ← PDFs subidos
  └── documents/{documentId}/{file}   ← PDFs generados
```

**Código:**
```typescript
// generate-final/route.ts:144
const storagePath = `reclamaciones_cantidades/${uid}/${caseId}/output/final.pdf`;

// storage.ts detecta automáticamente:
if (documentType === 'reclamacion_cantidades') {
  return 'reclamaciones';
}
```

#### Estudiantes

**Estructura:**
```
students/{userId}/
  ├── ocr/{fileId}_{fileName}        ← PDFs subidos
  └── documents/{documentId}/{file}  ← PDFs generados
```

**Código:**
```typescript
// storage.ts detecta por plan:
if (plan === 'Estudiantes') {
  return 'students';
}
```

#### Acción de Tutela

**Estructura (según documentación):**
```
accion-tutela/{userId}/{docId}.pdf
```

O posiblemente:
```
users/{userId}/documents/{docId}.pdf
```

### 🔍 **Comparación de Estructuras**

| Módulo | Path Base | Subcarpetas | Archivos Subidos | Archivos Generados |
|--------|-----------|-------------|------------------|-------------------|
| **Reclamación** | `reclamaciones/` o `reclamaciones_cantidades/` | `{userId}/ocr/` y `{userId}/documents/` o `{uid}/{caseId}/output/` | `ocr/{fileId}_{fileName}` | `documents/{docId}/` o `{caseId}/output/final.pdf` |
| **Estudiantes** | `students/` | `{userId}/ocr/` y `{userId}/documents/` | `ocr/{fileId}_{fileName}` | `documents/{docId}/` |
| **Acción de Tutela** | `accion-tutela/` o `users/` | `{userId}/` | (no claro) | `{docId}.pdf` |

### ⚠️ **Problemas Identificados**

1. **Reclamación tiene DOS estructuras diferentes:**
   - `reclamaciones_cantidades/{uid}/{caseId}/output/final.pdf` (en generate-final)
   - `reclamaciones/{userId}/documents/{documentId}/` (en storage.ts)

2. **Inconsistencia en paths:**
   - Reclamación usa `caseId` en una estructura
   - Reclamación usa `documentId` en otra estructura
   - Estudiantes siempre usa `documentId`

3. **Detección automática:**
   - ✅ Funciona por `documentType`
   - ✅ Funciona por `plan` del usuario
   - ⚠️ Pero reclamación tiene paths hardcodeados en algunos lugares

### ✅ **Lo que SÍ está bien**

- ✅ Detección automática de carpeta según `documentType`
- ✅ Separación por tipo de documento
- ✅ Estructura organizada por usuario

### ⚠️ **Recomendaciones**

1. **Unificar estructura de Storage para reclamación:**
   - Usar siempre: `reclamaciones/{userId}/documents/{documentId}/`
   - O siempre: `reclamaciones_cantidades/{uid}/{caseId}/output/`
   - No mezclar ambas

2. **Seguir patrón de estudiantes:**
   ```
   reclamaciones/{userId}/
     ├── ocr/{fileId}_{fileName}
     └── documents/{documentId}/{fileName}.pdf
   ```

3. **Actualizar `generate-final` para usar `savePdfForUser`:**
   ```typescript
   // En lugar de:
   const storagePath = `reclamaciones_cantidades/${uid}/${caseId}/output/final.pdf`;
   
   // Usar:
   const storageResult = await savePdfForUser(
     uid,
     caseId,
     pdfBuffer,
     { documentType: 'reclamacion_cantidades' }
   );
   ```

---

## 📊 Tabla Comparativa Completa

| Aspecto | Reclamación | Estudiantes | Acción de Tutela |
|---------|------------|-------------|------------------|
| **Stripe** | Checkout Session | Checkout Session | Checkout Session |
| **Payment Link** | ❌ No usado | ❌ No usado | ❌ No usado |
| **Firestore** | Subcolección `users/{uid}/reclamaciones_cantidades/{caseId}` | Colección `purchases/{purchaseId}` | Colección `purchases/{purchaseId}` |
| **Storage Base** | `reclamaciones/` o `reclamaciones_cantidades/` | `students/` | `accion-tutela/` o `users/` |
| **Storage Path Input** | `{userId}/ocr/{fileId}_{fileName}` | `{userId}/ocr/{fileId}_{fileName}` | (no claro) |
| **Storage Path Output** | `{userId}/documents/{docId}/` o `{uid}/{caseId}/output/` | `{userId}/documents/{docId}/` | `{userId}/{docId}.pdf` |
| **Detección Auto** | ✅ Por `documentType` | ✅ Por `plan` | (no claro) |
| **Webhook** | ✅ Genera documento automáticamente | ✅ Genera documento automáticamente | ✅ Genera documento automáticamente |

---

## 🎯 Recomendaciones Prioritarias

### Prioridad Alta

1. **Unificar estructura de Storage**
   - Decidir una sola estructura para reclamación
   - Actualizar `generate-final` para usar `savePdfForUser`
   - Eliminar paths hardcodeados

2. **Considerar Payment Link**
   - Si quieres usar el Payment Link `https://buy.stripe.com/9B6eVd058etB0EW7jh8g006`, cambiar código para redirigir a esa URL
   - O documentar que se usa Checkout Session (no Payment Link)

### Prioridad Media

3. **Consistencia en Firestore**
   - Opción A: Crear también en `purchases` para reportes unificados
   - Opción B: Mantener subcolección pero documentar la diferencia
   - Opción C: Migrar a estructura de `purchases` (requiere migración)

4. **Documentar diferencias**
   - Explicar por qué reclamación usa subcolección
   - Documentar las dos estructuras de Storage y cuándo usar cada una

---

## ✅ Conclusión

**Reclamación de Cantidades NO está siguiendo exactamente la misma lógica que Estudiantes y Acción de Tutela:**

1. ❌ **Stripe:** No usa Payment Link (usa Checkout Session, igual que los otros)
2. ⚠️ **Firestore:** Usa subcolección en lugar de colección `purchases`
3. ⚠️ **Storage:** Estructura similar pero con paths adicionales y algunas inconsistencias

**Recomendación General:** Unificar estructuras para mantener consistencia en el sistema, especialmente en Storage.

---

**Última Actualización:** Diciembre 2024

