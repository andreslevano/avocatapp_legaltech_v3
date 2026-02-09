# 🚀 Guía: Crear Servicio Cloud Run Manualmente

## Pasos para crear el servicio `avocatapp-legaltech` en `us-central1`

### 1. Acceder a Cloud Run

Ve a: https://console.cloud.google.com/run?project=avocat-legaltech-v3

### 2. Crear Nuevo Servicio

1. Haz clic en **"CREATE SERVICE"** o **"CREAR SERVICIO"**
2. Selecciona **"Deploy one revision from a source repository"** o **"Deploy from source"**

### 3. Configuración Básica

- **Service name**: `avocatapp-legaltech`
- **Region**: `us-central1` (Iowa)
- **Authentication**: Marca **"Allow unauthenticated invocations"** ✅

### 4. Configuración de Deployment

#### Opción A: Desde Repositorio de GitHub

1. **Source**: Selecciona tu repositorio de GitHub
2. **Branch**: `dev`
3. **Build type**: 
   - Si tienes `Dockerfile`: Selecciona "Dockerfile"
   - Si no: Selecciona "Buildpacks" (recomendado para Next.js)

#### Opción B: Desde Código Fuente

1. **Source**: "Upload from your workstation" o conecta repositorio
2. **Build type**: "Buildpacks" (detecta automáticamente Next.js)

### 5. Configuración Avanzada (Opcional)

En **"Container(s), Volumes, Networking, Security"**:

- **CPU**: 1 (o más según necesites)
- **Memory**: 512 MiB (mínimo) o 1 GiB (recomendado)
- **Timeout**: 300 segundos (5 minutos)
- **Concurrency**: 80 (default)

### 6. Variables de Entorno

**IMPORTANTE**: Después de crear el servicio, configura las variables de entorno:

1. Ve a la configuración del servicio
2. Haz clic en **"EDIT & DEPLOY NEW REVISION"**
3. Ve a la pestaña **"Variables & Secrets"**
4. Agrega todas las variables necesarias (ver lista abajo)

### 7. Crear el Servicio

Haz clic en **"CREATE"** o **"CREAR"**

El proceso puede tardar 5-10 minutos.

---

## 📝 Variables de Entorno Necesarias

Después de crear el servicio, configura estas variables:

### Firebase (Cliente)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Servidor)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (usar Secret Manager)
- `FIREBASE_STORAGE_BUCKET`

### Stripe
- `STRIPE_SECRET_KEY` (usar Secret Manager)
- `STRIPE_WEBHOOK_SECRET` (usar Secret Manager)
- `STRIPE_RECLAMACION_UNIT_AMOUNT=1999`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### OpenAI
- `OPENAI_API_KEY` (usar Secret Manager)
- `OPENAI_MODEL=gpt-4o`

### App Configuration
- `NEXTAUTH_URL=https://avocatapp.com`
- `NEXTAUTH_SECRET`

### Opcional
- `GOOGLE_CHAT_WEBHOOK_URL`

---

## ✅ Verificación

Una vez creado el servicio:

1. Verifica que la URL del servicio esté disponible
2. Verifica que el servicio esté en estado "Active"
3. Avísame y haré el deploy de Firebase Hosting

---

## 🔗 URLs Útiles

- **Cloud Run Console**: https://console.cloud.google.com/run?project=avocat-legaltech-v3
- **Billing**: https://console.cloud.google.com/billing?project=avocat-legaltech-v3
- **Secret Manager**: https://console.cloud.google.com/security/secret-manager?project=avocat-legaltech-v3





