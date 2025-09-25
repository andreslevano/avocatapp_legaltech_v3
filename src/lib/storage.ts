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