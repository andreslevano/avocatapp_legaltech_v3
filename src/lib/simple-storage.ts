// Sistema de persistencia simplificado para desarrollo
// Simula Firestore y Storage usando archivos locales

import { db } from './firebase-admin';

interface DocumentData {
  docId: string;
  userId: string;
  filename: string;
  mime: string;
  size: number;
  createdAtISO: string;
  areaLegal: string;
  tipoEscrito: string;
  storagePath: string;
  [key: string]: any;
}

interface HistoryItem {
  userId: string;
  fechaISO: string;
  titulo: string;
  documentos?: number;
  precision?: number;
  precio?: number;
  cuantia?: number;
  estado: string;
  documentId?: string;
  storagePath?: string;
  derecho?: string;
  ciudad?: string;
}

// Simulación de base de datos en memoria
const documents: Map<string, DocumentData> = new Map();
const history: HistoryItem[] = [];

export async function saveDocument(uid: string, docId: string, data: DocumentData): Promise<void> {
  documents.set(docId, { ...data, docId, userId: uid });
  console.log(`📄 Documento guardado: ${docId} para usuario ${uid}`);
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  history.push(item);
  console.log(`📋 Historial actualizado: ${item.titulo} para usuario ${item.userId}`);
}

export async function getDocumentsByUser(uid: string): Promise<DocumentData[]> {
  return Array.from(documents.values()).filter(doc => doc.userId === uid);
}

export async function getHistoryByUser(uid: string): Promise<HistoryItem[]> {
  return history.filter(item => item.userId === uid);
}

export async function getDocumentById(docId: string): Promise<DocumentData | null> {
  return documents.get(docId) || null;
}

// Simular guardado de PDF (en desarrollo real se guardaría en Storage)
export async function savePdfForUser(
  uid: string, 
  docId: string, 
  buffer: Buffer, 
  options: any = {}
): Promise<{ storagePath: string; size: number; bucket: string }> {
  const filePath = `users/${uid}/documents/${docId}.pdf`;
  const size = buffer.length;
  
  console.log(`💾 PDF guardado: ${filePath} (${size} bytes)`);
  
  return {
    storagePath: filePath,
    size,
    bucket: 'avocat-legaltech-v3.appspot.com'
  };
}

// Simular URL firmada
export async function signedUrlFor(
  uid: string, 
  docId: string, 
  options: { expiresMinutes?: number } = {}
): Promise<string> {
  const url = `http://localhost:3000/api/documents/${docId}/download?uid=${uid}`;
  console.log(`🔗 URL generada: ${url}`);
  return url;
}

// Funciones para analytics y administración
export async function saveUserProfile(uid: string, profileData: any) {
  await db().collection('users').doc(uid).set(profileData, { merge: true });
}

export async function saveDocumentGeneration(docId: string, generationData: any) {
  await db().collection('documents').doc(docId).set(generationData);
}

export async function savePurchase(purchaseId: string, purchaseData: any) {
  await db().collection('purchases').doc(purchaseId).set(purchaseData);
}

export async function updateUserStats(uid: string, stats: any) {
  await db().collection('users').doc(uid).update({
    stats: stats,
    lastLoginAt: new Date().toISOString()
  });
}

// Guardar reclamación en Firestore
export async function saveReclamacion(reclId: string, reclamacionData: any) {
  await db().collection('reclamaciones').doc(reclId).set(reclamacionData, { merge: true });
  console.log(`✅ Reclamación guardada en Firestore: ${reclId}`);
}

// Guardar información de archivos subidos en Firestore
export async function saveUploadedFilesToFirestore(
  userId: string,
  reclId: string,
  files: Array<{
    fileName: string;
    storagePath?: string;
    downloadUrl?: string;
    size?: number;
    contentType?: string;
    extractedText?: string;
    confidence?: number;
  }>
) {
  try {
    const reclamacionRef = db().collection('reclamaciones').doc(reclId);
    
    // Obtener datos existentes o crear nuevos
    const existingDoc = await reclamacionRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    
    // Actualizar con información de archivos
    const updatedData = {
      ...existingData,
      id: reclId,
      userId: userId,
      uploadedFiles: files.map(file => ({
        fileName: file.fileName,
        storagePath: file.storagePath,
        downloadUrl: file.downloadUrl,
        size: file.size,
        contentType: file.contentType || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        extractedText: file.extractedText,
        confidence: file.confidence
      })),
      totalFiles: files.length,
      updatedAt: new Date().toISOString(),
      createdAt: existingData.createdAt || new Date().toISOString()
    };
    
    await reclamacionRef.set(updatedData, { merge: true });
    console.log(`✅ ${files.length} archivos guardados en Firestore para reclamación ${reclId}`);
    
    return updatedData;
  } catch (error: any) {
    console.error(`❌ Error guardando archivos en Firestore:`, error);
    throw error;
  }
}
