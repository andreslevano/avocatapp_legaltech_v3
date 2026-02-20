# Análisis: Webhooks y Generación Automática de Documentos

**Fecha:** Diciembre 2024  
**Objetivo:** Verificar qué webhook se usa y cómo funciona la generación automática

---

## 🔍 Situación Actual: DOS Webhooks

### Webhook 1: Next.js API Route
**Ubicación:** `src/app/api/stripe/webhook/route.ts`

**Funcionalidad:**
- ✅ Recibe eventos de Stripe
- ✅ Crea purchases en Firestore
- ✅ **Solo genera documentos para reclamación de cantidades**
- ❌ NO genera documentos para estudiantes
- ❌ NO genera documentos para tutela

**Código:**
```typescript
// Solo procesa reclamación
if (documentType === 'reclamacion_cantidades' && uid && caseId) {
  // Llama a /api/reclamaciones-cantidades/generate-final
  const generateResponse = await fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
    method: 'POST',
    body: JSON.stringify({ caseId, uid }),
  });
}
// ❌ No hay lógica para estudiantes o tutela
```

---

### Webhook 2: Firebase Functions
**Ubicación:** `functions/src/index.ts` - `stripeWebhook` y `processWebhookAsync`

**Funcionalidad:**
- ✅ Recibe eventos de Stripe
- ✅ Crea purchases en Firestore
- ✅ **Genera documentos para estudiantes automáticamente**
- ✅ **Genera documentos para tutela automáticamente**
- ❌ NO genera documentos para reclamación

**Código:**
```typescript
// Procesa estudiantes y tutela
if (documentType === 'accion_tutela') {
  const tutelaResult = await processTutelaDocument(...);
} else {
  // Procesa estudiantes
  const generation = await generateStudentDocumentPackageCore({
    userId, userEmail, areaLegal, tipoEscrito, pais, openai
  });
}
// ❌ No hay lógica para reclamación
```

---

## ⚠️ PROBLEMA IDENTIFICADO

**Hay DOS webhooks diferentes:**
1. **Next.js webhook** - Solo genera reclamación
2. **Firebase Functions webhook** - Solo genera estudiantes y tutela

**Esto significa:**
- ⚠️ Dependiendo de cuál webhook esté configurado en Stripe, solo algunos tipos funcionan
- ⚠️ No hay un webhook unificado que maneje los 3 tipos
- ⚠️ Puede haber duplicación o conflictos

---

## 📊 Comparación de Webhooks

| Aspecto | Next.js Webhook | Firebase Functions Webhook |
|---------|----------------|---------------------------|
| **Ubicación** | `src/app/api/stripe/webhook/route.ts` | `functions/src/index.ts` |
| **Estudiantes** | ❌ No genera | ✅ Genera automáticamente |
| **Tutela** | ❌ No genera | ✅ Genera automáticamente |
| **Reclamación** | ✅ Genera automáticamente | ❌ No genera |
| **Crea Purchase** | ✅ Sí | ✅ Sí |
| **Timeout** | Next.js default | 540 segundos |
| **Memoria** | Next.js default | 512MiB |

---

## 🔧 Solución: Unificar Generación

### Opción 1: Actualizar Next.js Webhook (Recomendado)

Agregar generación para estudiantes y tutela en el webhook de Next.js:

```typescript
// En src/app/api/stripe/webhook/route.ts

// Después de procesar reclamación, agregar:

// Generar documentos para estudiantes
if (documentType === 'estudiantes' && userId && items) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    // Llamar a endpoint de generación de estudiantes
    // O implementar generación directa aquí
    for (const item of items) {
      await generateStudentDocument({
        userId,
        userEmail: customerEmail,
        area: item.area,
        documentName: item.name,
        country: item.country
      });
    }
  } catch (error) {
    console.error('❌ Error generando documentos de estudiantes:', error);
  }
}

// Generar documentos para tutela
if (documentType === 'accion_tutela' && userId && docId && tutelaId) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    // Llamar a endpoint de generación de tutela
    const generateResponse = await fetch(`${baseUrl}/api/accion-tutela/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'internal-secret'}`,
      },
      body: JSON.stringify({ userId, docId, tutelaId, formData }),
    });
  } catch (error) {
    console.error('❌ Error generando documentos de tutela:', error);
  }
}
```

### Opción 2: Actualizar Firebase Functions Webhook

Agregar generación para reclamación en el webhook de Firebase Functions:

```typescript
// En functions/src/index.ts - processWebhookAsync

// Después de procesar estudiantes/tutela, agregar:

if (documentType === 'reclamacion_cantidades' && uid && caseId) {
  // Llamar a endpoint de Next.js para generar reclamación
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  await fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'internal-secret'}`,
    },
    body: JSON.stringify({ caseId, uid }),
  });
}
```

---

## 🧪 Verificación de Webhook Activo

**Pregunta crítica:** ¿Cuál webhook está configurado en Stripe Dashboard?

**Para verificar:**
1. Ir a Stripe Dashboard → Webhooks
2. Ver qué endpoint está configurado:
   - Next.js: `https://tu-dominio.com/api/stripe/webhook`
   - Firebase Functions: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`

**Impacto:**
- Si está configurado Next.js → Solo reclamación genera automáticamente
- Si está configurado Firebase Functions → Solo estudiantes y tutela generan automáticamente

---

## ✅ Recomendación Final

**Unificar en Next.js Webhook:**
1. ✅ Ya está en el código base de Next.js
2. ✅ Más fácil de mantener
3. ✅ Mismo stack tecnológico
4. ✅ Ya genera reclamación correctamente
5. ⚠️ Necesita agregar estudiantes y tutela

**Pasos:**
1. Verificar qué webhook está activo en Stripe
2. Si es Next.js: Agregar generación para estudiantes y tutela
3. Si es Firebase Functions: Agregar generación para reclamación
4. O migrar todo a un solo webhook (recomendado: Next.js)

---

**Última Actualización:** Diciembre 2024

