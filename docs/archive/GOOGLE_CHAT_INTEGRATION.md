# 🔔 Integración con Google Chat

Esta aplicación está integrada con Google Chat para recibir notificaciones en tiempo real sobre eventos importantes del sistema.

## 📋 Configuración

### 1. Crear un Webhook en Google Chat

1. Abre **Google Chat** → entra en un **Space** o **Chat individual**
2. Arriba a la derecha → **Apps & Integrations**
3. **Add Webhook** → dale un nombre (ej: "Avocat LegalTech Notifications") → **Save**
4. Google te dará una URL como:
   ```
   https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
   ```

### 2. Configurar la Variable de Entorno

Agrega la URL del webhook a tu archivo `.env.local`:

```bash
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

### 3. Reiniciar el Servidor

Después de agregar la variable de entorno, reinicia tu servidor de desarrollo:

```bash
npm run dev
```

## 🎯 Eventos que se Notifican

La integración envía notificaciones automáticas para los siguientes eventos:

### ✅ Documentos Generados
- Cuando se genera exitosamente un documento legal
- Incluye información sobre el usuario, tipo de documento, área legal, tokens usados y tiempo de procesamiento
- Incluye un botón para ver el documento (si está disponible)

### ❌ Errores en Generación
- Cuando falla la generación de un documento
- Incluye detalles del error y contexto para debugging

### 📧 Emails Enviados
- Cuando se envía un email a un usuario
- Notifica tanto envíos exitosos como fallidos

### 💰 Compras Completadas
- Cuando un usuario completa una compra a través de Stripe
- Incluye información del usuario, monto, tipo de compra y descripción

## 📝 Ejemplo de Uso Manual

También puedes enviar notificaciones manualmente desde tu código:

```typescript
import { GoogleChatNotifications, sendGoogleChatMessage, sendGoogleChatCard } from '@/lib/google-chat';

// Enviar un mensaje simple
await sendGoogleChatMessage('¡Hola desde Avocat LegalTech!');

// Enviar una notificación de documento generado
await GoogleChatNotifications.documentGenerated({
  userId: 'user123',
  userEmail: 'usuario@example.com',
  docId: 'doc456',
  documentType: 'Demanda de Reclamación',
  areaLegal: 'Derecho Laboral',
  filename: 'demanda.pdf',
  downloadUrl: 'https://...',
  tokensUsed: 1500,
  processingTime: 3500,
});

// Enviar una notificación personalizada
await sendGoogleChatCard({
  title: 'Evento Personalizado',
  message: 'Descripción del evento',
  type: 'info',
  fields: [
    { label: 'Campo 1', value: 'Valor 1' },
    { label: 'Campo 2', value: 'Valor 2', multiline: true },
  ],
  buttons: [
    { text: 'Ver Detalles', url: 'https://...' },
  ],
});
```

## 🔧 Funciones Disponibles

### `sendGoogleChatMessage(message: string, webhookUrl?: string)`
Envía un mensaje de texto simple a Google Chat.

### `sendGoogleChatCard(options: NotificationOptions, webhookUrl?: string)`
Envía un mensaje con formato de tarjeta (card) con campos, botones y formato avanzado.

### `GoogleChatNotifications.documentGenerated(data)`
Notifica cuando se genera un documento exitosamente.

### `GoogleChatNotifications.documentError(data)`
Notifica cuando hay un error en la generación de documentos.

### `GoogleChatNotifications.emailSent(data)`
Notifica cuando se envía un email (exitoso o fallido).

### `GoogleChatNotifications.purchaseCompleted(data)`
Notifica cuando se completa una compra.

### `GoogleChatNotifications.adminEvent(data)`
Notifica eventos administrativos personalizados.

## 🛡️ Manejo de Errores

Todas las notificaciones son **no bloqueantes**. Si falla el envío a Google Chat:
- El error se registra en los logs
- La operación principal (generación de documento, envío de email, etc.) continúa normalmente
- No afecta la experiencia del usuario

## 📊 Formato de las Notificaciones

Las notificaciones se envían como **tarjetas (cards)** de Google Chat con:
- **Header**: Título con emoji según el tipo (✅ éxito, ❌ error, ℹ️ info, ⚠️ advertencia)
- **Campos**: Información estructurada en formato clave-valor
- **Botones**: Enlaces a documentos o acciones relevantes
- **Timestamp**: Fecha y hora del evento

## 🧪 Pruebas

Para probar la integración, puedes:

1. **Generar un documento** desde el dashboard
2. **Enviar un email** a un usuario
3. **Completar una compra** de prueba
4. **Verificar** que las notificaciones aparezcan en tu Google Chat

## 📚 Referencias

- [Google Chat API - Webhooks](https://developers.google.com/chat/api/guides/message-formats)
- [Google Chat Card Format](https://developers.google.com/chat/api/guides/message-formats/cards)

## ⚠️ Notas Importantes

- La URL del webhook es **sensible** y debe mantenerse **privada**
- No compartas la URL del webhook públicamente
- Si necesitas múltiples canales de notificación, crea webhooks separados para cada uno
- Las notificaciones se envían de forma asíncrona y no bloquean las operaciones principales



