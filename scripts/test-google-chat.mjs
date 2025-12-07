#!/usr/bin/env node

/**
 * Script de prueba para la integración de Google Chat
 * 
 * Uso:
 *   node scripts/test-google-chat.mjs
 * 
 * Asegúrate de tener GOOGLE_CHAT_WEBHOOK_URL configurada en .env.local
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

try {
  const envFile = readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.warn('⚠️ No se pudo cargar .env.local, usando variables de entorno del sistema');
}

const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error('❌ Error: GOOGLE_CHAT_WEBHOOK_URL no está configurada');
  console.log('\n📝 Para configurarla:');
  console.log('1. Crea un webhook en Google Chat');
  console.log('2. Agrega la URL a .env.local:');
  console.log('   GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...');
  process.exit(1);
}

console.log('🧪 Probando integración con Google Chat...\n');

// Test 1: Mensaje simple
console.log('📤 Test 1: Enviando mensaje simple...');
try {
  const response1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: '🧪 Test de integración: Mensaje simple desde Avocat LegalTech',
    }),
  });

  if (response1.ok) {
    console.log('✅ Mensaje simple enviado exitosamente\n');
  } else {
    const errorText = await response1.text();
    console.error('❌ Error:', response1.status, errorText);
  }
} catch (error) {
  console.error('❌ Error en la petición:', error.message);
}

// Esperar un segundo
await new Promise(resolve => setTimeout(resolve, 1000));

// Test 2: Tarjeta con formato
console.log('📤 Test 2: Enviando tarjeta con formato...');
try {
  const response2 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cards: [
        {
          header: {
            title: '✅ Test de Integración - Avocat LegalTech',
            subtitle: new Date().toLocaleString('es-ES'),
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: 'Esta es una notificación de prueba de la integración con Google Chat.',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Estado',
                    content: '✅ Funcionando correctamente',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Tipo de Test',
                    content: 'Notificación de prueba',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Timestamp',
                    content: new Date().toISOString(),
                  },
                },
              ],
            },
            {
              widgets: [
                {
                  textButton: {
                    text: 'Ver Documentación',
                    onClick: {
                      openLink: {
                        url: 'https://github.com/your-repo',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (response2.ok) {
    console.log('✅ Tarjeta enviada exitosamente\n');
  } else {
    const errorText = await response2.text();
    console.error('❌ Error:', response2.status, errorText);
  }
} catch (error) {
  console.error('❌ Error en la petición:', error.message);
}

// Test 3: Simular notificación de documento generado
console.log('📤 Test 3: Simulando notificación de documento generado...');
try {
  const response3 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cards: [
        {
          header: {
            title: '✅ Documento Generado',
            subtitle: new Date().toLocaleString('es-ES'),
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: 'Se ha generado un nuevo documento legal para usuario@example.com',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Usuario',
                    content: 'usuario@example.com',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Tipo de Documento',
                    content: 'Demanda de Reclamación',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Área Legal',
                    content: 'Derecho Laboral',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Archivo',
                    content: 'demanda-reclamacion-1234567890.pdf',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Tokens Usados',
                    content: '1500',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Tiempo de Procesamiento',
                    content: '3.5s',
                  },
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (response3.ok) {
    console.log('✅ Notificación de documento enviada exitosamente\n');
  } else {
    const errorText = await response3.text();
    console.error('❌ Error:', response3.status, errorText);
  }
} catch (error) {
  console.error('❌ Error en la petición:', error.message);
}

console.log('✨ Pruebas completadas. Revisa tu Google Chat para ver las notificaciones.');



