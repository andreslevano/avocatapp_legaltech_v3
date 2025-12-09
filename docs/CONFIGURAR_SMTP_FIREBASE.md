# 📧 Guía: Configurar SMTP Personalizado en Firebase

## Objetivo
Configurar Firebase Authentication para enviar emails desde `soporte@avocatapp.com` en lugar del servicio automático de Firebase.

---

## 📋 Paso 1: Identificar tu Proveedor de Email

Primero necesitas saber qué proveedor de email estás usando para `soporte@avocatapp.com`:

- **Google Workspace (Gmail para empresas)**
- **Microsoft 365 / Outlook**
- **Hosting personalizado** (cPanel, etc.)
- **Otro proveedor**

---

## 📋 Paso 2: Obtener Credenciales SMTP

### Opción A: Google Workspace (Gmail para empresas)

Si `soporte@avocatapp.com` está en Google Workspace:

1. **Habilitar "Contraseña de aplicación"**:
   - Ve a [Google Account Security](https://myaccount.google.com/security)
   - Activa la verificación en 2 pasos (si no está activada)
   - Ve a "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo"
   - **Copia esta contraseña** (la necesitarás)

2. **Configuración SMTP para Firebase**:
   ```
   Dirección de correo: soporte@avocatapp.com
   Host SMTP: smtp.gmail.com
   Puerto: 587
   Usuario: soporte@avocatapp.com
   Contraseña: [La contraseña de aplicación que generaste]
   Modo de seguridad: STARTTLS
   ```

### Opción B: Microsoft 365 / Outlook

Si `soporte@avocatapp.com` está en Microsoft 365:

1. **Obtener contraseña de aplicación**:
   - Ve a [Microsoft Account Security](https://account.microsoft.com/security)
   - Activa la autenticación en dos pasos
   - Ve a "Contraseñas de aplicación"
   - Genera una nueva contraseña
   - **Copia esta contraseña**

2. **Configuración SMTP para Firebase**:
   ```
   Dirección de correo: soporte@avocatapp.com
   Host SMTP: smtp.office365.com
   Puerto: 587
   Usuario: soporte@avocatapp.com
   Contraseña: [La contraseña de aplicación que generaste]
   Modo de seguridad: STARTTLS
   ```

### Opción C: Hosting Personalizado (cPanel, etc.)

Si tienes un hosting personalizado, necesitas:

1. **Obtener credenciales SMTP**:
   - Accede al panel de control de tu hosting (cPanel, Plesk, etc.)
   - Busca la sección "Email Accounts" o "Cuentas de correo"
   - Selecciona `soporte@avocatapp.com`
   - Busca la configuración SMTP

2. **Configuración SMTP típica**:
   ```
   Dirección de correo: soporte@avocatapp.com
   Host SMTP: mail.avocatapp.com (o smtp.avocatapp.com)
   Puerto: 587 (o 465 para SSL)
   Usuario: soporte@avocatapp.com
   Contraseña: [Tu contraseña de email]
   Modo de seguridad: STARTTLS (puerto 587) o SSL (puerto 465)
   ```

---

## 📋 Paso 3: Configurar en Firebase Console

### 3.1 Acceder a la Configuración

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **avocat-legaltech-v3**
3. En el menú lateral, ve a **Authentication**
4. Haz clic en **Configuración del SMTP** (o "SMTP Configuration")

### 3.2 Completar los Campos

1. **Habilitar el toggle "Habilitar"** (arriba a la derecha)

2. **Completar los campos**:

   | Campo | Valor |
   |-------|-------|
   | **Dirección de correo electrónico del remitente** | `soporte@avocatapp.com` |
   | **Host del servidor SMTP** | Depende de tu proveedor (ver Paso 2) |
   | **Puerto del servidor SMTP** | `587` (o `465` para SSL) |
   | **Nombre de usuario para la cuenta de SMTP** | `soporte@avocatapp.com` |
   | **Contraseña para la cuenta de SMTP** | [Tu contraseña de aplicación o email] |
   | **Modo de seguridad SMTP** | `STARTTLS` (puerto 587) o `SSL` (puerto 465) |

### 3.3 Ejemplos Específicos

#### Para Google Workspace:
```
Dirección: soporte@avocatapp.com
Host: smtp.gmail.com
Puerto: 587
Usuario: soporte@avocatapp.com
Contraseña: [Contraseña de aplicación de Google]
Modo: STARTTLS
```

#### Para Microsoft 365:
```
Dirección: soporte@avocatapp.com
Host: smtp.office365.com
Puerto: 587
Usuario: soporte@avocatapp.com
Contraseña: [Contraseña de aplicación de Microsoft]
Modo: STARTTLS
```

#### Para Hosting Personalizado:
```
Dirección: soporte@avocatapp.com
Host: mail.avocatapp.com (o el que te proporcione tu hosting)
Puerto: 587
Usuario: soporte@avocatapp.com
Contraseña: [Tu contraseña de email]
Modo: STARTTLS
```

### 3.4 Guardar Configuración

1. Haz clic en el botón **"Guardar"** (abajo a la derecha)
2. Espera a que Firebase valide la configuración
3. Si hay errores, Firebase te indicará qué corregir

---

## 📋 Paso 4: Verificar la Configuración

### 4.1 Probar desde la Aplicación

1. Ve a tu aplicación: `/forgot-password`
2. Ingresa un email válido
3. Verifica que recibes el email desde `soporte@avocatapp.com`

### 4.2 Probar con el Script

```bash
npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts tu-email@ejemplo.com
```

---

## ⚠️ Notas Importantes

### Seguridad

1. **Nunca uses tu contraseña normal de email**
   - Siempre usa "Contraseñas de aplicación" (App Passwords)
   - Son más seguras y se pueden revocar fácilmente

2. **Verificación en 2 pasos**
   - La mayoría de proveedores requieren 2FA activado
   - Es necesario para generar contraseñas de aplicación

### Límites y Consideraciones

1. **Límites de envío**:
   - Gmail: 500 emails/día (gratis) o 2000/día (Workspace)
   - Microsoft 365: 10,000/día
   - Hosting personalizado: Depende de tu plan

2. **Reputación del dominio**:
   - Los emails desde tu dominio personalizado pueden ir a spam inicialmente
   - Configura SPF, DKIM y DMARC para mejorar la entrega

3. **Pruebas**:
   - Siempre prueba primero con un email de prueba
   - Verifica que los emails lleguen a la bandeja de entrada (no spam)

---

## 🔧 Solución de Problemas

### Error: "Invalid credentials"
- Verifica que la contraseña sea una "Contraseña de aplicación", no tu contraseña normal
- Asegúrate de que la verificación en 2 pasos esté activada

### Error: "Connection timeout"
- Verifica que el host SMTP sea correcto
- Verifica que el puerto sea correcto (587 o 465)
- Verifica que el firewall no bloquee el puerto

### Error: "Authentication failed"
- Verifica que el usuario sea el email completo: `soporte@avocatapp.com`
- Verifica que la contraseña sea correcta
- Para Gmail/Workspace, asegúrate de usar contraseña de aplicación

### Los emails van a spam
- Configura registros SPF en tu DNS
- Configura DKIM en tu proveedor de email
- Considera usar un servicio de email transaccional (SendGrid, Mailgun, etc.)

---

## 📚 Recursos Adicionales

- [Firebase Auth - Custom Email Templates](https://firebase.google.com/docs/auth/custom-email)
- [Google Workspace - App Passwords](https://support.google.com/accounts/answer/185833)
- [Microsoft 365 - App Passwords](https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a794e)

---

## ✅ Checklist de Configuración

- [ ] Identificado el proveedor de email
- [ ] Obtenida contraseña de aplicación (si aplica)
- [ ] Accedido a Firebase Console → Authentication → SMTP Configuration
- [ ] Habilitado el toggle "Habilitar"
- [ ] Completados todos los campos SMTP
- [ ] Guardada la configuración
- [ ] Probado envío de email de prueba
- [ ] Verificado que los emails llegan desde `soporte@avocatapp.com`

---

## 🎯 Resultado Esperado

Después de configurar, todos los emails de Firebase Authentication se enviarán desde:
- **Remitente**: `soporte@avocatapp.com`
- **Tipo**: Emails de verificación, restablecimiento de contraseña, etc.

En lugar de:
- ~~`noreply@avocat-legaltech-v3.firebaseapp.com`~~


