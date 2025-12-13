# Verificación de Firebase Functions

## ✅ Estado Actual (27 de Enero 2025)

### Funciones Activas

1. **`createCheckoutSession`**
   - URL: https://createcheckoutsession-xph64x4ova-uc.a.run.app
   - Solicitudes (24h): 4
   - Estado: ✅ Activa
   - Versión: v2
   - Región: us-central1
   - Timeout: 1 min
   - Instancias: 0 / 20
   - Ruta configurada en `firebase.json`: `/api/stripe/create-checkout-session` → `createCheckoutSession`

2. **`reclamacionCantidades`**
   - URL: https://reclamacioncantidades-xph64x4ova-uc.a.run.app
   - Solicitudes (24h): 5
   - Estado: ✅ Activa
   - Versión: v2
   - Región: us-central1
   - Timeout: 1 min
   - Instancias: 0 / 20
   - Ruta configurada en `firebase.json`: `/api/analisis-exito` → `reclamacionCantidades`

### Otras Funciones Activas

- `stripeWebhook` - 2 solicitudes (24h) - Timeout: 9 min
- `analyzeDocuments` - 0 solicitudes (24h)
- `accionTutela` - 0 solicitudes (24h)
- Y otras 11 funciones más

---

## ⚠️ Importante: Configuración de Rutas

Cuando Firebase Hosting hace un rewrite a una Firebase Function, la función recibe la solicitud completa incluyendo el path. 

### Cómo Funcionan los Rewrites

Cuando un usuario accede a:
- `https://avocatapp.com/api/stripe/create-checkout-session`

Firebase Hosting:
1. Detecta el rewrite en `firebase.json`
2. Envía la solicitud a la función `createCheckoutSession`
3. La función recibe el path completo: `/api/stripe/create-checkout-session`

### Requisitos para las Functions

Las Firebase Functions deben estar configuradas para:

1. **Manejar cualquier método HTTP** (GET, POST, etc.)
2. **Extraer el path de la solicitud** para determinar qué endpoint manejar
3. **Devolver respuestas JSON** apropiadas

### Ejemplo de Implementación Esperada

```typescript
// Para createCheckoutSession
export const createCheckoutSession = functions.https.onRequest(async (req, res) => {
  // Verificar que sea POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar que el path sea correcto
  if (req.path === '/api/stripe/create-checkout-session' || req.path === '/') {
    // Lógica de creación de checkout session
    // ...
    return res.json({ success: true, sessionId: session.id, url: session.url });
  }

  return res.status(404).json({ error: 'Not found' });
});

// Para reclamacionCantidades
export const reclamacionCantidades = functions.https.onRequest(async (req, res) => {
  // Verificar que sea POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar que el path sea correcto
  if (req.path === '/api/analisis-exito' || req.path === '/') {
    // Lógica de análisis de éxito
    // ...
    return res.json({ success: true, data: { analisis: ... } });
  }

  return res.status(404).json({ error: 'Not found' });
});
```

---

## 🔍 Verificación de Funcionamiento

### Test 1: Verificar createCheckoutSession

```bash
curl -X POST https://avocatapp.com/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "estudiantes",
    "userId": "test",
    "customerEmail": "test@test.com",
    "successUrl": "https://avocatapp.com/success",
    "cancelUrl": "https://avocatapp.com/cancel"
  }'
```

**Resultado esperado**: JSON con `success: true` y `sessionId`

### Test 2: Verificar reclamacionCantidades

```bash
curl -X POST https://avocatapp.com/api/analisis-exito \
  -H "Content-Type: application/json" \
  -d '{
    "datosOCR": {
      "documentos": [{"nombre": "test", "tipo": "Documento", "contenido": "test"}]
    },
    "tipoDocumento": "Reclamación de Cantidades",
    "userId": "test"
  }'
```

**Resultado esperado**: JSON con `success: true` y `data.analisis`

---

## 🚨 Si las Functions No Funcionan Correctamente

### Problema: Devuelven HTML en lugar de JSON

**Causa probable**: Las funciones no están manejando correctamente el path o el método HTTP.

**Solución**:
1. Verificar los logs de las funciones en Firebase Console
2. Actualizar las funciones para manejar correctamente los paths
3. Asegurar que devuelvan siempre JSON

### Problema: Error 404

**Causa probable**: El rewrite no está funcionando o la función no existe.

**Solución**:
1. Verificar que `firebase.json` tenga los rewrites correctos
2. Verificar que las funciones estén desplegadas
3. Verificar que los nombres de las funciones coincidan exactamente

### Problema: Error 500

**Causa probable**: Error en la lógica de la función o variables de entorno faltantes.

**Solución**:
1. Revisar logs de las funciones
2. Verificar variables de entorno configuradas
3. Verificar que todas las dependencias estén instaladas

---

## 📝 Variables de Entorno Requeridas

### Para `createCheckoutSession`:
- `STRIPE_SECRET_KEY` - Clave secreta de Stripe
- `RECLAMACION_PRICE_AMOUNT` - Opcional (default: 5000)
- `ACCION_TUTELA_PRICE_AMOUNT` - Opcional (default: 50000)

### Para `reclamacionCantidades`:
- `OPENAI_API_KEY` - Clave de API de OpenAI

**Verificar en**: [Firebase Console - Functions - Config](https://console.firebase.google.com/project/avocat-legaltech-v3/functions)

---

## ✅ Checklist de Verificación

- [x] Funciones desplegadas y activas
- [x] Rewrites configurados en `firebase.json`
- [x] Variables de entorno configuradas (OPENAI_API_KEY encontrada en functions.config)
- [ ] Functions manejan correctamente los paths (necesita verificación)
- [ ] Functions devuelven JSON (no HTML) (necesita verificación)
- [ ] Tests de endpoints funcionando (necesita verificación)

## ⚠️ Nota Importante sobre functions.config()

**DEPRECACIÓN**: `functions.config()` está deprecado y será deshabilitado en Marzo 2026.

**Estado actual**: 
- ✅ `OPENAI_API_KEY` está configurada en `functions.config()`
- ⚠️ Necesita migración a variables de entorno (dotenv) antes de Marzo 2026

**Migración recomendada**: Usar variables de entorno en lugar de `functions.config()`

---

**Última actualización**: 27 de Enero 2025

