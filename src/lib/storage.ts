import { getStorage, ref, uploadBytes, getDownloadURL, StorageReference } from 'firebase/storage';
import { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Obtiene el plan del usuario desde Firestore
 * @param userId - ID del usuario
 * @returns Plan del usuario o null si no se encuentra
 */
async function getUserPlan(userId: string): Promise<string | null> {
  try {
    if (!db || typeof db === 'object' && Object.keys(db).length === 0) {
      return null;
    }

    const userRef = doc(collection(db as any, 'users'), userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData?.plan || null;
    }
    return null;
  } catch (error) {
    console.warn('Error obteniendo plan del usuario:', error);
    return null;
  }
}

/**
 * Determina la carpeta base según el plan del usuario o el tipo de documento
 * @param userId - ID del usuario
 * @param documentType - Tipo de documento (opcional)
 * @returns 'students', 'reclamaciones' o 'users' según corresponda
 */
async function getStorageBasePath(userId: string, documentType?: string): Promise<string> {
  // Si es un documento de reclamación, usar carpeta específica
  if (documentType === 'reclamacion_cantidades') {
    return 'reclamaciones';
  }
  
  // Verificar el plan del usuario
  const plan = await getUserPlan(userId);
  if (plan === 'Estudiantes') {
    return 'students';
  }
  if (plan === 'Reclamación de Cantidades') {
    return 'reclamaciones';
  }
  
  // Por defecto, usar 'users'
  return 'users';
}

/**
 * Guarda un archivo PDF en Firebase Storage
 * @param userId - ID del usuario
 * @param documentId - ID del documento
 * @param fileBuffer - Buffer del archivo PDF
 * @param metadata - Metadatos adicionales
 * @returns Información del archivo guardado
 */
export async function savePdfForUser(
  userId: string,
  documentId: string,
  fileBuffer: Buffer | Uint8Array,
  metadata?: {
    fileName?: string;
    contentType?: string;
    documentType?: string;
  }
): Promise<{
  storagePath: string;
  downloadURL: string;
  bucket: string;
  size: number;
}> {
  try {
    // Verificar que storage esté disponible
    if (!storage || typeof storage === 'object' && Object.keys(storage).length === 0) {
      throw new Error('Firebase Storage no está inicializado');
    }

    // Validar que userId sea válido y no sea un valor por defecto
    if (!userId || userId === 'demo_user' || userId.trim() === '') {
      throw new Error('ID de usuario inválido. Debe estar autenticado para guardar documentos.');
    }

    // Determinar la carpeta base según el plan del usuario o tipo de documento
    const basePath = await getStorageBasePath(userId, metadata?.documentType);
    const fileName = metadata?.fileName || `document_${documentId}.pdf`;
    // Asegurar que la ruta siempre incluya el userId único del usuario
    const storagePath = `${basePath}/${userId}/documents/${documentId}/${fileName}`;
    
    // Crear referencia en Storage
    const storageRef = ref(storage as any, storagePath);
    
    // Subir el archivo
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: metadata?.contentType || 'application/pdf',
      customMetadata: {
        documentId,
        documentType: metadata?.documentType || 'unknown',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      storagePath,
      downloadURL,
      bucket: snapshot.metadata.bucket,
      size: snapshot.metadata.size,
    };
  } catch (error) {
    console.error('Error guardando PDF en Storage:', error);
    throw error;
  }
}

/**
 * Guarda un archivo subido por el usuario (para OCR)
 * @param userId - ID del usuario
 * @param file - Archivo a subir
 * @param category - Categoría del documento
 * @param documentType - Tipo de documento (opcional, para determinar carpeta)
 * @returns Información del archivo guardado
 */
export async function saveUploadedFile(
  userId: string,
  file: File,
  category?: string,
  documentType?: string
): Promise<{
  storagePath: string;
  downloadURL: string;
  fileId: string;
}> {
  try {
    if (!storage || typeof storage === 'object' && Object.keys(storage).length === 0) {
      throw new Error('Firebase Storage no está inicializado');
    }

    // Validar que userId sea válido y no sea un valor por defecto
    if (!userId || userId === 'demo_user' || userId.trim() === '') {
      throw new Error('ID de usuario inválido. Debe estar autenticado para subir archivos.');
    }

    // Determinar la carpeta base según el plan del usuario o tipo de documento
    const basePath = await getStorageBasePath(userId, documentType);
    const fileId = uuidv4();
    const fileName = `${fileId}_${file.name}`;
    // Asegurar que la ruta siempre incluya el userId único del usuario
    const storagePath = `${basePath}/${userId}/ocr/${fileName}`;
    
    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Crear referencia en Storage
    const storageRef = ref(storage as any, storagePath);
    
    // Subir el archivo
    const snapshot = await uploadBytes(storageRef, uint8Array, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        category: category || 'unknown',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Guardar metadatos en Firestore
    if (db && typeof db === 'object' && Object.keys(db as any).length > 0) {
      try {
        const fileDocRef = doc(collection(db as any, 'uploaded_files'), fileId);
        await setDoc(fileDocRef, {
          userId,
          fileName: file.name,
          storagePath,
          downloadURL,
          category: category || 'unknown',
          size: file.size,
          contentType: file.type,
          uploadedAt: serverTimestamp(),
        });
      } catch (firestoreError) {
        console.warn('Error guardando metadatos en Firestore:', firestoreError);
        // No lanzar error, el archivo ya está en Storage
      }
    }

    return {
      storagePath,
      downloadURL,
      fileId,
    };
  } catch (error) {
    console.error('Error guardando archivo subido:', error);
    throw error;
  }
}

/**
 * Guarda información de una compra en Firestore
 * @param purchaseId - ID de la compra (session ID de Stripe)
 * @param purchaseData - Datos de la compra
 */
export async function savePurchase(
  purchaseId: string,
  purchaseData: {
    userId: string;
    amount: number;
    currency: string;
    documentType?: string;
    documentId?: string;
    storagePath?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    if (!db || typeof db === 'object' && Object.keys(db).length === 0) {
      console.warn('Firestore no está inicializado, no se puede guardar la compra');
      return;
    }

    const purchaseRef = doc(collection(db as any, 'purchases'), purchaseId);
    await setDoc(purchaseRef, {
      ...purchaseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Actualizar estadísticas del usuario
    const userRef = doc(collection(db as any, 'users'), purchaseData.userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      await setDoc(userRef, {
        ...userData,
        totalPurchases: (userData?.totalPurchases || 0) + 1,
        totalSpent: (userData?.totalSpent || 0) + purchaseData.amount,
        lastPurchaseAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error guardando compra:', error);
    throw error;
  }
}

/**
 * Obtiene la URL firmada de un archivo en Storage
 * @param storagePath - Ruta del archivo en Storage
 * @returns URL firmada
 */
export async function getSignedUrl(storagePath: string): Promise<string> {
  try {
    if (!storage || typeof storage === 'object' && Object.keys(storage).length === 0) {
      throw new Error('Firebase Storage no está inicializado');
    }

    const storageRef = ref(storage as any, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error obteniendo URL firmada:', error);
    throw error;
  }
}

