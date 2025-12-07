# ✅ Pasos Finales: Configurar SMTP en Firebase

## Estado Actual

✅ **Verificación en dos pasos**: Activa (desde 4 ene)  
✅ **Contraseñas de aplicación**: Ya tienes al menos 1 creada

---

## Opción 1: Usar la Contraseña de Aplicación Existente

Si ya tienes una contraseña de aplicación que quieres usar:

1. **Accede a tus contraseñas de aplicación**:
   - Haz clic en "Contraseñas de aplicación" (donde dice "1 contraseña de aplicación")
   - Verás la lista de contraseñas creadas
   - Si hay una para "Correo" o "Email", puedes usar esa

2. **Si no hay una específica para correo**, crea una nueva (ver Opción 2)

---

## Opción 2: Crear una Nueva Contraseña de Aplicación para Firebase

### Paso 1: Acceder a Contraseñas de Aplicación

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Busca "Contraseñas de aplicación" (App Passwords)
3. O ve directamente a: [App Passwords](https://myaccount.google.com/apppasswords)

### Paso 2: Generar Nueva Contraseña

1. Haz clic en "Contraseñas de aplicación"
2. Selecciona:
   - **Aplicación**: "Correo" (Mail)
   - **Dispositivo**: "Otro (nombre personalizado)"
   - **Nombre**: Escribe "Firebase SMTP" o "Avocat SMTP"
3. Haz clic en "Generar"

### Paso 3: Copiar la Contraseña

- Se mostrará una contraseña de **16 caracteres** (sin espacios)
- Ejemplo: `abcd efgh ijkl mnop`
- **Copia esta contraseña inmediatamente** (solo se muestra una vez)
- Si la pierdes, tendrás que generar una nueva

---

## Paso 3: Configurar en Firebase Console

### 3.1 Acceder a Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **avocat-legaltech-v3**
3. En el menú lateral: **Authentication**
4. Haz clic en **"Configuración del SMTP"** (SMTP Configuration)

### 3.2 Completar los Campos

1. **Activa el toggle "Habilitar"** (arriba a la derecha) - debe quedar en ON (azul)

2. **Completa los campos**:

   ```
   Dirección de correo electrónico del remitente:
   → soporte@avocatapp.com
   
   Host del servidor SMTP:
   → smtp.gmail.com
   
   Puerto del servidor SMTP:
   → 587
   
   Nombre de usuario para la cuenta de SMTP:
   → soporte@avocatapp.com
   
   Contraseña para la cuenta de SMTP:
   → [Pega aquí la contraseña de aplicación de 16 caracteres]
   (Sin espacios, todo junto)
   
   Modo de seguridad SMTP:
   → STARTTLS
   ```

### 3.3 Guardar

1. Haz clic en el botón **"Guardar"** (azul, abajo a la derecha)
2. Espera a que Firebase valide la configuración
3. Si hay errores, Firebase te indicará qué corregir

---

## Paso 4: Verificar que Funciona

### Opción A: Probar desde la Aplicación

1. Ve a tu aplicación: `/forgot-password`
2. Ingresa un email válido
3. Verifica que recibes el email desde `soporte@avocatapp.com`

### Opción B: Probar con el Script

```bash
npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts tu-email@ejemplo.com
```

---

## ⚠️ Notas Importantes

### Sobre la Contraseña de Aplicación

1. **Formato**: La contraseña tiene 16 caracteres, puede tener espacios
   - Ejemplo mostrado: `abcd efgh ijkl mnop`
   - Úsala con o sin espacios (Firebase acepta ambos)

2. **Seguridad**: 
   - No la compartas
   - Si la comprometes, elimínala y crea una nueva
   - Puedes tener múltiples contraseñas de aplicación

3. **Si la pierdes**:
   - No puedes verla de nuevo
   - Debes generar una nueva
   - La anterior seguirá funcionando hasta que la elimines

### Errores Comunes

1. **"Invalid credentials"**:
   - Verifica que copiaste la contraseña completa (16 caracteres)
   - Asegúrate de que es una "Contraseña de aplicación", no tu contraseña normal

2. **"Connection timeout"**:
   - Verifica que el host sea `smtp.gmail.com`
   - Verifica que el puerto sea `587`
   - Verifica que el modo sea `STARTTLS`

3. **"Authentication failed"**:
   - Verifica que el usuario sea `soporte@avocatapp.com` (completo)
   - Verifica que la contraseña sea correcta
   - Asegúrate de que 2FA esté activo en esa cuenta

---

## ✅ Checklist Final

- [ ] 2FA activado en `soporte@avocatapp.com` ✅ (Ya está)
- [ ] Contraseña de aplicación generada
- [ ] Firebase Console → Authentication → SMTP Configuration
- [ ] Toggle "Habilitar" activado
- [ ] Todos los campos completados correctamente
- [ ] Configuración guardada
- [ ] Email de prueba enviado y recibido

---

## 🎯 Resultado Esperado

Después de configurar, todos los emails de Firebase Authentication se enviarán desde:
- **Remitente**: `soporte@avocatapp.com`
- **Tipo**: Emails de verificación, restablecimiento de contraseña, etc.

En lugar de:
- ~~`noreply@avocat-legaltech-v3.firebaseapp.com`~~

