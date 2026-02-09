# Implementación: Reclamación de Cantidades (Firestore First)

## ✅ Estado de Implementación

### Endpoints API Creados

1. ✅ **POST /api/reclamaciones-cantidades/create-case**
   - Crea nuevo caso en Firestore
   - Estructura: `users/{uid}/reclamaciones_cantidades/{caseId}`

2. ✅ **POST /api/reclamaciones-cantidades/register-upload**
   - Registra archivos subidos en Firestore
   - Actualiza `storage.inputFiles`

3. ✅ **POST /api/reclamaciones-cantidades/ocr-and-draft**
   - Procesa OCR de todos los PDFs
   - Extrae información estructurada
   - Genera borrador con OpenAI
   - Guarda en `ocr` y `drafting` en Firestore

4. ✅ **PATCH /api/reclamaciones-cantidades/update-form-data**
   - Actualiza datos del formulario
   - Guarda en `formData` en Firestore

5. ✅ **GET /api/reclamaciones-cantidades/[caseId]**
   - Obtiene caso completo desde Firestore

6. ✅ **POST /api/reclamaciones-cantidades/create-checkout-session**
   - Crea sesión de Stripe Checkout
   - Valida que tiene OCR y borrador
   - Actualiza estado a `waiting_payment`

7. ✅ **POST /api/reclamaciones-cantidades/generate-final**
   - Genera escrito final con OpenAI
   - Crea PDF con jsPDF
   - Guarda en Storage: `reclamaciones_cantidades/{uid}/{caseId}/output/final.pdf`
   - Actualiza Firestore con PDF final

8. ✅ **Webhook de Stripe actualizado**
   - Detecta pago de reclamación
   - Llama automáticamente a `generate-final`
   - Actualiza estado a `paid`

### Tipos TypeScript

✅ **src/types/reclamacion-cantidades.ts**
- Todos los tipos según diseño técnico
- `ReclamacionCantidades`, `OcrData`, `FormDataRC`, etc.

### Prompts

✅ **src/lib/prompts/reclamacion-cantidades-maestro.ts**
- Prompt maestro según especificación
- Función `buildPromptReclamacion` con placeholders

### Funciones de Utilidad

✅ **src/lib/pdf-ocr.ts**
- `extractTextFromPDF` - OCR con pdf-parse
- `extractInvoiceInfo` - Extrae cantidades, fechas, deudor

## 📋 Flujo Completo Implementado

```
1. Usuario crea caso
   POST /api/reclamaciones-cantidades/create-case
   → Firestore: users/{uid}/reclamaciones_cantidades/{caseId}
   → status: "draft"

2. Usuario sube PDFs
   → Storage: reclamaciones_cantidades/{uid}/{caseId}/input/*.pdf
   POST /api/reclamaciones-cantidades/register-upload
   → Firestore: storage.inputFiles actualizado

3. Usuario inicia OCR y borrador
   POST /api/reclamaciones-cantidades/ocr-and-draft
   → OCR de todos los PDFs
   → Extracción de datos estructurados
   → Generación de borrador con OpenAI
   → Firestore: ocr, drafting actualizados
   → status: "draft"

4. Usuario edita datos (opcional)
   PATCH /api/reclamaciones-cantidades/update-form-data
   → Firestore: formData actualizado

5. Usuario paga
   POST /api/reclamaciones-cantidades/create-checkout-session
   → Stripe Checkout Session creada
   → Firestore: payment.status = "in_process"
   → status: "waiting_payment"

6. Stripe webhook (pago completado)
   POST /api/stripe/webhook
   → Detecta type: "reclamacion_cantidades"
   → Llama a generate-final
   → Genera escrito final con OpenAI
   → Crea PDF
   → Storage: reclamaciones_cantidades/{uid}/{caseId}/output/final.pdf
   → Firestore: storage.finalPdf, status = "paid"

7. Usuario descarga PDF final
   GET /api/reclamaciones-cantidades/[caseId]
   → Retorna caso con storage.finalPdf.url
```

## 🔧 Próximos Pasos

### Frontend (Pendiente)

Necesitas adaptar `ReclamacionProcessSimple.tsx` para usar los nuevos endpoints:

1. **Crear caso al iniciar:**
```typescript
const createCase = async () => {
  const response = await fetch('/api/reclamaciones-cantidades/create-case', {
    method: 'POST',
    body: JSON.stringify({ uid: user.uid }),
  });
  const { caseId } = await response.json();
  setCurrentCaseId(caseId);
};
```

2. **Registrar uploads:**
```typescript
// Después de subir a Storage
await fetch('/api/reclamaciones-cantidades/register-upload', {
  method: 'POST',
  body: JSON.stringify({
    caseId,
    uid: user.uid,
    files: [{ path: storagePath, fileName: file.name }],
  }),
});
```

3. **Iniciar OCR y borrador:**
```typescript
const startOCR = async () => {
  const response = await fetch('/api/reclamaciones-cantidades/ocr-and-draft', {
    method: 'POST',
    body: JSON.stringify({ caseId, uid: user.uid }),
  });
  const { ocr, draft } = await response.json();
  // Mostrar borrador al usuario
};
```

4. **Pagar:**
```typescript
const handlePayment = async () => {
  const response = await fetch('/api/reclamaciones-cantidades/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ caseId, uid: user.uid }),
  });
  const { url } = await response.json();
  window.location.href = url; // Redirigir a Stripe
};
```

5. **Obtener caso (después del pago):**
```typescript
const getCase = async () => {
  const response = await fetch(`/api/reclamaciones-cantidades/${caseId}?uid=${user.uid}`);
  const { case: caseData } = await response.json();
  if (caseData.status === 'paid' && caseData.storage?.finalPdf?.url) {
    // Mostrar botón de descarga
  }
};
```

## 🧪 Testing

Ver `docs/guia-pruebas-reclamacion.md` para pruebas completas.

### Prueba Rápida

1. Crear caso:
```bash
curl -X POST http://localhost:3000/api/reclamaciones-cantidades/create-case \
  -H "Content-Type: application/json" \
  -d '{"uid":"test-user-123"}'
```

2. Verificar en Firestore Console que se creó el documento.

## 📝 Notas Importantes

- **Firestore es la fuente de verdad:** Todo se guarda primero en Firestore
- **Storage solo para binarios:** PDFs se guardan en Storage, pero las rutas están en Firestore
- **Webhook genera PDF:** El PDF final se genera automáticamente después del pago
- **Seguridad:** Todos los endpoints validan que el `caseId` pertenece al `uid`

## 🔐 Variables de Entorno Necesarias

```env
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket.appspot.com

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_RECLAMACION=price_... (opcional)
RECLAMACION_PRICE_AMOUNT=5000 (opcional, en centavos)

# Internal (para webhook)
INTERNAL_API_SECRET=tu-secret-interno (opcional)
```



