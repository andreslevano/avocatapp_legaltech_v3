# 🚀 Guía de Deployment en Firebase/Cloud Run

Esta guía explica cómo desplegar la aplicación Avocat LegalTech v3 en Firebase/Google Cloud Run con todas las configuraciones necesarias para que funcione correctamente en producción.

---

## 📋 Prerrequisitos

1. **Cuenta de Google Cloud Platform** con proyecto configurado
2. **Firebase CLI** instalado: `npm install -g firebase-tools`
3. **Google Cloud SDK** instalado (para Cloud Run)
4. **Credenciales de servicio** de Firebase descargadas

---

## 🔧 Configuración de Variables de Entorno en Producción

### Opción 1: Google Cloud Run (Recomendado para Next.js)

Si estás usando **Next.js con Cloud Run**, configura las variables de entorno así:

#### 1. Configurar variables en Cloud Run

```bash
# Obtener el nombre de tu servicio
gcloud run services list

# Configurar variables de entorno
gcloud run services update YOUR_SERVICE_NAME \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id" \
  --set-env-vars="FIREBASE_PROJECT_ID=tu_proyecto_id" \
  --set-env-vars="FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu_proyecto.iam.gserviceaccount.com" \
  --set-env-vars="STRIPE_SECRET_KEY=sk_live_xxx" \
  --set-env-vars="STRIPE_WEBHOOK_SECRET=whsec_xxx" \
  --set-env-vars="STRIPE_RECLAMACION_UNIT_AMOUNT=1999" \
  --set-env-vars="OPENAI_API_KEY=sk-xxx" \
  --set-env-vars="NEXTAUTH_URL=https://tu-dominio.com" \
  --set-env-vars="NEXTAUTH_SECRET=tu_secreto_generado"
```

**⚠️ IMPORTANTE:** Para `FIREBASE_PRIVATE_KEY`, usa Secret Manager:

```bash
# Crear secreto en Secret Manager
echo -n "-----BEGIN PRIVATE KEY-----\n..." | gcloud secrets create firebase-private-key --data-file=-

# Dar permisos al servicio de Cloud Run
gcloud run services update YOUR_SERVICE_NAME \
  --update-secrets="FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
```

#### 2. Configurar variables usando Secret Manager (Recomendado)

```bash
# Crear secretos para valores sensibles
gcloud secrets create stripe-secret-key --data-file=- <<< "sk_live_xxx"
gcloud secrets create stripe-webhook-secret --data-file=- <<< "whsec_xxx"
gcloud secrets create openai-api-key --data-file=- <<< "sk-xxx"
gcloud secrets create firebase-private-key --data-file=- <<< "-----BEGIN PRIVATE KEY-----\n..."

# Asignar secretos al servicio
gcloud run services update YOUR_SERVICE_NAME \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,OPENAI_API_KEY=openai-api-key:latest,FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
```

### Opción 2: Firebase Functions (Si usas Firebase Functions)

Si estás usando **Firebase Functions**, configura las variables así:

```bash
# Configurar variables de entorno
firebase functions:config:set \
  stripe.secret_key="sk_live_xxx" \
  stripe.webhook_secret="whsec_xxx" \
  stripe.reclamacion_unit_amount="1999" \
  openai.api_key="sk-xxx" \
  firebase.project_id="tu_proyecto_id" \
  firebase.client_email="firebase-adminsdk-xxx@tu_proyecto.iam.gserviceaccount.com" \
  nextauth.url="https://tu-dominio.com" \
  nextauth.secret="tu_secreto_generado"
```

---

## 🔗 Configuración del Webhook de Stripe para Producción

### Paso 1: Obtener la URL de tu aplicación en producción

Si estás usando **Cloud Run**, tu URL será:
```
https://YOUR_SERVICE_NAME-XXXXX-uc.a.run.app
```

Si estás usando **Firebase Hosting**, tu URL será:
```
https://tu-proyecto.web.app
```

### Paso 2: Configurar el webhook en Stripe Dashboard

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Haz clic en **"Add endpoint"**
3. Ingresa la URL del webhook:
   ```
   https://tu-dominio.com/api/stripe/webhook
   ```
   O si usas Cloud Run:
   ```
   https://YOUR_SERVICE_NAME-XXXXX-uc.a.run.app/api/stripe/webhook
   ```
4. Selecciona los eventos a escuchar:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (opcional)
   - `payment_intent.payment_failed` (opcional)
5. Copia el **"Signing secret"** (empieza con `whsec_`)
6. Configúralo en tu servicio como variable de entorno `STRIPE_WEBHOOK_SECRET`

### Paso 3: Verificar que el webhook funciona

Stripe enviará un evento de prueba. Verifica los logs de tu aplicación para confirmar que se recibe correctamente.

---

## 🌐 Configuración de NEXTAUTH_URL

**⚠️ CRÍTICO:** Asegúrate de configurar `NEXTAUTH_URL` con la URL correcta de producción:

```bash
# Para Cloud Run
NEXTAUTH_URL=https://YOUR_SERVICE_NAME-XXXXX-uc.a.run.app

# Para Firebase Hosting
NEXTAUTH_URL=https://tu-proyecto.web.app

# Para dominio personalizado
NEXTAUTH_URL=https://tu-dominio.com
```

---

## 📝 Checklist de Variables de Entorno para Producción

Asegúrate de tener configuradas **TODAS** estas variables:

### Firebase (Cliente - NEXT_PUBLIC_*)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Servidor)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (usar Secret Manager)
- [ ] `FIREBASE_STORAGE_BUCKET`

### Stripe
- [ ] `STRIPE_SECRET_KEY` (usar `sk_live_xxx` en producción)
- [ ] `STRIPE_WEBHOOK_SECRET` (del webhook de producción)
- [ ] `STRIPE_RECLAMACION_UNIT_AMOUNT=1999` (o el precio que desees)

### OpenAI
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL=gpt-4o` (o el modelo que prefieras)
- [ ] `OPENAI_MOCK=0`

### App Configuration
- [ ] `NEXTAUTH_URL` (URL de producción)
- [ ] `NEXTAUTH_SECRET` (generar uno nuevo para producción)

### Opcional
- [ ] `GOOGLE_CHAT_WEBHOOK_URL` (para notificaciones)

---

## 🚀 Proceso de Deployment

### Para Cloud Run (Next.js)

1. **Construir la imagen Docker:**
   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/avocat-app .
   ```

2. **Subir la imagen:**
   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/avocat-app
   ```

3. **Desplegar en Cloud Run:**
   ```bash
   gcloud run deploy avocat-app \
     --image gcr.io/YOUR_PROJECT_ID/avocat-app \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

4. **Configurar variables de entorno** (ver sección anterior)

### Para Firebase Hosting (Static)

1. **Construir la aplicación:**
   ```bash
   npm run build
   npm run export  # Si usas static export
   ```

2. **Desplegar:**
   ```bash
   firebase deploy --only hosting
   ```

---

## ✅ Verificación Post-Deployment

### 1. Verificar que las variables están configuradas

```bash
# Cloud Run
gcloud run services describe YOUR_SERVICE_NAME --format="value(spec.template.spec.containers[0].env)"

# Firebase Functions
firebase functions:config:get
```

### 2. Probar el webhook de Stripe

1. Ve a Stripe Dashboard → Webhooks
2. Haz clic en tu webhook
3. Haz clic en "Send test webhook"
4. Verifica los logs de tu aplicación

### 3. Probar el flujo completo

1. Accede a tu aplicación en producción
2. Inicia sesión
3. Sube documentos para reclamación de cantidades
4. Procede al pago con Stripe (modo TEST primero)
5. Verifica que:
   - El pago se procesa correctamente
   - El webhook se recibe
   - Los datos se guardan en Firestore
   - El documento se genera correctamente

---

## 🔍 Troubleshooting

### Error: "STRIPE_WEBHOOK_SECRET is not defined"

**Solución:** Verifica que la variable de entorno esté configurada:
```bash
gcloud run services describe YOUR_SERVICE_NAME --format="value(spec.template.spec.containers[0].env)"
```

### Error: "Invalid signature" en webhook

**Causa:** El `STRIPE_WEBHOOK_SECRET` no coincide con el del webhook configurado en Stripe.

**Solución:**
1. Ve a Stripe Dashboard → Webhooks
2. Copia el "Signing secret" correcto
3. Actualiza la variable de entorno

### Error: "FIREBASE_PRIVATE_KEY is not defined"

**Solución:** Usa Secret Manager para la clave privada:
```bash
gcloud run services update YOUR_SERVICE_NAME \
  --update-secrets="FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
```

### El webhook no se recibe

**Causa:** La URL del webhook en Stripe no es accesible públicamente.

**Solución:**
1. Verifica que tu servicio esté desplegado y accesible
2. Verifica que la ruta `/api/stripe/webhook` exista
3. Verifica que el servicio permita tráfico no autenticado (si es necesario)

---

## 📚 Recursos Adicionales

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🔐 Seguridad en Producción

1. ✅ **NUNCA** subas `.env.local` a Git
2. ✅ Usa **Secret Manager** para valores sensibles
3. ✅ Usa **diferentes credenciales** para desarrollo y producción
4. ✅ Habilita **HTTPS** siempre
5. ✅ Configura **CORS** correctamente
6. ✅ Usa **rate limiting** para APIs públicas
7. ✅ Monitorea los logs regularmente

---

## 📞 Soporte

Si tienes problemas con el deployment:
1. Revisa los logs: `gcloud run services logs read YOUR_SERVICE_NAME`
2. Verifica las variables de entorno
3. Verifica la configuración del webhook en Stripe
4. Revisa la documentación de Google Cloud Run

