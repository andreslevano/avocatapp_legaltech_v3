import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  collection, addDoc, serverTimestamp, query, where, getDocs,
  updateDoc, deleteDoc, doc as firestoreDoc, getDoc,
} from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

export interface DocumentRecord {
  id: string;
  userId: string;
  caseId: string | null;
  clientId?: string | null;
  status?: 'Borrador' | 'Generado' | 'Firmado' | 'Enviado';
  name: string;
  type: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  pdfDownloadUrl?: string;
  source?: 'generated' | 'uploaded';
  createdAt: unknown;
}

const PLAN_FOLDER: Record<string, string> = {
  Abogados: 'abogado',
  Estudiantes: 'estudiante',
  Autoservicio: 'autoservicio',
};

export async function saveDocumentToStorage(params: {
  userId: string;
  plan: string;
  blob: Blob;
  name: string;
  caseId?: string | null;
  source?: 'generated' | 'uploaded';
  pdfBlob?: Blob;
}): Promise<DocumentRecord> {
  const { userId, plan, blob, name, caseId, source = 'generated', pdfBlob } = params;
  if (!storage || !db) throw new Error('Firebase no disponible');

  const userType = PLAN_FOLDER[plan] ?? 'autoservicio';
  const subFolder = caseId ? `casos/${caseId}` : 'generacion-escritos';
  const ts = Date.now();
  const storagePath = `users/${userId}/${userType}/${subFolder}/${ts}_${name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const downloadUrl = await getDownloadURL(storageRef);

  // Upload PDF version alongside if provided
  let pdfDownloadUrl: string | undefined;
  if (pdfBlob) {
    const pdfName = name.replace(/\.[^.]+$/, '.pdf');
    const pdfPath = `users/${userId}/${userType}/${subFolder}/${ts}_${pdfName}`;
    const pdfRef = ref(storage, pdfPath);
    await uploadBytes(pdfRef, pdfBlob, { contentType: 'application/pdf' });
    pdfDownloadUrl = await getDownloadURL(pdfRef);
  }

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const firestorePayload: Record<string, unknown> = {
    userId,
    caseId: caseId ?? null,
    name,
    type: ext,
    size: blob.size,
    storagePath,
    downloadUrl,
    source,
    createdAt: serverTimestamp(),
  };
  if (pdfDownloadUrl) firestorePayload.pdfDownloadUrl = pdfDownloadUrl;

  const docRef = await addDoc(collection(db, 'documents'), firestorePayload);

  return {
    id: docRef.id,
    userId,
    caseId: caseId ?? null,
    name,
    type: ext,
    size: blob.size,
    storagePath,
    downloadUrl,
    pdfDownloadUrl,
    source,
    createdAt: null,
  };
}

export async function uploadDocument(
  userId: string,
  file: File,
  caseId?: string | null
): Promise<DocumentRecord> {
  if (!storage || !db) throw new Error('Firebase no disponible');

  const ext = file.name.split('.').pop() ?? '';
  const storagePath = `users/${userId}/documents/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);

  const docRef = await addDoc(collection(db, 'documents'), {
    userId,
    caseId: caseId ?? null,
    name: file.name,
    type: ext.toLowerCase(),
    size: file.size,
    storagePath,
    downloadUrl,
    source: 'uploaded',
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    userId,
    caseId: caseId ?? null,
    name: file.name,
    type: ext.toLowerCase(),
    size: file.size,
    storagePath,
    downloadUrl,
    source: 'uploaded',
    createdAt: null,
  };
}

function sortByCreatedAt(docs: DocumentRecord[]): DocumentRecord[] {
  return docs.sort((a, b) => {
    const aTs = (a.createdAt as { seconds?: number } | null)?.seconds ?? 0;
    const bTs = (b.createdAt as { seconds?: number } | null)?.seconds ?? 0;
    return bTs - aTs;
  });
}

export async function getUserDocuments(userId: string): Promise<DocumentRecord[]> {
  if (!db) return [];
  // No orderBy — avoids composite index requirement; sort client-side instead
  const q = query(
    collection(db, 'documents'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentRecord));
  return sortByCreatedAt(docs);
}

export async function getCaseDocuments(userId: string, caseId: string): Promise<DocumentRecord[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'documents'),
    where('userId', '==', userId),
    where('caseId', '==', caseId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentRecord));
  return sortByCreatedAt(docs);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getDocumentById(docId: string): Promise<DocumentRecord | null> {
  if (!db) return null;
  const snap = await getDoc(firestoreDoc(db, 'documents', docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DocumentRecord;
}

export async function updateDocumentMeta(
  docId: string,
  patch: { name?: string; caseId?: string | null; clientId?: string | null; status?: string },
): Promise<void> {
  if (!db) return;
  await updateDoc(firestoreDoc(db, 'documents', docId), patch);
}

export async function deleteDocumentRecord(docId: string, storagePath: string): Promise<void> {
  if (!db) return;
  await Promise.all([
    deleteDoc(firestoreDoc(db, 'documents', docId)),
    storage ? deleteObject(ref(storage, storagePath)).catch(() => {}) : Promise.resolve(),
  ]);
}
