# Instrucciones de Despliegue - Fixes Críticos

## 🚨 Errores que Requieren Despliegue

Los siguientes errores están resueltos en el código local pero **NO están desplegados en producción**:

### 1. ❌ Error de Índice de Firestore
**Error:** `The query requires an index`
**Estado:** ✅ Resuelto localmente, ⚠️ Pendiente desplegar

### 2. ❌ Error de Análisis de Éxito
**Error:** `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Estado:** ✅ Resuelto localmente, ⚠️ Pendiente desplegar

### 3. ❌ Error de Procesamiento de Pago
**Error:** `Payment error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Estado:** ✅ Resuelto localmente, ⚠️ Pendiente desplegar

---

## 📋 Checklist de Despliegue

### Paso 1: Verificar Cambios Locales

Asegúrate de que estos archivos existen y están correctos:

- [x] `src/app/api/analisis-exito/route.ts` - ✅ Creado
- [x] `src/app/api/stripe/create-checkout-session/route.ts` - ✅ Creado
- [x] `firestore.indexes.json` - ✅ Actualizado con índice faltante
- [x] `src/components/ReclamacionProcessSimple.tsx` - ✅ Mejorado manejo de errores
- [x] `src/components/TutelaProcessSimple.tsx` - ✅ Mejorado manejo de errores

### Paso 2: Desplegar Índice de Firestore (URGENTE)

**Opción A: Usar el enlace del error (Más Rápido)**

1. Abre este enlace desde el error en la consola:
   ```
   https://console.firebase.google.com/v1/r/project/avocat-legaltech-v3/firestore/indexes?create_composite=ClVwcm9qZWN0cy9hdm9jYXQtbGVnYWx0ZWNoLXYzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wdXJjaGFzZXMvaW5kZXhlcy9fEAEaEAoMZG9jdW1lbnRUeXBlEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
   ```

2. Haz clic en **"Create Index"**
3. Espera a que se cree (puede tardar unos minutos)

**Opción B: Desplegar desde Firebase CLI**

```bash
cd C:\Cursor\avocatapp_legaltech_v3
firebase deploy --only firestore:indexes
```

**Opción C: Desde Firebase Console Manualmente**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona proyecto: `avocat-legaltech-v3`
3. Ve a **Firestore Database** → **Indexes**
4. Haz clic en **"Create Index"**
5. Configura:
   - **Collection ID:** `purchases`
   - **Fields:**
     - `userId` (Ascending)
     - `documentType` (Ascending)
     - `createdAt` (Descending)
6. Haz clic en **"Create"**

### Paso 3: Desplegar Código a Producción

**Si usas Vercel:**

```bash
# Asegúrate de estar en la rama correcta
git checkout dev_reclamacion

# Commit los cambios si no están commiteados
git add .
git commit -m "Fix: Agregar endpoints faltantes y mejorar manejo de errores"

# Push a la rama
git push origin dev_reclamacion

# Vercel debería desplegar automáticamente
```

**Si usas Firebase Hosting:**

```bash
# Build del proyecto
npm run build

# Desplegar
firebase deploy --only hosting
```

**Si usas otro servicio:**
- Sigue el proceso de despliegue habitual de tu plataforma
- Asegúrate de que los nuevos archivos se incluyan en el build

### Paso 4: Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en producción:

- [ ] `OPENAI_API_KEY` - Requerida para `/api/analisis-exito`
- [ ] `STRIPE_SECRET_KEY` - Requerida para `/api/stripe/create-checkout-session`
- [ ] `STRIPE_WEBHOOK_SECRET` - Requerida para webhooks
- [ ] `RECLAMACION_PRICE_AMOUNT` - Opcional (default: 5000 = €50.00)

### Paso 5: Verificar Despliegue

Después de desplegar, verifica:

1. **Endpoint de Análisis:**
   ```bash
   curl -X POST https://avocatapp.com/api/analisis-exito \
     -H "Content-Type: application/json" \
     -d '{"datosOCR":{},"tipoDocumento":"test"}'
   ```
   Debe devolver JSON, no HTML.

2. **Endpoint de Checkout:**
   ```bash
   curl -X POST https://avocatapp.com/api/stripe/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"documentType":"estudiantes","userId":"test","customerEmail":"test@test.com","successUrl":"https://avocatapp.com/success","cancelUrl":"https://avocatapp.com/cancel"}'
   ```
   Debe devolver JSON, no HTML.

3. **Índice de Firestore:**
   - Ve a Firebase Console → Firestore → Indexes
   - Verifica que el índice esté en estado "Enabled"

---

## 🔍 Verificación de Errores

### Error 1: Índice de Firestore
**Síntoma:** `The query requires an index`
**Solución:** Crear índice como se describe en Paso 2
**Tiempo estimado:** 2-10 minutos (depende del tamaño de la base de datos)

### Error 2: Análisis de Éxito
**Síntoma:** `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Causa:** El endpoint `/api/analisis-exito` no existe en producción
**Solución:** Desplegar código (Paso 3)
**Verificación:** El endpoint debe devolver JSON válido

### Error 3: Procesamiento de Pago
**Síntoma:** `Payment error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Causa:** El endpoint `/api/stripe/create-checkout-session` no existe en producción
**Solución:** Desplegar código (Paso 3)
**Verificación:** El endpoint debe devolver JSON válido

---

## 📝 Notas Importantes

1. **El índice de Firestore es crítico** - Sin él, las queries fallarán
2. **Los endpoints deben devolver JSON** - Si devuelven HTML, significa que no están desplegados o hay un error 404
3. **Verifica las variables de entorno** - Sin `OPENAI_API_KEY` y `STRIPE_SECRET_KEY`, los endpoints fallarán
4. **Tiempo de creación del índice** - Puede tardar desde minutos hasta horas dependiendo del tamaño de la base de datos

---

## 🆘 Si los Errores Persisten

1. **Verifica que los archivos estén en producción:**
   - Revisa el build log
   - Verifica que los archivos existan en el servidor

2. **Verifica las rutas:**
   - `/api/analisis-exito` debe existir
   - `/api/stripe/create-checkout-session` debe existir

3. **Revisa los logs del servidor:**
   - Busca errores de compilación
   - Busca errores de runtime

4. **Verifica las variables de entorno:**
   - Asegúrate de que estén configuradas correctamente
   - Verifica que no tengan espacios o caracteres especiales

---

**Fecha de creación:** 2025-01-27  
**Rama:** `dev_reclamacion`



