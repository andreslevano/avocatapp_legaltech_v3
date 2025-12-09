/**
 * Google Chat Notifications
 * Módulo para enviar notificaciones a Google Chat
 */

export class GoogleChatNotifications {
  /**
   * Envía notificación de compra completada
   */
  static async purchaseCompleted(params: {
    userId: string;
    userEmail: string;
    purchaseId: string;
    amount: number;
    currency: string;
    description?: string;
    type?: 'payment' | 'subscription';
  }): Promise<void> {
    try {
      const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
      
      if (!webhookUrl) {
        console.log('⚠️ GOOGLE_CHAT_WEBHOOK_URL no configurado, omitiendo notificación');
        return;
      }

      const message = {
        text: `💰 Compra Completada\n\n` +
              `Usuario: ${params.userId}\n` +
              `Email: ${params.userEmail}\n` +
              `Compra ID: ${params.purchaseId}\n` +
              `Monto: ${params.amount} ${params.currency}\n` +
              `Tipo: ${params.type || 'payment'}\n` +
              (params.description ? `Descripción: ${params.description}\n` : '')
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.warn('⚠️ Error enviando notificación a Google Chat:', response.statusText);
      } else {
        console.log('✅ Notificación enviada a Google Chat');
      }
    } catch (error: any) {
      console.warn('⚠️ Error enviando notificación a Google Chat:', error.message);
      // No lanzar error para no romper el flujo principal
    }
  }

  /**
   * Envía notificación de documento generado
   */
  static async documentGenerated(params: {
    userId: string;
    userEmail: string;
    docId: string;
    documentType: string;
    title?: string;
    areaLegal?: string;
    filename?: string;
    downloadUrl?: string;
    processingTime?: number;
  }): Promise<void> {
    try {
      const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
      
      if (!webhookUrl) {
        console.log('⚠️ GOOGLE_CHAT_WEBHOOK_URL no configurado, omitiendo notificación');
        return;
      }

      const message = {
        text: `📄 Documento Generado\n\n` +
              `Usuario: ${params.userId}\n` +
              `Email: ${params.userEmail}\n` +
              `Documento ID: ${params.docId}\n` +
              `Tipo: ${params.documentType}\n` +
              (params.title ? `Título: ${params.title}\n` : '') +
              (params.areaLegal ? `Área Legal: ${params.areaLegal}\n` : '') +
              (params.filename ? `Archivo: ${params.filename}\n` : '') +
              (params.processingTime ? `Tiempo de procesamiento: ${params.processingTime}ms\n` : '')
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.warn('⚠️ Error enviando notificación a Google Chat:', response.statusText);
      } else {
        console.log('✅ Notificación de documento generado enviada a Google Chat');
      }
    } catch (error: any) {
      console.warn('⚠️ Error enviando notificación a Google Chat:', error.message);
    }
  }

  /**
   * Envía notificación genérica
   */
  static async sendNotification(message: string): Promise<void> {
    try {
      const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
      
      if (!webhookUrl) {
        console.log('⚠️ GOOGLE_CHAT_WEBHOOK_URL no configurado, omitiendo notificación');
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        console.warn('⚠️ Error enviando notificación a Google Chat:', response.statusText);
      }
    } catch (error: any) {
      console.warn('⚠️ Error enviando notificación a Google Chat:', error.message);
    }
  }
}

