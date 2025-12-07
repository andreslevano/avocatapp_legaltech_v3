# ✅ Verificar Configuración SMTP en Firebase

## Estado Actual

✅ **SMTP Configurado en Firebase Console**:
- Toggle "Habilitar": **ON** ✅
- Dirección: `soporte@avocatapp.com` ✅
- Host: `smtp.gmail.com` ✅
- Puerto: `587` ✅
- Usuario: `soporte@avocatapp.com` ✅
- Contraseña: Configurada ✅
- Modo: `STARTTLS` ✅

---

## 🧪 Paso 1: Verificar que la Configuración se Guardó

1. **En Firebase Console**:
   - Asegúrate de que el toggle "Habilitar" esté en **ON** (azul)
   - Verifica que todos los campos estén completos
   - Si hiciste cambios, haz clic en **"Guardar"** nuevamente

2. **Espera unos segundos** para que Firebase procese la configuración

---

## 🧪 Paso 2: Probar el Envío de Emails

### Opción A: Probar desde tu Aplicación (Recomendado)

1. **Abre tu aplicación** en el navegador
2. **Ve a la página de recuperación de contraseña**:
   ```
   https://tu-dominio.com/forgot-password
   ```
   o en desarrollo:
   ```
   http://localhost:3000/forgot-password
   ```

3. **Ingresa un email válido** (preferiblemente uno que puedas verificar)

4. **Haz clic en "Enviar enlace de recuperación"**

5. **Verifica tu bandeja de entrada**:
   - Revisa la bandeja de entrada del email que ingresaste
   - **Revisa también la carpeta de spam**
   - El email debe venir de: `soporte@avocatapp.com`
   - El asunto debe ser algo como: "Restablece tu contraseña"

### Opción B: Probar con el Script

```bash
npx ts-node --project tsconfig.scripts.json scripts/test-smtp-configuration.ts tu-email@ejemplo.com
```

Este script:
- Verifica que el usuario existe (o lo crea si no existe)
- Genera un link de restablecimiento de contraseña
- Confirma que la configuración SMTP está activa

---

## ✅ Qué Verificar

### 1. Remitente del Email

El email debe venir de:
- ✅ `soporte@avocatapp.com`
- ❌ NO debe venir de `noreply@avocat-legaltech-v3.firebaseapp.com`

### 2. Contenido del Email

El email debe incluir:
- Un enlace para restablecer la contraseña
- El logo/branding de Firebase (a menos que hayas personalizado las plantillas)
- Instrucciones en español (si configuraste el idioma)

### 3. Tiempo de Entrega

- Los emails deberían llegar en **menos de 1 minuto**
- Si no llegan en 5 minutos, revisa la configuración

---

## 🔍 Solución de Problemas

### El email no llega

1. **Revisa la carpeta de spam**
   - Los emails desde dominios nuevos pueden ir a spam inicialmente

2. **Verifica la configuración SMTP**:
   - Asegúrate de que el toggle esté en ON
   - Verifica que la contraseña de aplicación sea correcta
   - Verifica que el host sea `smtp.gmail.com`
   - Verifica que el puerto sea `587`
   - Verifica que el modo sea `STARTTLS`

3. **Verifica los logs de Firebase**:
   - Ve a Firebase Console → Authentication → Users
   - Busca el usuario y verifica si hay errores

4. **Prueba con otro email**:
   - A veces ciertos proveedores de email bloquean emails nuevos

### El email viene desde noreply@...

Si el email todavía viene desde `noreply@avocat-legaltech-v3.firebaseapp.com`:

1. **Verifica que el toggle "Habilitar" esté en ON**
2. **Espera unos minutos** - puede tomar tiempo para que los cambios se apliquen
3. **Limpia la caché del navegador** y prueba de nuevo
4. **Verifica que guardaste los cambios** en Firebase Console

### Error: "Invalid credentials"

1. **Verifica la contraseña de aplicación**:
   - Asegúrate de que sea una "Contraseña de aplicación" de 16 caracteres
   - NO uses tu contraseña normal de Google

2. **Regenera la contraseña de aplicación**:
   - Ve a [App Passwords](https://myaccount.google.com/apppasswords)
   - Elimina la anterior
   - Crea una nueva
   - Actualiza en Firebase Console

### Error: "Connection timeout"

1. **Verifica el host**: Debe ser `smtp.gmail.com`
2. **Verifica el puerto**: Debe ser `587`
3. **Verifica el modo**: Debe ser `STARTTLS`
4. **Verifica el firewall**: Asegúrate de que el puerto 587 no esté bloqueado

---

## 📊 Verificar en Firebase Console

### Revisar Logs

1. Ve a Firebase Console → Authentication
2. Revisa si hay errores o advertencias
3. Verifica que la configuración SMTP esté activa

### Revisar Plantillas de Email

1. Ve a Authentication → Templates
2. Verifica que las plantillas estén configuradas
3. Puedes personalizar el asunto y contenido aquí

---

## ✅ Checklist de Verificación

- [ ] Toggle "Habilitar" está en ON
- [ ] Todos los campos están completos
- [ ] Cambios guardados en Firebase Console
- [ ] Email de prueba enviado desde `/forgot-password`
- [ ] Email recibido en la bandeja de entrada
- [ ] Email viene desde `soporte@avocatapp.com`
- [ ] Enlace de restablecimiento funciona correctamente

---

## 🎯 Resultado Esperado

Después de verificar, deberías ver:

✅ **Emails de Firebase Authentication** se envían desde:
- Remitente: `soporte@avocatapp.com`
- Tipo: Verificación de email, restablecimiento de contraseña, etc.

✅ **Funcionalidad**:
- Los usuarios pueden restablecer sus contraseñas
- Los emails llegan correctamente
- Los enlaces funcionan

---

## 📝 Próximos Pasos (Opcional)

### Personalizar Plantillas de Email

1. Ve a Firebase Console → Authentication → Templates
2. Edita las plantillas:
   - **Email verification** (Verificación de email)
   - **Password reset** (Restablecimiento de contraseña)
3. Personaliza:
   - Asunto
   - Cuerpo del mensaje
   - Idioma
   - URL de acción

### Configurar SPF/DKIM (Mejorar entrega)

Para evitar que los emails vayan a spam:

1. **Configura SPF** en tu DNS:
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **Configura DKIM** en Google Workspace:
   - Ve a Google Admin Console
   - Configuración → Apps → Google Workspace → Gmail
   - Autenticación de correo → DKIM

3. **Configura DMARC** (opcional pero recomendado)

---

## 🎉 ¡Listo!

Si todo funciona correctamente, tu configuración SMTP está completa y funcionando. Todos los emails de Firebase Authentication ahora se enviarán desde `soporte@avocatapp.com`.

