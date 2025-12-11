# Configuración del Webhook en Stripe Dashboard

## Paso a Paso: Qué Hacer en Stripe

### Paso 1: Acceder al Dashboard de Stripe

1. Ve a **https://dashboard.stripe.com**
2. **IMPORTANTE**: Verifica el modo (Test o Live) en el toggle superior derecho
   - **Test mode**: Para desarrollo y pruebas
   - **Live mode**: Para producción
   - ⚠️ El webhook secret es diferente para cada modo

---

### Paso 2: Navegar a la Sección de Webhooks

1. En el menú lateral izquierdo, haz clic en **"Developers"**
2. Luego haz clic en **"Webhooks"**
3. Verás una lista de endpoints de webhook (si ya tienes alguno configurado)

---

### Paso 3: Verificar si Ya Existe un Webhook

#### Opción A: Ya Existe un Webhook

Si ya tienes un webhook configurado (por ejemplo, para estudiantes):

1. **Haz clic en el webhook existente** para editarlo
2. **NO necesitas crear uno nuevo** - el mismo webhook puede manejar múltiples tipos de documentos
3. Ve al **Paso 4** para verificar la configuración

#### Opción B: No Existe un Webhook

Si no tienes ningún webhook configurado:

1. Haz clic en el botón **"+ Add endpoint"** (arriba a la derecha)
2. Ve al **Paso 4** para configurarlo

---

### Paso 4: Configurar el Endpoint URL

#### 4.1 Obtener la URL de tu Firebase Function

**Método 1: Desde Firebase Console**
1. Ve a **https://console.firebase.google.com**
2. Selecciona tu proyecto: `avocat-legaltech-v3`
3. En el menú lateral, haz clic en **"Functions"**
4. Busca la función `stripeWebhook`
5. Haz clic en ella
6. Copia la **URL** (debería verse así):
   ```
   https://us-central1-avocat-legaltech-v3.cloudfunctions.net/stripeWebhook
   ```
   ⚠️ **Nota**: La región puede ser diferente (`us-central1`, `europe-west1`, etc.)

**Método 2: Desde Terminal**
```bash
# Listar todas las funciones desplegadas
firebase functions:list

# Buscar específicamente stripeWebhook
firebase functions:list | grep stripeWebhook
```

#### 4.2 Configurar en Stripe Dashboard

1. En el campo **"Endpoint URL"**, pega la URL de tu Firebase Function:
   ```
   https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
   
2. **IMPORTANTE**: 
   - ✅ Debe empezar con `https://`
   - ✅ NO debe terminar con `/` (sin trailing slash)
   - ✅ Debe ser la URL completa de la función

---

### Paso 5: Seleccionar Eventos a Escuchar

1. En la sección **"Events to send"**, selecciona:
   - ✅ **"Select events"** (no "Send all events")
   
2. En la lista de eventos, marca estos:
   - ✅ **`checkout.session.completed`** (REQUERIDO - este es el principal)
   - Opcional pero recomendado:
     - ✅ `checkout.session.expired` (si el usuario cancela)
     - ✅ `payment_intent.payment_failed` (si el pago falla)

3. Haz clic en **"Add events"** o **"Save"**

---

### Paso 6: Guardar el Webhook

1. Haz clic en el botón **"Add endpoint"** (si es nuevo) o **"Save changes"** (si estás editando)
2. Stripe te mostrará una página de confirmación

---

### Paso 7: Obtener el Webhook Signing Secret

**⚠️ ESTO ES CRÍTICO - Necesitarás este secret para configurar tu aplicación**

1. Después de crear/guardar el webhook, verás la página de detalles
2. Busca la sección **"Signing secret"**
3. Haz clic en el botón **"Reveal"** o **"Click to reveal"**
4. **Copia el secret completo** (empieza con `whsec_...`)
   - Ejemplo: `whsec_1234567890abcdefghijklmnopqrstuvwxyz`
5. **Guárdalo en un lugar seguro** - lo necesitarás para:
   - Configurar en `.env.local` (desarrollo)
   - Configurar en Firebase Secrets (producción)

---

### Paso 8: Verificar el Webhook (Opcional pero Recomendado)

#### 8.1 Enviar un Evento de Prueba

1. En la página de detalles del webhook
2. Haz clic en el botón **"Send test webhook"** o **"Send test event"**
3. Selecciona el evento: **`checkout.session.completed`**
4. Haz clic en **"Send test webhook"**

#### 8.2 Verificar la Respuesta

1. Ve a la pestaña **"Recent events"** en la misma página
2. Deberías ver el evento de prueba
3. Verifica que el status sea **"Succeeded"** (verde) ✅
4. Si hay un error, haz clic en el evento para ver los detalles

---

### Paso 9: Configurar el Secret en tu Aplicación

#### 9.1 Para Desarrollo Local (`.env.local`)

1. Abre el archivo `.env.local` en la raíz de tu proyecto
2. Añade o actualiza esta línea:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_... # El secret que copiaste en Paso 7
   ```
3. **IMPORTANTE**: 
   - Sin espacios alrededor del `=`
   - Sin comillas (a menos que el secret tenga espacios, lo cual es raro)
   - El valor exacto que copiaste

#### 9.2 Para Producción (Firebase Secrets)

```bash
# En la terminal, ejecuta:
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Te pedirá que ingreses el secret
# Pega el secret que copiaste en Paso 7
# Presiona Enter
```

**Alternativa**: Si no tienes billing habilitado en Firebase:
- Usa variables de entorno en lugar de secrets
- Añade `USE_ENV_VARS=true` en `.env.local`
- Las funciones usarán `process.env.STRIPE_WEBHOOK_SECRET`

---

### Paso 10: Verificar que el Webhook Está Activo

1. En Stripe Dashboard → **Webhooks** → Tu endpoint
2. Verifica que el estado sea **"Enabled"** (habilitado)
3. Verifica que la URL sea correcta
4. Verifica que los eventos estén seleccionados

---

## Configuración Específica para Acción de Tutela

### No Necesitas Configuración Adicional en Stripe

**Importante**: El mismo webhook maneja TODOS los tipos de documentos:
- ✅ Estudiantes
- ✅ Acción de Tutela
- ✅ Reclamación de Cantidades

**La diferenciación se hace en el código**, no en Stripe:
- El frontend envía `documentType: 'accion_tutela'` en el metadata del checkout session
- El webhook lee este metadata y procesa según el tipo

---

## Verificación Rápida

### Checklist de Configuración en Stripe:

- [ ] Webhook creado o editado
- [ ] URL del endpoint configurada correctamente
- [ ] Evento `checkout.session.completed` seleccionado
- [ ] Webhook Signing Secret copiado
- [ ] Secret configurado en `.env.local` (desarrollo)
- [ ] Secret configurado en Firebase Secrets (producción)
- [ ] Test webhook enviado y verificado
- [ ] Status del webhook es "Enabled"

---

## Troubleshooting en Stripe Dashboard

### Problema: No veo la opción "Webhooks"
**Solución**: 
- Asegúrate de estar en **Developers** → **Webhooks**
- Verifica que tienes permisos de administrador en la cuenta de Stripe

### Problema: El webhook muestra errores 400
**Solución**:
- Verifica que el Signing Secret coincide exactamente
- Verifica que la URL del endpoint es correcta
- Revisa los logs en Firebase Functions

### Problema: Los eventos no se están enviando
**Solución**:
- Verifica que el webhook está "Enabled"
- Verifica que los eventos están seleccionados
- Verifica que la URL es accesible (no bloqueada por firewall)

### Problema: Test webhook falla
**Solución**:
- Verifica que Firebase Functions está desplegado
- Verifica que la función `stripeWebhook` existe
- Revisa los logs de Firebase Functions para ver el error específico

---

## Capturas de Pantalla de Referencia

### Ubicación en Stripe Dashboard:
```
Stripe Dashboard
  └── Developers (menú lateral)
      └── Webhooks
          └── [Tu endpoint]
              ├── Endpoint URL: https://...
              ├── Events to send: checkout.session.completed
              ├── Signing secret: whsec_... (click to reveal)
              └── Recent events (pestaña)
```

---

## Próximos Pasos Después de Configurar en Stripe

Una vez configurado el webhook en Stripe:

1. ✅ **Actualizar código** (`functions/src/index.ts`) para detectar `accion_tutela`
2. ✅ **Desplegar Firebase Functions**: `firebase deploy --only functions:stripeWebhook`
3. ✅ **Probar con una compra real** usando tarjeta de prueba
4. ✅ **Verificar en Firestore** que el purchase se crea correctamente

---

## Resumen Visual del Flujo

```
Usuario completa formulario de Tutela
    ↓
Frontend llama a /api/stripe/create-checkout-session
    ↓ (incluye documentType: 'accion_tutela' en metadata)
Stripe crea checkout session
    ↓
Usuario paga en Stripe
    ↓
Stripe envía webhook → Tu Firebase Function
    ↓
Webhook procesa y crea purchase en Firestore
    ↓ (con documentType: 'accion_tutela')
Purchase guardado con todos los datos
```

---

## Comandos Útiles

```bash
# Ver logs del webhook en tiempo real
firebase functions:log --only stripeWebhook

# Verificar que la función está desplegada
firebase functions:list

# Desplegar solo el webhook
firebase deploy --only functions:stripeWebhook

# Verificar secrets configurados
firebase functions:secrets:access STRIPE_WEBHOOK_SECRET
```

---

## Notas Importantes

1. **Un solo webhook para todo**: No necesitas crear webhooks separados para estudiantes y tutela. El mismo webhook maneja ambos.

2. **Secrets diferentes por modo**: 
   - Test mode → Secret diferente
   - Live mode → Secret diferente
   - Asegúrate de usar el correcto según el modo

3. **URL debe ser pública**: La URL del webhook debe ser accesible desde internet. Firebase Functions ya lo es por defecto.

4. **Timeout**: El webhook tiene un timeout de 540 segundos (9 minutos) configurado en el código, suficiente para generar documentos.

---

## ¿Necesitas Ayuda?

Si después de seguir estos pasos el webhook no funciona:

1. **Revisa los logs** en Firebase Functions
2. **Revisa los eventos** en Stripe Dashboard → Webhooks → Recent events
3. **Verifica el secret** coincide exactamente
4. **Prueba con Stripe CLI** localmente para aislar el problema

