/**
 * Script para configurar CORS en Firebase Storage
 * Usa la API de Google Cloud Storage directamente
 */

import { Storage } from '@google-cloud/storage';

// Usar el bucket de Firebase Storage
// Nota: Firebase Storage usa buckets de Google Cloud Storage detrás de escena
// El bucket REAL que existe es avocat-legaltech-v3.firebasestorage.app
// Aunque el código puede especificar appspot.com, Firebase redirige a firebasestorage.app
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';

// Configuración CORS
const corsConfiguration = [
  {
    origin: [
      'https://avocatapp.com',
      'https://www.avocatapp.com',
      'https://avocat-legaltech-v3.web.app',
      'http://localhost:3000', // Para desarrollo local
    ],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
    responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable'],
    maxAgeSeconds: 3600,
  },
];

async function configureCors() {
  try {
    console.log('🔧 Configurando CORS en Firebase Storage...');
    console.log(`📦 Bucket: ${bucketName}`);

    // Inicializar Storage
    const storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID || 'avocat-legaltech-v3',
    });

    // Obtener el bucket
    const bucket = storage.bucket(bucketName);

    // Verificar que el bucket existe
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`❌ El bucket ${bucketName} no existe`);
      process.exit(1);
    }

    // Configurar CORS
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('✅ CORS configurado exitosamente');
    console.log('\n📋 Configuración aplicada:');
    console.log(JSON.stringify(corsConfiguration, null, 2));

    // Verificar la configuración
    const [metadata] = await bucket.getMetadata();
    console.log('\n🔍 Verificando configuración...');
    if (metadata.cors) {
      console.log('✅ CORS verificado:', JSON.stringify(metadata.cors, null, 2));
    } else {
      console.log('⚠️ No se pudo verificar CORS en los metadatos');
    }

    console.log('\n✨ ¡Listo! Los cambios pueden tardar 1-2 minutos en propagarse.');
  } catch (error: any) {
    console.error('❌ Error configurando CORS:', error.message);
    if (error.code === 'ENOENT' || error.code === 404) {
      console.error('\n💡 Sugerencia: Verifica que el bucket existe y que tienes permisos para modificarlo.');
    }
    process.exit(1);
  }
}

// Ejecutar
configureCors();

