# 📧 Configuración de Envío de Emails en Firebase

## Resumen

Firebase Authentication tiene **dos formas** de enviar emails:

1. **Emails Automáticos de Firebase Auth** (ya configurado ✅)
2. **Emails Personalizados con Nodemailer** (ya configurado ✅)

---

## 1. Emails Automáticos de Firebase Authentication

### ✅ Estado Actual: **YA ESTÁ CONFIGURADO Y FUNCIONANDO**

Firebase Auth envía emails automáticamente sin necesidad de configuración SMTP adicional.

### Cómo Funciona

- Firebase usa su propio servicio de email
- Los emails se envían desde: `noreply@[tu-proyecto].firebaseapp.com`
- **No requiere configuración SMTP**
- **Funciona automáticamente** cuando usas las funciones del SDK

### Funciones que Envían Emails Automáticamente

#### 1. Restablecimiento de Contraseña (Ya implementado ✅)
```typescript
// En src/app/forgot-password/page.tsx
await sendPasswordResetEmail(auth, email, actionCodeSettings);
```
- ✅ **Ya está funcionando** en tu aplicación
- Envía email automáticamente
- El usuario recibe un enlace para restablecer su contraseña

#### 2. Verificación de Email
```typescript
import { sendEmailVerification } from 'firebase/auth';
await sendEmailVerification(user);
```
- Envía email de verificación automáticamente
- No requiere configuración adicional

#### 3. Invitaciones de Usuarios (Para crear usuarios nuevos)
```typescript
// Con Firebase Admin SDK
const link = await auth.generateEmailVerificationLink(email, {
  url: 'https://tu-app.com/setup-password',
  handleCodeInApp: true,
});
// Luego envías este link por email (puedes usar nodemailer)
```

---

## 2. Personalización de Plantillas de Email

### Dónde Configurar

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Templates**
4. Edita las plantillas disponibles:
   - **Email verification** (Verificación de email)
   - **Password reset** (Restablecimiento de contraseña)
   - **Email change** (Cambio de email)
   - **Invitation email** (Invitación de usuario - si está habilitado)

### Qué Puedes Personalizar

- **Asunto del email** (Subject)
- **Cuerpo del mensaje** (Body)
- **Idioma** (Language)
- **URL de acción** (Action URL - donde redirige el enlace)
- **Nombre del remitente** (Sender name)
- **Logo personalizado** (Custom logo)

### Ejemplo de Personalización

```
Asunto: "Restablece tu contraseña de Avocat LegalTech"

Cuerpo:
Hola,

Has solicitado restablecer tu contraseña. 
Haz clic en el siguiente enlace para continuar:

[ENLACE]

Si no solicitaste este cambio, ignora este email.

Saludos,
Equipo Avocat LegalTech
```

---

## 3. Verificar Configuración

### Opción A: Probar con el Script

```bash
npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts tu-email@ejemplo.com
```

Este script:
- Verifica si el usuario existe en Firebase Auth
- Genera enlaces de restablecimiento de contraseña
- Confirma que la configuración está correcta

### Opción B: Probar en la Aplicación

1. Ve a `/forgot-password`
2. Ingresa un email válido
3. Verifica que recibes el email de restablecimiento

---

## 4. Para Invitaciones de Usuarios (Crear 75 usuarios)

### Opción A: Usar Firebase Auth + Envío Manual de Links

**Proceso:**
1. Crear usuario en Firebase Auth (sin contraseña)
2. Generar link de verificación/invitación
3. Enviar el link por email usando **Nodemailer** (ya configurado)

**Ventajas:**
- ✅ Control total sobre el contenido del email
- ✅ Puedes personalizar el diseño
- ✅ Usa tu servicio de email (Gmail, etc.)

**Código de ejemplo:**
```typescript
// 1. Crear usuario
const user = await auth.createUser({
  email: 'usuario@ejemplo.com',
  displayName: 'Juan Pérez',
  emailVerified: false
});

// 2. Generar link de verificación
const link = await auth.generateEmailVerificationLink(user.email, {
  url: 'https://avocatapp.com/setup-password',
  handleCodeInApp: true,
});

// 3. Enviar email con nodemailer (ya configurado)
await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: user.email,
  subject: 'Bienvenido a Avocat LegalTech',
  html: `
    <h1>Bienvenido</h1>
    <p>Haz clic en el siguiente enlace para establecer tu contraseña:</p>
    <a href="${link}">Establecer Contraseña</a>
  `
});
```

### Opción B: Usar Firebase Auth + Email Automático

**Proceso:**
1. Crear usuario en Firebase Auth
2. Llamar `sendEmailVerification()` desde el cliente
3. Firebase envía el email automáticamente

**Limitaciones:**
- El email usa la plantilla de Firebase (menos personalizable)
- Requiere que el usuario esté autenticado primero

---

## 5. Configuración de Nodemailer (Para Emails Personalizados)

### Estado Actual: ✅ Ya Configurado

Tu aplicación ya tiene Nodemailer configurado en:
- `src/app/api/send-email/route.ts`

### Variables de Entorno Necesarias

```bash
# En .env.local
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicación
```

### Para Gmail

1. **Habilitar "Contraseña de aplicación"**:
   - Ve a [Google Account Security](https://myaccount.google.com/security)
   - Activa la verificación en 2 pasos
   - Genera una "Contraseña de aplicación"
   - Usa esa contraseña en `EMAIL_PASS`

2. **O usar OAuth2** (más seguro):
   - Configurar OAuth2 con Google
   - Usar tokens de acceso en lugar de contraseñas

---

## 6. Recomendación para Crear los 75 Usuarios

### Mejor Opción: **Híbrida**

1. **Crear usuarios en Firebase Auth** (sin contraseña)
2. **Crear documentos en Firestore** (con datos del Excel)
3. **Generar links de invitación** (con Firebase Admin SDK)
4. **Enviar emails personalizados** (con Nodemailer usando tu diseño)

**Ventajas:**
- ✅ Usuarios pueden establecer su propia contraseña
- ✅ Emails personalizados con tu branding
- ✅ Control total sobre el proceso
- ✅ Verificación automática de email

---

## 7. Checklist de Configuración

### Firebase Auth Emails (Automáticos)
- [x] Firebase Auth está configurado
- [x] `sendPasswordResetEmail` funciona (ya probado)
- [ ] Personalizar plantillas en Firebase Console (opcional)
- [ ] Configurar dominio personalizado para emails (opcional)

### Nodemailer (Emails Personalizados)
- [x] Nodemailer instalado
- [x] Configuración en `/api/send-email`
- [ ] Verificar `EMAIL_USER` en `.env.local`
- [ ] Verificar `EMAIL_PASS` en `.env.local` (contraseña de aplicación)
- [ ] Probar envío de email de prueba

---

## 8. Próximos Pasos

1. **Verificar configuración actual:**
   ```bash
   npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts tu-email@ejemplo.com
   ```

2. **Personalizar plantillas de Firebase** (opcional):
   - Firebase Console → Authentication → Templates

3. **Verificar Nodemailer:**
   - Confirmar `EMAIL_USER` y `EMAIL_PASS` en `.env.local`
   - Probar envío desde `/api/send-email`

4. **Implementar script de creación de usuarios:**
   - Crear usuarios en Auth
   - Crear documentos en Firestore
   - Generar links de invitación
   - Enviar emails personalizados

---

## Preguntas Frecuentes

### ¿Necesito configurar SMTP para Firebase Auth?
**No.** Firebase Auth envía emails automáticamente sin SMTP.

### ¿Puedo personalizar los emails de Firebase Auth?
**Sí.** En Firebase Console → Authentication → Templates

### ¿Necesito Nodemailer para invitaciones?
**Recomendado.** Para emails personalizados con tu branding.

### ¿Los emails de Firebase Auth tienen límites?
**Sí.** Hay límites de rate limiting, pero son generosos para uso normal.

### ¿Puedo usar mi propio dominio para emails?
**Sí.** Configuración avanzada en Firebase Console → Authentication → Settings → Authorized domains.

---

## Referencias

- [Firebase Auth Email Templates](https://firebase.google.com/docs/auth/custom-email)
- [Firebase Admin SDK - User Management](https://firebase.google.com/docs/auth/admin/manage-users)
- [Nodemailer Documentation](https://nodemailer.com/about/)


