# 🧪 Guía de Testing Local - Stripe Reclamación de Cantidades

Esta guía explica cómo probar el flujo completo de **Reclamación de Cantidades** con Stripe en modo TEST desde tu entorno local.

---

## 📋 Prerrequisitos

### 1. Variables de entorno configuradas

Asegúrate de tener en tu `.env.local`:

```env
# Stripe Configuration (modo TEST)
STRIPE_SECRET_KEY=sk_test_...  # Clave secreta de TEST
STRIPE_WEBHOOK_SECRET=whsec_...  # Secreto del webhook de TEST
STRIPE_RECLAMACION_UNIT_AMOUNT=1999  # 19.99 EUR en céntimos

# Firebase Admin (para verificar tokens y actualizar Firestore)
FIREBASE_PROJECT_ID=avocat-legaltech-v3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@avocat-legaltech-v3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App Configuration
NEXTAUTH_URL=http://localhost:3000  # O el puerto que uses

# Google Chat (opcional, para notificaciones)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/...
```

### 2. Stripe CLI instalado (para webhooks locales)

```bash
# Instalar Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# O descargar desde: https://stripe.com/docs/stripe-cli
```

### 3. Datos de prueba en Firestore

Antes de probar, asegúrate de tener una reclamación de prueba en Firestore:

**Colección:** `/reclamaciones/{reclId}`

```json
{
  "id": "RECL_TEST_001",
  "userId": "USER_TEST_001",
  "titulo": "Reclamación de Prueba",
  "fechaISO": "2024-01-01T00:00:00.000Z",
  "estado": "pendiente",
  "demandante": {
    "nombre": "Test User",
    "dni": "12345678A",
    "domicilio": "Calle Test 123",
    "telefono": "600123456"
  },
  "demandada": {
    "nombre": "Empresa Test S.L.",
    "cif": "B12345678",
    "domicilio": "Calle Empresa 456"
  },
  "documentId": "DOC_TEST_001",
  "precio": 0,
  "cuantia": 1000
}
```

**Colección:** `/documents/{docId}`

```json
{
  "id": "DOC_TEST_001",
  "userId": "USER_TEST_001",
  "type": "reclamacion_cantidades",
  "status": "completed",
  "pricing": {
    "cost": 0,
    "currency": "EUR",
    "paid": false
  }
}
```

**Colección:** `/users/{userId}`

```json
{
  "uid": "USER_TEST_001",
  "email": "test@example.com",
  "stats": {
    "totalDocuments": 0,
    "totalGenerations": 0,
    "totalSpent": 0,
    "totalReclamaciones": 0
  }
}
```

---

## 🚀 Pasos para probar

### Paso 1: Iniciar el servidor local

```bash
npm run dev
# O
yarn dev
```

El servidor debería estar corriendo en `http://localhost:3000` (o el puerto configurado).

### Paso 2: Configurar webhook local con Stripe CLI

En una terminal separada, ejecuta:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Esto:
- Inicia un listener de webhooks de Stripe
- Reenvía los eventos a tu servidor local
- Te mostrará un `webhook signing secret` (cópialo)

**Actualiza tu `.env.local` con el secreto que te muestra:**

```env
STRIPE_WEBHOOK_SECRET=whsec_...  # El que te muestra stripe listen
```

**Reinicia tu servidor Next.js** para que cargue el nuevo secreto.

### Paso 3: Acceder a la página de prueba

Navega a:

```
http://localhost:3000/dev/stripe-reclamacion-test
```

### Paso 4: Completar el formulario

La página tiene valores por defecto, pero puedes cambiarlos:

- **docId**: `DOC_TEST_001` (debe existir en Firestore)
- **reclId**: `RECL_TEST_001` (debe existir en Firestore)
- **userId**: `USER_TEST_001` (solo en desarrollo)
- **customerEmail**: `test@example.com`

### Paso 5: Crear sesión de checkout

1. Haz clic en **"💳 Probar reclamación de cantidades (Stripe TEST)"**
2. Serás redirigido a Stripe Checkout (modo TEST)

### Paso 6: Completar el pago de prueba

Usa una tarjeta de prueba de Stripe:

**Tarjeta de éxito:**
- Número: `4242 4242 4242 4242`
- Fecha: Cualquier fecha futura (ej: 12/25)
- CVC: Cualquier 3 dígitos (ej: 123)
- ZIP: Cualquier código postal (ej: 12345)

**Otras tarjetas de prueba:**
- Rechazada: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

### Paso 7: Verificar resultados

Después de completar el pago, serás redirigido de vuelta a la página de prueba.

**Verifica en Firestore:**

1. **`/purchases/{sessionId}`**
   - Debe existir un documento con el `sessionId` de Stripe
   - `status: 'completed'`
   - `amount: 19.99` (o el valor de `STRIPE_RECLAMACION_UNIT_AMOUNT / 100`)
   - `metadata.reclId` y `metadata.docId` deben coincidir

2. **`/reclamaciones/{reclId}`**
   - `precio: 19.99` (actualizado)
   - `estado: 'completada'` (actualizado)
   - `updatedAt` debe tener timestamp reciente

3. **`/documents/{docId}`**
   - `pricing.cost: 19.99` (actualizado)
   - `pricing.paid: true` (actualizado)
   - `pricing.paidAt` debe tener timestamp reciente

4. **`/users/{userId}/stats`**
   - `stats.totalSpent` debe incrementarse en 19.99
   - `stats.totalReclamaciones` debe incrementarse en 1

**Verifica en la terminal:**

- Deberías ver logs del webhook procesando el evento
- Deberías ver confirmaciones de actualización en Firestore
- Si tienes Google Chat configurado, deberías recibir una notificación

---

## 🔍 Troubleshooting

### Error: "userId es requerido"

**Causa:** El `userId` no se está obteniendo correctamente.

**Solución:**
- En desarrollo, asegúrate de que `NODE_ENV !== 'production'`
- Verifica que estás pasando `userId` en el body del request
- Revisa los logs del servidor para ver si hay errores de autenticación

### Error: "Reclamación {reclId} no existe en Firestore"

**Causa:** La reclamación de prueba no existe en Firestore.

**Solución:**
- Crea la reclamación de prueba manualmente en Firestore
- O usa un `reclId` que ya exista

### Webhook no se procesa

**Causa:** El webhook no está llegando al servidor local.

**Solución:**
- Verifica que `stripe listen` está corriendo
- Verifica que el `STRIPE_WEBHOOK_SECRET` en `.env.local` coincide con el que muestra `stripe listen`
- Reinicia el servidor Next.js después de cambiar el secreto
- Revisa los logs de `stripe listen` para ver si hay errores

### payment_status !== 'paid'

**Causa:** El pago no se completó exitosamente.

**Solución:**
- Usa una tarjeta de prueba válida (4242 4242 4242 4242)
- Verifica que completaste todos los pasos del checkout
- Revisa los logs del webhook para ver el `payment_status` real

### Firestore no se actualiza

**Causa:** Error al actualizar Firestore.

**Solución:**
- Verifica las credenciales de Firebase Admin en `.env.local`
- Revisa los logs del servidor para ver errores específicos
- Verifica que las colecciones existen en Firestore
- Verifica que el `userId` tiene permisos para actualizar sus propios datos

---

## 📝 Notas importantes

1. **Esta página es solo para desarrollo**: No debe estar accesible en producción.

2. **Modo TEST de Stripe**: Todos los pagos son simulados, no se cobra dinero real.

3. **Webhook local**: Necesitas `stripe listen` corriendo para recibir webhooks en local.

4. **Datos de prueba**: Asegúrate de tener datos de prueba en Firestore antes de probar.

5. **Variables de entorno**: En desarrollo, `NODE_ENV` debe ser diferente de `'production'` para que funcione el fallback de `userId`.

---

## 🔗 Recursos útiles

- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Firebase Console](https://console.firebase.google.com/)

---

## ✅ Checklist de verificación

Antes de probar, verifica:

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Stripe CLI instalado y `stripe listen` corriendo
- [ ] Servidor Next.js corriendo en local
- [ ] Datos de prueba creados en Firestore
- [ ] Página de prueba accesible en `/dev/stripe-reclamacion-test`
- [ ] Tarjetas de prueba de Stripe listas

Después de probar, verifica:

- [ ] Sesión de checkout creada exitosamente
- [ ] Pago completado en Stripe Checkout
- [ ] Webhook recibido y procesado
- [ ] `/purchases/{sessionId}` creado en Firestore
- [ ] `/reclamaciones/{reclId}` actualizado
- [ ] `/documents/{docId}` actualizado
- [ ] `/users/{userId}/stats` actualizado
- [ ] Notificación a Google Chat enviada (si está configurado)

