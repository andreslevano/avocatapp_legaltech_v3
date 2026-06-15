# Guía: Configurar Webhook de Stripe para Acción de Tutela

## Resumen
Esta guía explica cómo habilitar el webhook de Stripe para acción de tutela, siguiendo el mismo patrón que estudiantes.

## Estado Actual del Webhook

### Ubicación del Webhook
- **Archivo**: `functions/src/index.ts`
- **Función**: `stripeWebhook` (línea ~2144)
- **Handler**: `processWebhookAsync` (línea ~1863)

### Flujo Actual para Estudiantes
El webhook actualmente procesa:
1. ✅ `checkout.session.completed` - Crea purchase y genera documentos
2. ✅ Detecta `documentType` desde metadata (para reclamaciones)
3. ✅ Genera documentos usando `generateStudentDocumentPackageCore`
4. ✅ Actualiza purchase con documentos generados

### Lo que Falta para Acción de Tutela
1. ❌ Detectar `documentType: 'accion_tutela'` en metadata
2. ❌ Crear purchase con `documentType: 'accion_tutela'`
3. ❌ Generar documentos específicos para tutela (no estudiantes)
4. ❌ Guardar en colección `tutelas` si existe

---

## Paso 1: Verificar Configuración de Stripe Webhook

### 1.1 Acceder al Dashboard de Stripe
1. Ve a https://dashboard.stripe.com
2. Asegúrate de estar en el modo correcto (Test o Live)
3. Navega a **Developers** → **Webhooks**

### 1.2 Verificar Endpoint del Webhook
Tu webhook debe estar configurado como:
```
https://YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook
```

**Para encontrar tu URL:**
1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Functions**
4. Busca la función `stripeWebhook`
5. Copia la URL (debería ser algo como: `https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`)

### 1.3 Verificar Eventos Configurados
El webhook debe escuchar estos eventos:
- ✅ `checkout.session.completed` (REQUERIDO)
- Opcional: `checkout.session.expired`
- Opcional: `payment_intent.payment_failed`

### 1.4 Obtener Webhook Signing Secret
1. En Stripe Dashboard → **Webhooks** → Tu endpoint
2. Haz clic en **"Reveal"** junto a "Signing secret"
3. Copia el secret (empieza con `whsec_...`)
4. Guárdalo - lo necesitarás para configurar

---

## Paso 2: Configurar Variables de Entorno

### 2.1 Variables Requeridas
Asegúrate de tener estas variables configuradas:

**En `.env.local` (desarrollo):**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # o sk_live_... para producción
STRIPE_WEBHOOK_SECRET=whsec_... # Del paso 1.4
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # o pk_live_...

# Firebase Configuration
FIREBASE_PROJECT_ID=avocat-legaltech-v3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=avocat-legaltech-v3.firebasestorage.app

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
```

### 2.2 Configurar Secrets en Firebase Functions
Si usas Firebase Secrets (recomendado para producción):

```bash
# Configurar secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set OPENAI_API_KEY

# O usar variables de entorno (si no tienes billing habilitado)
# Añade USE_ENV_VARS=true en .env.local
```

**Nota**: El código en `functions/src/index.ts` ya maneja ambos métodos (secrets y env vars).

---

## Paso 3: Actualizar Código del Webhook

### 3.1 Modificar `functions/src/index.ts`

**Ubicación**: Función `processWebhookAsync` (línea ~1863)

**Cambios necesarios**:

1. **Detectar `documentType` en metadata** (línea ~1895):
```typescript
// Extraer metadata
const itemsJson = session.metadata?.items;
const documentType = session.metadata?.documentType; // ⭐ NUEVO
const docId = session.metadata?.docId; // ⭐ NUEVO para tutela
const tutelaId = session.metadata?.tutelaId; // ⭐ NUEVO para tutela
```

2. **Añadir lógica para `accion_tutela`** (después de línea ~1960):
```typescript
// Añadir documentType al purchaseData
const purchaseData: any = {
  id: purchaseId,
  userId,
  customerEmail,
  documentType: documentType || 'estudiantes', // ⭐ NUEVO - default a 'estudiantes'
  stripeSessionId: session.id,
  stripePaymentIntentId: session.payment_intent as string,
  items: items.map((item: any) => ({
    id: uuidv4(),
    name: item.name,
    area: item.area,
    country: item.country,
    price: item.price / 100,
    quantity: item.quantity,
    documentType: documentType || 'estudiantes', // ⭐ NUEVO
    status: 'pending',
  })),
  total: totalAmount / 100,
  currency,
  status: 'completed',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  source: 'stripe_webhook',
  webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
  // ⭐ NUEVO: Metadata específica para tutela
  metadata: {
    docId: docId || null,
    tutelaId: tutelaId || null,
    documentType: documentType || 'estudiantes'
  }
};
```

3. **Añadir lógica condicional para generar documentos** (después de línea ~1978):
```typescript
// Helper function to generate documents for a single item
const processItemDocuments = async (item: any, itemIndex: number): Promise<any> => {
  try {
    console.log(`📄 [Item ${itemIndex + 1}] Generando documento: ${item.name} (x${item.quantity})`);
    
    if (!userId || userId === 'unknown') {
      console.warn(`⚠️ Skipping document generation: userId is missing`);
      itemsStatus[itemIndex] = {
        ...item,
        status: 'failed',
        error: 'userId is missing'
      };
      await updateProgress();
      return itemsStatus[itemIndex];
    }
    
    // ⭐ NUEVO: Lógica diferente según documentType
    if (documentType === 'accion_tutela') {
      // Generar documentos para acción de tutela
      // TODO: Implementar generación específica para tutela
      // Por ahora, marcar como pendiente para generación posterior
      itemsStatus[itemIndex] = {
        ...item,
        status: 'pending', // Se generará después del pago
        documentId: docId || null,
        metadata: {
          tutelaId: tutelaId || null,
          docId: docId || null
        }
      };
      await updateProgress();
      return itemsStatus[itemIndex];
    } else {
      // Flujo existente para estudiantes
      // ... código actual de generateStudentDocumentPackageCore ...
    }
  } catch (error) {
    // ... manejo de errores ...
  }
};
```

---

## Paso 4: Actualizar API Route de Checkout Session

### 4.1 Verificar `createCheckoutSession` en `functions/src/index.ts`

**Ubicación**: Función `createCheckoutSession` (línea ~1133)

**Asegurar que incluye metadata**:
```typescript
const session = await stripe.checkout.sessions.create({
  // ... configuración existente ...
  metadata: {
    items: JSON.stringify(items),
    totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    orderId,
    userId,
    // ⭐ NUEVO: Añadir documentType si viene en el request
    documentType: req.body.documentType || 'estudiantes',
    docId: req.body.docId || null,
    tutelaId: req.body.tutelaId || null,
  },
});
```

---

## Paso 5: Actualizar Frontend (TutelaProcessSimple)

### 5.1 Verificar que `handlePayment` incluye `documentType`

**Archivo**: `src/components/TutelaProcessSimple.tsx` (línea ~452)

**Asegurar que el request incluye**:
```typescript
body: JSON.stringify({
  documentType: 'accion_tutela', // ⭐ Asegurar que está presente
  docId: docId,
  tutelaId: tutelaId,
  userId: userId || 'demo_user',
  customerEmail: userEmail || 'user@example.com',
  successUrl: `${window.location.origin}/dashboard/accion-tutela?payment=success&docId=${docId}&tutelaId=${tutelaId}`,
  cancelUrl: `${window.location.origin}/dashboard/accion-tutela?payment=cancelled`,
  // ⭐ NUEVO: Incluir items si el API lo requiere
  items: [{
    name: 'Acción de Tutela',
    area: 'Derecho Constitucional',
    country: 'Colombia',
    price: 1500, // €15.00 en céntimos
    quantity: 1
  }]
})
```

---

## Paso 6: Desplegar Firebase Functions

### 6.1 Compilar Functions
```bash
cd functions
npm install
npm run build
```

### 6.2 Desplegar Solo la Función del Webhook
```bash
firebase deploy --only functions:stripeWebhook
```

### 6.3 Verificar Despliegue
```bash
# Ver logs en tiempo real
firebase functions:log --only stripeWebhook

# O en Firebase Console:
# Functions → stripeWebhook → Logs
```

---

## Paso 7: Configurar Webhook en Stripe Dashboard

### 7.1 Añadir/Verificar Endpoint
1. Stripe Dashboard → **Developers** → **Webhooks**
2. Si ya existe, edítalo. Si no, crea uno nuevo
3. **Endpoint URL**: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
4. **Events to send**: Selecciona `checkout.session.completed`

### 7.2 Obtener Signing Secret
1. Después de crear/editar el webhook
2. Haz clic en **"Reveal"** junto a "Signing secret"
3. Copia el secret
4. Actualiza `STRIPE_WEBHOOK_SECRET` en:
   - `.env.local` (desarrollo)
   - Firebase Secrets (producción): `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

---

## Paso 8: Probar el Webhook

### 8.1 Test Local con Stripe CLI (Recomendado)

```bash
# 1. Instalar Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# O descargar de: https://stripe.com/docs/stripe-cli

# 2. Login
stripe login

# 3. Forward webhooks a tu función local (si tienes emulador)
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook

# O si usas ngrok para exponer tu función:
stripe listen --forward-to https://your-ngrok-url.ngrok.io
```

### 8.2 Trigger Test Event
```bash
# Trigger un evento de checkout completado
stripe trigger checkout.session.completed
```

### 8.3 Verificar en Firestore
Después del test, verifica en Firestore:
- Colección `purchases` → Debe tener un nuevo documento
- Campo `documentType` debe ser `'accion_tutela'`
- Campo `metadata.tutelaId` debe estar presente

---

## Paso 9: Verificar Flujo Completo

### 9.1 Hacer una Compra de Prueba
1. Ve a `/dashboard/accion-tutela`
2. Completa el formulario
3. Procede al pago
4. Usa una tarjeta de prueba de Stripe:
   - Número: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura
   - CVC: Cualquier 3 dígitos

### 9.2 Verificar en Stripe Dashboard
1. Ve a **Payments** → Busca el pago reciente
2. Verifica que el webhook fue enviado:
   - **Webhooks** → Tu endpoint → **Recent events**
   - Debe mostrar `checkout.session.completed` con status "Succeeded"

### 9.3 Verificar en Firestore
```javascript
// En Firebase Console → Firestore
// Busca en colección 'purchases'
// El documento debe tener:
{
  documentType: 'accion_tutela', // ✅
  items: [{
    documentType: 'accion_tutela', // ✅
    name: 'Acción de Tutela',
    status: 'pending' // o 'completed' si se generó
  }],
  metadata: {
    tutelaId: 'TUTELA_...', // ✅
    docId: 'DOC_...', // ✅
    documentType: 'accion_tutela' // ✅
  }
}
```

---

## Paso 10: Implementar Generación de Documentos para Tutela

### 10.1 Opción A: Generar en el Webhook (Similar a Estudiantes)

**Modificar `processItemDocuments` en `functions/src/index.ts`**:

```typescript
if (documentType === 'accion_tutela') {
  // Llamar a API de generación de tutela
  // O implementar generación directa aquí
  const tutelaDocument = await generateTutelaDocument({
    userId,
    userEmail: customerEmail,
    tutelaId,
    docId,
    formData: session.metadata?.formData ? JSON.parse(session.metadata.formData) : {}
  });
  
  itemsStatus[itemIndex] = {
    ...item,
    status: 'completed',
    documentId: tutelaDocument.documentId,
    downloadUrl: tutelaDocument.downloadUrl,
    storagePath: tutelaDocument.storagePath,
    generatedAt: admin.firestore.Timestamp.now()
  };
}
```

### 10.2 Opción B: Generar Después del Pago (Actual)

**Mantener el flujo actual**:
- Webhook crea purchase con `status: 'pending'` para documentos
- Frontend llama a `/api/accion-tutela` después del pago
- API genera documento y actualiza purchase

**Ventaja**: Más control sobre cuándo generar
**Desventaja**: Requiere polling en frontend

---

## Resumen de Cambios Necesarios

### Código a Modificar:

1. ✅ **`functions/src/index.ts`**:
   - Añadir detección de `documentType` en metadata
   - Añadir `documentType` a `purchaseData`
   - Añadir lógica condicional para tutela vs estudiantes
   - Añadir metadata (tutelaId, docId) al purchase

2. ✅ **`src/components/TutelaProcessSimple.tsx`**:
   - Asegurar que `documentType: 'accion_tutela'` está en el request
   - Incluir `tutelaId` y `docId` en metadata

3. ✅ **`src/types/purchase.ts`** (ya planificado):
   - Añadir campo `documentType` a interfaces

### Configuración:

1. ✅ **Stripe Dashboard**: Verificar webhook endpoint y eventos
2. ✅ **Firebase Secrets**: Configurar `STRIPE_WEBHOOK_SECRET`
3. ✅ **Environment Variables**: Asegurar todas las variables están set

---

## Troubleshooting

### Problema: Webhook no recibe eventos
**Solución**: Verificar URL del webhook en Stripe Dashboard

### Problema: Purchase creado pero sin `documentType`
**Solución**: Verificar que `documentType` está en metadata del checkout session

### Problema: Documentos no se generan
**Solución**: 
- Verificar logs de Firebase Functions
- Verificar que OpenAI API key es válida
- Verificar permisos de Firebase Storage

### Problema: Signature verification failed
**Solución**: 
- Verificar que `STRIPE_WEBHOOK_SECRET` coincide exactamente con Stripe Dashboard
- Asegurar que no hay espacios extra o caracteres faltantes

---

## Checklist Final

Antes de considerar el webhook configurado:

- [ ] Webhook endpoint configurado en Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` configurado en Firebase Secrets
- [ ] Código actualizado para detectar `documentType: 'accion_tutela'`
- [ ] Purchase se crea con `documentType: 'accion_tutela'`
- [ ] Items tienen `documentType: 'accion_tutela'`
- [ ] Metadata incluye `tutelaId` y `docId`
- [ ] Test purchase funciona correctamente
- [ ] Logs de Firebase Functions muestran procesamiento exitoso
- [ ] Firestore muestra purchase con todos los campos correctos

---

## Próximos Pasos

Después de configurar el webhook:

1. Implementar generación de documentos para tutela (si no está hecho)
2. Actualizar queries para filtrar por `documentType`
3. Añadir índices compuestos en Firestore: `userId + documentType + createdAt`
4. Actualizar scripts de reprocesamiento para manejar tutela


