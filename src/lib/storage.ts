import { storage } from './firebase-admin';

export interface SavePdfOptions {
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface SavePdfResult {
  storagePath: string;
  size: number;
  bucket: string;
}

export interface SignedUrlOptions {
  expiresMinutes?: number;
}

/**
 * Guarda un PDF en Firebase Storage bajo la ruta users/{uid}/documents/{docId}.pdf
 */
export async function savePdfForUser(
  uid: string, 
  docId: string, 
  buffer: Buffer, 
  options: SavePdfOptions = {}
): Promise<SavePdfResult> {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
  const filePath = `users/${uid}/documents/${docId}.pdf`;
  
  const file = storage().bucket(bucket).file(filePath);
  
  const uploadOptions = {
    contentType: options.contentType || 'application/pdf',
    metadata: {
      ...options.metadata,
      userId: uid,
      docId,
      uploadedAt: new Date().toISOString()
    }
  };
  
  await file.save(buffer, uploadOptions);
  
  const [metadata] = await file.getMetadata();
  
  return {
    storagePath: filePath,
    size: Number(metadata.size || buffer.length),
    bucket
  };
}

/**
 * Genera una URL firmada para descargar un PDF
 */
export async function signedUrlFor(
  uid: string, 
  docId: string, 
  options: SignedUrlOptions = {}
): Promise<string> {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
  const filePath = `users/${uid}/documents/${docId}.pdf`;
  
  const file = storage().bucket(bucket).file(filePath);
  
  const expiresMinutes = options.expiresMinutes || 15;
  const expiresAt = Date.now() + (expiresMinutes * 60 * 1000);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt
  });
  
  return url;
}

/**
 * Obtiene metadatos de un archivo
 */
export async function getFileMetadata(uid: string, docId: string) {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
  const filePath = `users/${uid}/documents/${docId}.pdf`;
  
  const file = storage().bucket(bucket).file(filePath);
  const [metadata] = await file.getMetadata();
  
  return metadata;
}

/**
 * Elimina un archivo del storage
 */
export async function deleteFile(uid: string, docId: string): Promise<boolean> {
  try {
    const bucket = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
    const filePath = `users/${uid}/documents/${docId}.pdf`;
    
    const file = storage().bucket(bucket).file(filePath);
    await file.delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Guarda un archivo subido para OCR en Firebase Storage
 * Ruta: users/{uid}/uploads/{reclId}/{filename}
 */
export async function saveUploadedFile(
  uid: string,
  reclId: string,
  filename: string,
  buffer: Buffer,
  options: SavePdfOptions = {}
): Promise<SavePdfResult> {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
  
  // Obtener el bucket de Storage
  const storageInstance = storage();
  let bucket;
  
  try {
    bucket = storageInstance.bucket(bucketName);
    
    // Intentar verificar que el bucket existe (puede fallar si no tiene permisos)
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        console.warn(`⚠️ El bucket ${bucketName} no existe. Intentando crear...`);
        // Intentar crear el bucket (puede fallar si no tiene permisos)
        try {
          await bucket.create();
          console.log(`✅ Bucket ${bucketName} creado exitosamente`);
        } catch (createError: any) {
          console.warn(`⚠️ No se pudo crear el bucket (puede requerir permisos): ${createError.message}`);
          throw new Error(`El bucket ${bucketName} no existe y no se pudo crear. Verifica la configuración de Firebase Storage.`);
        }
      }
    } catch (checkError: any) {
      // Si falla la verificación, intentar usar el bucket de todas formas
      // (puede ser un problema de permisos, pero el bucket puede existir)
      console.warn(`⚠️ No se pudo verificar el bucket (continuando de todas formas): ${checkError.message}`);
    }
  } catch (error: any) {
    console.error(`❌ Error accediendo al bucket ${bucketName}:`, error.message);
    throw new Error(`No se pudo acceder al bucket de Storage: ${error.message}`);
  }
  
  // Sanitizar el nombre del archivo para evitar problemas con caracteres especiales
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `users/${uid}/uploads/${reclId}/${sanitizedFilename}`;
  
  const file = bucket.file(filePath);
  
  const uploadOptions = {
    contentType: options.contentType || 'application/pdf',
    metadata: {
      ...options.metadata,
      userId: uid,
      reclId,
      originalFilename: filename,
      uploadedAt: new Date().toISOString(),
      purpose: 'ocr_analysis'
    }
  };
  
  try {
    await file.save(buffer, uploadOptions);
    
    const [metadata] = await file.getMetadata();
    
    console.log(`💾 Archivo subido guardado: ${filePath} (${buffer.length} bytes) en bucket ${bucketName}`);
    
    return {
      storagePath: filePath,
      size: Number(metadata.size || buffer.length),
      bucket: bucketName
    };
  } catch (error: any) {
    console.error(`❌ Error guardando archivo en Storage:`, error);
    throw new Error(`Error guardando archivo: ${error.message}`);
  }
}

/**
 * Genera una URL firmada para descargar un archivo subido
 */
export async function signedUrlForUploadedFile(
  uid: string,
  reclId: string,
  filename: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `users/${uid}/uploads/${reclId}/${sanitizedFilename}`;
  
  const storageInstance = storage();
  const bucket = storageInstance.bucket(bucketName);
  const file = bucket.file(filePath);
  
  // Verificar que el archivo existe
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`El archivo ${filePath} no existe en Storage`);
  }
  
  const expiresMinutes = options.expiresMinutes || 60; // URLs más largas para archivos subidos
  const expiresAt = Date.now() + (expiresMinutes * 60 * 1000);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt
  });
  
  return url;
}