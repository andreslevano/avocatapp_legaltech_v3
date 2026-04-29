import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection, addDoc, serverTimestamp, query, where, getDocs, orderBy
} from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

export interface DocumentRecord {
  id: string;
  userId: string;
  caseId: string | null;
  name: string;
  type: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
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
}): Promise<DocumentRecord> {
  const { userId, plan, blob, name, caseId, source = 'generated' } = params;
  if (!storage || !db) throw new Error('Firebase no disponible');

  const userType = PLAN_FOLDER[plan] ?? 'autoservicio';
  const subFolder = caseId ? `casos/${caseId}` : 'generacion-escritos';
  const storagePath = `users/${userId}/${userType}/${subFolder}/${Date.now()}_${name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const downloadUrl = await getDownloadURL(storageRef);

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const docRef = await addDoc(collection(db, 'documents'), {
    userId,
    caseId: caseId ?? null,
    name,
    type: ext,
    size: blob.size,
    storagePath,
    downloadUrl,
    source,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    userId,
    caseId: caseId ?? null,
    name,
    type: ext,
    size: blob.size,
    storagePath,
    downloadUrl,
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

export async function getUserDocuments(userId: string): Promise<DocumentRecord[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'documents'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentRecord));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
