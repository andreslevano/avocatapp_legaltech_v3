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
