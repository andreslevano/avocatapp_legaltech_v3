# 🔧 Solución: Error "Domain not allowlisted by project"

## ❌ Error Actual

```
Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)
```

Este error ocurre porque el dominio `avocatapp.com` no está autorizado en Firebase Authentication.

---

## ✅ Solución: Agregar Dominio Autorizado

### Paso 1: Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **avocat-legaltech-v3**
3. En el menú lateral, ve a **Authentication**
4. Haz clic en **Settings** (Configuración) o **Configuración**

### Paso 2: Agregar Dominio Autorizado

1. Busca la sección **"Authorized domains"** (Dominios autorizados)
2. Haz clic en **"Add domain"** (Agregar dominio)
3. Ingresa tu dominio:
   ```
   avocatapp.com
   ```
4. Haz clic en **"Add"** (Agregar)

### Paso 3: Verificar Dominios

Asegúrate de que estos dominios estén en la lista:

- ✅ `localhost` (para desarrollo)
- ✅ `avocatapp.com` (tu dominio de producción)
- ✅ `avocat-legaltech-v3.firebaseapp.com` (dominio de Firebase - ya debería estar)

---

## 📋 Pasos Detallados en Firebase Console

### Ubicación Exacta:

1. **Firebase Console** → Tu proyecto
2. **Authentication** (en el menú lateral izquierdo)
3. **Settings** o **Configuración** (pestaña superior)
4. Scroll hacia abajo hasta **"Authorized domains"**

### Visualización:

Deberías ver una lista como esta:

```
Authorized domains:
- localhost
- avocat-legaltech-v3.firebaseapp.com
- [Agregar dominio] ← Botón aquí
```

### Agregar el Dominio:

1. Haz clic en **"Add domain"** o **"Agregar dominio"**
2. En el campo que aparece, escribe: `avocatapp.com`
3. Haz clic en **"Add"** o **"Agregar"**
4. El dominio aparecerá en la lista

---

## 🔍 Verificar en el Código

También verifica que el código esté usando el dominio correcto:

### En `src/app/forgot-password/page.tsx`:

```typescript
const actionCodeSettings = {
  url: typeof window !== 'undefined' 
    ? `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com'}/reset-password?email=${encodeURIComponent(email)}`,
  handleCodeInApp: true,
};
```

Esto debería generar URLs como:
- `https://avocatapp.com/reset-password?email=...`

---

## ✅ Después de Agregar el Dominio

1. **Espera 1-2 minutos** para que los cambios se propaguen
2. **Recarga la página** `/forgot-password`
3. **Prueba de nuevo** enviando un email de recuperación
4. **Verifica en la consola** que no aparezca el error

---

## 🧪 Probar de Nuevo

1. Ve a `/forgot-password`
2. Ingresa un email válido
3. Haz clic en "Enviar enlace de recuperación"
4. Verifica que:
   - ✅ No aparezca el error en la consola
   - ✅ Aparezca el mensaje de éxito
   - ✅ Recibas el email en tu bandeja de entrada

---

## ⚠️ Notas Importantes

### Dominios que Debes Agregar:

- **Producción**: `avocatapp.com`
- **Desarrollo**: `localhost` (ya debería estar)
- **Firebase Hosting**: `avocat-legaltech-v3.firebaseapp.com` (ya debería estar)

### Si Usas Varios Entornos:

Agrega todos los dominios que uses:
- `avocatapp.com` (producción)
- `staging.avocatapp.com` (si tienes staging)
- `localhost` (desarrollo)

### Seguridad:

- Solo agrega dominios que realmente uses
- No agregues dominios de terceros
- Firebase solo permitirá redirecciones a dominios autorizados

---

## 🔄 Si el Error Persiste

1. **Verifica que guardaste los cambios** en Firebase Console
2. **Espera 2-3 minutos** para la propagación
3. **Limpia la caché del navegador** (Ctrl+Shift+R o Cmd+Shift+R)
4. **Verifica que el dominio esté escrito correctamente** (sin `http://` o `https://`)
5. **Verifica que no haya espacios** antes o después del dominio

---

## 📝 Checklist

- [ ] Accedido a Firebase Console → Authentication → Settings
- [ ] Encontrada la sección "Authorized domains"
- [ ] Agregado `avocatapp.com` a la lista
- [ ] Esperado 1-2 minutos para propagación
- [ ] Recargada la página `/forgot-password`
- [ ] Probado enviar email de recuperación
- [ ] Verificado que no aparece el error
- [ ] Verificado que el email llega correctamente

---

## 🎯 Resultado Esperado

Después de agregar el dominio:

✅ **No más errores** en la consola  
✅ **Email de recuperación se envía** correctamente  
✅ **Enlace de redirección funciona** correctamente  
✅ **Email llega desde** `soporte@avocatapp.com`


