import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { storage, db } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import {
  type StorageContext,
  resolveStorageContext,
  buildDocumentPath,
  buildOcrPath,
} from './storage-paths';

/**
 * Obtiene el plan del usuario desde Firestore
 */
async function getUserPlan(userId: string): Promise<string | null> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) {
      return null;
    }
    const userRef = doc(collection(db as any, 'users'), userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data()?.plan || null;
    }
    return null;
  } catch (error) {
    console.warn('Error obteniendo plan del usuario:', error);
    return null;
  }
}

/**
 * Resolves StorageContext from optional explicit context or legacy documentType/plan.
 */
async function resolveContext(
  userId: string,
  documentType?: string | null,
  explicitContext?: StorageContext | null
): Promise<StorageContext> {
  if (explicitContext) return explicitContext;
  const plan = await getUserPlan(userId);
  return resolveStorageContext(documentType, plan);
}

/**
 * Guarda un archivo PDF en Firebase Storage
 * Path: {uid}/{userType}/{documentType}/documents/{documentId}/{fileName}
 *
 * @param userId - ID del usuario (UID)
 * @param documentId - ID del documento
 * @param fileBuffer - Buffer del archivo PDF
 * @param metadata - Metadatos (fileName, contentType, documentType, storageContext)
 */
export async function savePdfForUser(
  userId: string,
  documentId: string,
  fileBuffer: Buffer | Uint8Array,
  metadata?: {
    fileName?: string;
    contentType?: string;
    documentType?: string;
    storageContext?: { userType: string; documentType: string };
  }
): Promise<{
  storagePath: string;
  downloadURL: string;
  bucket: string;
  size: number;
}> {
  try {
    if (!storage || (typeof storage === 'object' && Object.keys(storage).length === 0)) {
      throw new Error('Firebase Storage no está inicializado');
    }

    const context = await resolveContext(
      userId,
      metadata?.documentType,
      metadata?.storageContext as any
    );
    const fileName = metadata?.fileName || `document_${documentId}.pdf`;
    const storagePath = buildDocumentPath(userId, context, documentId, fileName);
    
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
 * Path: {uid}/{userType}/{documentType}/ocr/{fileId}_{originalName}
 *
 * @param userId - ID del usuario (UID)
 * @param file - Archivo a subir
 * @param category - Categoría del documento
 * @param documentType - Tipo de documento (legacy, para resolver carpeta)
 * @param storageContext - Contexto explícito (userType, documentType) - opcional
 * @param source - Origen/servicio (ej: 'extraccion-datos') - se guarda en Firestore para consultas
 */
export async function saveUploadedFile(
  userId: string,
  file: File,
  category?: string,
  documentType?: string,
  storageContext?: { userType: string; documentType: string },
  source?: string
): Promise<{
  storagePath: string;
  downloadURL: string;
  fileId: string;
}> {
  try {
    if (!storage || (typeof storage === 'object' && Object.keys(storage).length === 0)) {
      throw new Error('Firebase Storage no está inicializado');
    }

    const context = await resolveContext(userId, documentType, storageContext as any);
    const fileId = uuidv4();
    const storagePath = buildOcrPath(userId, context, fileId, file.name);
    
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
    if (db && typeof db === 'object' && Object.keys(db).length > 0) {
      try {
        const fileDocRef = doc(collection(db as any, 'uploaded_files'), fileId);
        await setDoc(fileDocRef, {
          userId,
          fileName: file.name,
          storagePath,
          downloadURL,
          category: category || 'unknown',
          source: source || undefined,
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
 * Guarda un batch de Extracción de Datos en Firestore (users/{uid}/extraccion_datos_batches/{batchId})
 * Vincula Storage y Firestore por UID.
 */
export async function saveExtraccionDatosBatch(
  userId: string,
  files: Array<{
    fileId: string;
    fileName: string;
    storagePath: string;
    downloadURL: string;
    size: number;
    contentType: string;
  }>
): Promise<string> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) {
      throw new Error('Firestore no está inicializado');
    }
    const userRef = doc(collection(db as any, 'users'), userId);
    const batchesRef = collection(userRef, 'extraccion_datos_batches');
    const batchRef = doc(batchesRef, uuidv4());
    await setDoc(batchRef, {
      userId,
      files: files.map((f) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        storagePath: f.storagePath,
        downloadURL: f.downloadURL,
        size: f.size,
        contentType: f.contentType,
      })),
      fileCount: files.length,
      createdAt: serverTimestamp(),
    });
    return batchRef.id;
  } catch (error) {
    console.error('Error guardando batch de extracción de datos:', error);
    throw error;
  }
}

export interface StoredExtraccionFile {
  fileId: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  size: number;
  contentType: string;
  aiProcessed?: boolean;
}

/** Parsea fileId y fileName desde el nombre de archivo en Storage: {fileId}_{fileName} */
function parseOcrFileName(name: string): { fileId: string; fileName: string } | null {
  const uuidMatch = name.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(.+)$/i);
  if (uuidMatch) {
    return { fileId: uuidMatch[1], fileName: uuidMatch[2] };
  }
  return null;
}

/**
 * Lista archivos huérfanos desde Storage (en ocr/ pero sin metadata en Firestore).
 */
async function listOrphanedExtraccionFilesFromStorage(userId: string): Promise<StoredExtraccionFile[]> {
  try {
    if (!storage || (typeof storage === 'object' && Object.keys(storage).length === 0)) {
      return [];
    }
    const context: StorageContext = { userType: 'autoservicio', documentType: 'extraccion-datos' };
    const ocrPath = `${userId}/${context.userType}/${context.documentType}/ocr`;
    const listRef = ref(storage as any, ocrPath);
    const result = await listAll(listRef);
    const orphaned: StoredExtraccionFile[] = [];
    for (const itemRef of result.items) {
      const parsed = parseOcrFileName(itemRef.name);
      if (!parsed) continue;
      try {
        const downloadURL = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        orphaned.push({
          fileId: parsed.fileId,
          fileName: parsed.fileName,
          storagePath: itemRef.fullPath,
          downloadURL,
          size: metadata.size || 0,
          contentType: metadata.contentType || 'application/pdf',
          aiProcessed: false,
        });
      } catch (e) {
        console.warn('Error obteniendo metadata de archivo huérfano:', itemRef.name, e);
      }
    }
    return orphaned;
  } catch (error) {
    console.warn('Error listando archivos huérfanos de Storage:', error);
    return [];
  }
}

/**
 * Lista archivos de extracción de datos no procesados por IA desde Firestore.
 * También incluye archivos huérfanos en Storage (subidos pero sin metadata en Firestore).
 */
export async function listExtraccionDatosUnprocessed(userId: string): Promise<StoredExtraccionFile[]> {
  const firestoreUnprocessed: StoredExtraccionFile[] = [];
  const allFirestoreFileIds = new Set<string>();
  try {
    if (db && typeof db === 'object' && Object.keys(db).length > 0) {
      const coll = collection(db as any, 'uploaded_files');
      const q = query(
        coll,
        where('userId', '==', userId),
        where('source', '==', 'extraccion-datos')
      );
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        const data = d.data();
        allFirestoreFileIds.add(d.id);
        if (data.aiProcessed === true) continue;
        firestoreUnprocessed.push({
          fileId: d.id,
          fileName: data.fileName || 'documento',
          storagePath: data.storagePath || '',
          downloadURL: data.downloadURL || '',
          size: data.size || 0,
          contentType: data.contentType || 'application/pdf',
          aiProcessed: false,
        });
      }
    }
  } catch (error) {
    console.warn('Error listando archivos de extracción desde Firestore:', error);
  }

  const extractedFileIds = new Set<string>();
  try {
    if (db && typeof db === 'object' && Object.keys(db).length > 0) {
      const userRef = doc(collection(db as any, 'users'), userId);
      const resultsRef = collection(userRef, 'extraccion_datos_results');
      const snapshot = await getDocs(resultsRef);
      snapshot.docs.forEach((d) => extractedFileIds.add(d.id));
    }
  } catch {
    // ignore
  }

  const orphaned = await listOrphanedExtraccionFilesFromStorage(userId);
  const orphanedFiltered = orphaned.filter(
    (f) => !allFirestoreFileIds.has(f.fileId) && !extractedFileIds.has(f.fileId)
  );

  return [...firestoreUnprocessed, ...orphanedFiltered];
}

/**
 * Guarda datos extraídos por IA en Firestore (users/{uid}/extraccion_datos_results/{fileId})
 */
export interface ExtractedDataDoc {
  fileId: string;
  fileName: string;
  country: string;
  documentType: string;
  emisor: string;
  receptor: string;
  fields: { key: string; value: string }[];
  processedAt?: unknown;
  storagePath?: string;
}

export async function saveExtractedData(
  userId: string,
  fileId: string,
  data: Omit<ExtractedDataDoc, 'fileId' | 'processedAt'>
): Promise<void> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) {
      throw new Error('Firestore no está inicializado');
    }
    const userRef = doc(collection(db as any, 'users'), userId);
    const resultsRef = doc(collection(userRef, 'extraccion_datos_results'), fileId);
    await setDoc(resultsRef, {
      fileId,
      fileName: data.fileName,
      country: data.country,
      documentType: data.documentType,
      emisor: data.emisor,
      receptor: data.receptor,
      fields: data.fields,
      storagePath: data.storagePath,
      processedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error guardando datos extraídos:', error);
    throw error;
  }
}

export async function listExtractedData(userId: string): Promise<ExtractedDataDoc[]> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) {
      return [];
    }
    const userRef = doc(collection(db as any, 'users'), userId);
    const resultsRef = collection(userRef, 'extraccion_datos_results');
    const snapshot = await getDocs(resultsRef);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        fileId: d.id,
        fileName: data.fileName || '',
        country: data.country || '',
        documentType: data.documentType || '',
        emisor: data.emisor || '',
        receptor: data.receptor || '',
        fields: data.fields || [],
        processedAt: data.processedAt,
        storagePath: data.storagePath,
      };
    });
  } catch (error) {
    console.warn('Error listando datos extraídos:', error);
    return [];
  }
}

/**
 * Elimina un archivo de extracción de datos de Storage y Firestore.
 */
export async function deleteExtraccionFile(storagePath: string, fileId: string): Promise<void> {
  if (storagePath?.trim()) {
    try {
      if (storage && typeof storage === 'object' && Object.keys(storage).length > 0) {
        const storageRef = ref(storage as any, storagePath);
        await deleteObject(storageRef);
      }
    } catch (storageErr) {
      console.warn('Error eliminando archivo de Storage:', storageErr);
    }
  }
  try {
    if (db && typeof db === 'object' && Object.keys(db).length > 0) {
      const fileRef = doc(collection(db as any, 'uploaded_files'), fileId);
      await deleteDoc(fileRef);
    }
  } catch (firestoreErr) {
    console.error('Error eliminando metadatos de Firestore:', firestoreErr);
    throw firestoreErr;
  }
}

/**
 * Elimina un documento extraído (resultado de IA) y opcionalmente su archivo original de Storage y Firestore.
 * Para items split (fileId contiene _p), uploaded_files usa baseFileId; pasar baseFileId cuando se elimina el último.
 */
export async function deleteExtractedDataAndFile(
  userId: string,
  fileId: string,
  storagePath?: string,
  baseFileIdForUploaded?: string
): Promise<void> {
  if (storagePath?.trim()) {
    try {
      if (storage && typeof storage === 'object' && Object.keys(storage).length > 0) {
        const storageRef = ref(storage as any, storagePath);
        await deleteObject(storageRef);
      }
    } catch (storageErr) {
      console.warn('Error eliminando archivo de Storage:', storageErr);
    }
  }
  try {
    if (db && typeof db === 'object' && Object.keys(db).length > 0) {
      const uploadedFileId = baseFileIdForUploaded ?? (fileId.includes('_p') ? undefined : fileId);
      if (uploadedFileId) {
        const fileRef = doc(collection(db as any, 'uploaded_files'), uploadedFileId);
        await deleteDoc(fileRef);
      }
      const userRef = doc(collection(db as any, 'users'), userId);
      const resultRef = doc(collection(userRef, 'extraccion_datos_results'), fileId);
      await deleteDoc(resultRef);
    }
  } catch (firestoreErr) {
    console.error('Error eliminando datos extraídos:', firestoreErr);
    throw firestoreErr;
  }
}

/**
 * Obtiene storagePath de un archivo subido por fileId (para eliminar extraídos sin storagePath guardado).
 */
export async function getUploadedFileStoragePath(fileId: string): Promise<string | null> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) return null;
    const fileRef = doc(collection(db as any, 'uploaded_files'), fileId);
    const fileDoc = await getDoc(fileRef);
    return fileDoc.exists() ? fileDoc.data()?.storagePath ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Marca un archivo como procesado por IA en Firestore.
 */
export async function markUploadedFileProcessed(fileId: string): Promise<void> {
  try {
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0)) {
      throw new Error('Firestore no está inicializado');
    }
    const fileRef = doc(collection(db as any, 'uploaded_files'), fileId);
    await updateDoc(fileRef, {
      aiProcessed: true,
      processedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marcando archivo como procesado:', error);
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

