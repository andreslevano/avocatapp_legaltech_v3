# 📧 Personalización de Emails de Invitación

## 📋 Resumen

Los emails de invitación se enviarán desde `soporte@avocatapp.com` usando tu SMTP configurado, con diseño personalizado que incluye el branding de Avocat LegalTech.

---

## 🎨 Diseño del Email

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  [Header - Color #f59e0b (naranja)]     │
│  Avocat LegalTech                       │
│                                         │
├─────────────────────────────────────────┤
│  [Contenido Principal - Fondo gris]     │
│                                         │
│  Hola [Nombre],                         │
│                                         │
│  Bienvenido a Avocat LegalTech...      │
│                                         │
│  [Botón: Establecer Contraseña]        │
│                                         │
│  [Información adicional]                │
│                                         │
├─────────────────────────────────────────┤
│  [Footer - Fondo oscuro]                │
│  © 2024 Avocat LegalTech                │
└─────────────────────────────────────────┘
```

---

## 📝 Variables Disponibles

### Datos del Usuario (del Excel):
- `email` - Email del usuario
- `nombres` - Nombres del usuario
- `primer_apellido` - Apellido del usuario
- `pais` - País del usuario
- `area_legal` - Área legal del usuario

### Datos Generados:
- `displayName` - Nombre completo (nombres + apellido, o email si no hay)
- `invitationLink` - Link de invitación generado por Firebase
- `expirationTime` - Tiempo de expiración del link (opcional)

---

## 🎯 Diseño Propuesto del Email

### Asunto del Email:
```
Bienvenido a Avocat LegalTech - Establece tu contraseña
```

### Contenido HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Avocat LegalTech</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Plataforma LegalTech Inteligente</p>
    </div>
    
    <!-- Contenido Principal -->
    <div style="padding: 40px 30px; background-color: #f9fafb;">
      
      <!-- Saludo Personalizado -->
      <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 24px;">
        ¡Bienvenido a Avocat LegalTech!
      </h2>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Hola <strong>${displayName}</strong>,
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Nos complace darte la bienvenida a Avocat LegalTech, tu plataforma integral para la gestión legal inteligente.
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px;">
        Para comenzar, necesitamos que establezcas tu contraseña. Haz clic en el botón siguiente para completar tu registro:
      </p>
      
      <!-- Botón de Acción -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="display: inline-block; background-color: #f59e0b; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Establecer Contraseña
        </a>
      </div>
      
      <!-- Link Alternativo -->
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 20px;">
        O copia y pega este enlace en tu navegador:<br>
        <a href="${invitationLink}" style="color: #3b82f6; word-break: break-all;">${invitationLink}</a>
      </p>
      
      <!-- Información Adicional -->
      <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">
          ¿Qué puedes hacer en Avocat LegalTech?
        </h3>
        <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Generar documentos legales con IA</li>
          <li>Gestionar casos y clientes</li>
          <li>Acceder a plantillas profesionales</li>
          <li>Analizar documentos legales</li>
        </ul>
      </div>
      
      <!-- Información de Seguridad -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por seguridad. 
          Si no puedes acceder, puedes solicitar un nuevo enlace desde la página de inicio de sesión.
        </p>
      </div>
      
      <!-- Cierre -->
      <p style="color: #6b7280; line-height: 1.6; margin-top: 30px; font-size: 16px;">
        Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos en 
        <a href="mailto:soporte@avocatapp.com" style="color: #3b82f6;">soporte@avocatapp.com</a>
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-top: 20px; font-size: 16px;">
        Atentamente,<br>
        <strong>Equipo Avocat LegalTech</strong>
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="background-color: #374151; color: #9ca3af; padding: 25px 30px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">
        © 2024 Avocat LegalTech. Todos los derechos reservados.
      </p>
      <p style="margin: 0;">
        Este es un email automático. Si no solicitaste esta invitación, puedes ignorarlo.
      </p>
      <p style="margin: 10px 0 0 0;">
        <a href="https://avocatapp.com" style="color: #9ca3af; text-decoration: underline;">Visita nuestro sitio web</a>
      </p>
    </div>
    
  </div>
</body>
</html>
```

---

## 🎨 Personalización por Usuario

### Caso 1: Usuario con Nombre Completo
```
Email: ivan.diaz@example.com
Nombres: Ivan
Apellido: Diaz
País: Mexico
Área Legal: Derecho Civil

Saludo: "Hola Ivan Diaz,"
```

### Caso 2: Usuario con Solo Nombres
```
Email: juan@example.com
Nombres: Juan
Apellido: (vacío)
País: España

Saludo: "Hola Juan,"
```

### Caso 3: Usuario sin Nombres
```
Email: usuario@example.com
Nombres: (vacío)
Apellido: (vacío)

Saludo: "Hola usuario@example.com," o "Hola,"
```

---

## 🔧 Opciones de Personalización

### 1. Personalización del Saludo

**Opción A: Usar Nombre Completo (Recomendado)**
```typescript
const displayName = nombres && primer_apellido 
  ? `${nombres} ${primer_apellido}`.trim()
  : nombres 
    ? nombres 
    : email.split('@')[0];
```

**Opción B: Solo Nombres**
```typescript
const displayName = nombres || email.split('@')[0];
```

**Opción C: Email si no hay nombre**
```typescript
const displayName = nombres && primer_apellido
  ? `${nombres} ${primer_apellido}`.trim()
  : email;
```

### 2. Personalización del Contenido por Área Legal

Puedes agregar contenido específico según el área legal:

```typescript
let areaContent = '';
if (area_legal) {
  switch(area_legal) {
    case 'Derecho Civil':
      areaContent = 'Como especialista en Derecho Civil, encontrarás herramientas específicas para...';
      break;
    case 'Derecho Laboral':
      areaContent = 'Nuestra plataforma incluye plantillas especializadas en Derecho Laboral...';
      break;
    // ... más casos
  }
}
```

### 3. Personalización por País

Puedes ajustar el idioma o contenido según el país:

```typescript
const isSpanish = pais && ['España', 'Mexico', 'Colombia', 'Chile', 'Peru', 'Ecuador'].includes(pais);
const greeting = isSpanish ? '¡Bienvenido!' : 'Welcome!';
```

---

## 📊 Ejemplo de Email Generado

### Para: Ivan Diaz (ivan.diaz@example.com)

**Asunto:** `Bienvenido a Avocat LegalTech - Establece tu contraseña`

**Contenido:**
```
¡Bienvenido a Avocat LegalTech!

Hola Ivan Diaz,

Nos complace darte la bienvenida a Avocat LegalTech...

[Botón: Establecer Contraseña]

[Link alternativo]

¿Qué puedes hacer en Avocat LegalTech?
- Generar documentos legales con IA
- Gestionar casos y clientes
- ...

Atentamente,
Equipo Avocat LegalTech
```

---

## 🔗 Generación del Link de Invitación

### Proceso:

1. **Crear usuario en Firebase Auth** (sin contraseña):
```typescript
const user = await auth.createUser({
  email: email,
  displayName: displayName,
  emailVerified: false,
  disabled: false
});
```

2. **Generar link de verificación**:
```typescript
const invitationLink = await auth.generateEmailVerificationLink(email, {
  url: 'https://avocatapp.com/reset-password?mode=setPassword',
  handleCodeInApp: true,
});
```

3. **O generar link de restablecimiento** (si prefieres):
```typescript
const invitationLink = await auth.generatePasswordResetLink(email, {
  url: 'https://avocatapp.com/reset-password?mode=setPassword',
  handleCodeInApp: true,
});
```

---

## 📧 Configuración del Envío

### Remitente:
```
Nombre: Avocat LegalTech
Email: soporte@avocatapp.com
```

### Configuración SMTP:
- Ya configurado en Firebase ✅
- Usa tu SMTP personalizado ✅

---

## ⚙️ Opciones de Personalización Adicionales

### 1. Idioma del Email
- Español (por defecto)
- Puedes detectar según país
- Puedes agregar selector de idioma

### 2. Tiempo de Expiración
- Por defecto: 24 horas
- Configurable en Firebase
- Puedes mencionarlo en el email

### 3. Información Adicional
- Área legal del usuario
- País
- Fecha de creación de cuenta
- Plan asignado (si aplica)

### 4. Branding
- Logo de Avocat LegalTech (si tienes URL)
- Colores corporativos (#f59e0b)
- Enlaces a redes sociales (opcional)

---

## 🎯 Variables que se Usarán

### En el Email:

| Variable | Origen | Ejemplo | Uso |
|----------|--------|---------|-----|
| `displayName` | Excel (nombres + apellido) | "Ivan Diaz" | Saludo personalizado |
| `email` | Excel | "ivan@example.com" | Email del destinatario |
| `invitationLink` | Firebase Admin SDK | "https://..." | Link de invitación |
| `pais` | Excel | "Mexico" | Personalización opcional |
| `area_legal` | Excel | "Derecho Civil" | Personalización opcional |

---

## 📝 Texto del Email (Versión Completa)

### Asunto:
```
Bienvenido a Avocat LegalTech - Establece tu contraseña
```

### Cuerpo (Versión Corta):
```
Hola [Nombre],

Bienvenido a Avocat LegalTech. Para comenzar, establece tu contraseña haciendo clic en el botón siguiente.

[Botón: Establecer Contraseña]

Este enlace expirará en 24 horas.

Atentamente,
Equipo Avocat LegalTech
```

### Cuerpo (Versión Completa - la que se usará):
Ver el HTML completo arriba.

---

## ✅ Checklist de Personalización

- [x] Diseño HTML responsivo
- [x] Branding de Avocat LegalTech
- [x] Saludo personalizado con nombre
- [x] Botón de acción destacado
- [x] Link alternativo (texto)
- [x] Información sobre funcionalidades
- [x] Advertencia de expiración
- [x] Información de contacto
- [x] Footer con copyright
- [x] Compatible con clientes de email

---

## 🚀 Próximos Pasos

1. **Revisar el diseño** del email (arriba)
2. **Aprobar o sugerir cambios** en el contenido
3. **Confirmar variables** a usar
4. **Ejecutar el script** para crear usuarios y enviar emails

---

## 💡 Sugerencias de Mejora (Opcional)

### Puedes agregar:
- Logo de Avocat LegalTech (imagen)
- Enlaces a redes sociales
- Video de bienvenida (opcional)
- Información sobre próximos webinars
- Casos de éxito de clientes

### Puedes personalizar:
- Colores (actualmente #f59e0b - naranja)
- Fuentes
- Espaciado
- Contenido adicional según área legal

---

## ❓ Preguntas para Personalizar

1. **¿Quieres agregar un logo?** (necesitaría URL de la imagen)
2. **¿Prefieres texto más corto o más largo?**
3. **¿Quieres mencionar el área legal del usuario?**
4. **¿Quieres agregar información sobre el país?**
5. **¿Prefieres otro color para el botón?**
6. **¿Quieres agregar enlaces a redes sociales?**

---

## 📋 Resumen Final

- **Remitente**: `soporte@avocatapp.com` ✅
- **Asunto**: "Bienvenido a Avocat LegalTech - Establece tu contraseña"
- **Diseño**: HTML responsivo con branding de Avocat
- **Personalización**: Nombre del usuario en el saludo
- **Link**: Generado por Firebase Admin SDK
- **Envío**: Usando Nodemailer con tu SMTP configurado

¿Quieres hacer algún cambio antes de ejecutar?



