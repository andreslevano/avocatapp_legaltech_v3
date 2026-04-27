import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Types ──────────────────────────────────────────────────────────

export type CaseType =
  | 'civil'
  | 'laboral'
  | 'contractual'
  | 'familia'
  | 'penal'
  | 'sucesoral'
  | 'otro';

export type CaseStatus = 'active' | 'urgent' | 'closed' | 'archived';

export interface DocumentRef {
  name: string;
  type: string;     // file extension: 'pdf', 'txt', 'docx'
  size: number;     // bytes
  strategy: string; // 'text-pdf' | 'ocr' | 'txt' | 'docx' | 'unsupported'
}

export interface CaseAssessment {
  resumen: string;
  partes: string[];
  riesgos: string[];
  puntosClave: string[];
  fechasClave: string[];
}

export interface CaseDoc {
  id: string;
  userId: string;
  title: string;
  type: CaseType;
  status: CaseStatus;
  ref: string;
  client: string;
  deadline: Timestamp | null;
  documents: string[];
  documentRefs?: DocumentRef[];   // metadata of uploaded files
  assessment?: CaseAssessment;    // AI analysis from intake
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClientDoc {
  id: string;
  userId: string;
  name: string;
  email: string;
  activeCases: number;
  lastCaseDate: Timestamp;
  status: 'active' | 'inactive';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; result: string }[];
  timestamp: Timestamp;
}

export interface ConversationDoc {
  id: string;
  userId: string;
  caseId: string | null;
  messages: ConversationMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Helpers ────────────────────────────────────────────────────────

function tsSeconds(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    return (ts as Timestamp).seconds;
  }
  return 0;
}

// ── Cases ──────────────────────────────────────────────────────────

export async function getCases(userId: string): Promise<CaseDoc[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'cases'), where('userId', '==', userId))
  );
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseDoc));
  return docs.sort((a, b) => tsSeconds(b.updatedAt) - tsSeconds(a.updatedAt));
}

export async function getCase(caseId: string): Promise<CaseDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'cases', caseId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CaseDoc) : null;
}

export async function createCase(
  userId: string,
  data: Pick<CaseDoc, 'title' | 'type' | 'status' | 'ref' | 'client' | 'notes'> & {
    deadline?: Timestamp | null;
    assessment?: CaseAssessment;
    documentRefs?: DocumentRef[];
  }
): Promise<string> {
  if (!db) throw new Error('Firestore not available');
  const { assessment, documentRefs, ...rest } = data;
  const payload: Record<string, unknown> = {
    ...rest,
    userId,
    documents: [],
    deadline: data.deadline ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (assessment)    payload.assessment    = assessment;
  if (documentRefs?.length) payload.documentRefs = documentRefs;
  const firestoreRef = await addDoc(collection(db, 'cases'), payload);
  return firestoreRef.id;
}

export async function updateCase(
  caseId: string,
  data: Partial<Omit<CaseDoc, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not available');
  await updateDoc(doc(db, 'cases', caseId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCase(caseId: string): Promise<void> {
  if (!db) throw new Error('Firestore not available');
  await deleteDoc(doc(db, 'cases', caseId));
}

// ── Clients ────────────────────────────────────────────────────────

export async function getClients(userId: string): Promise<ClientDoc[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'clients'), where('userId', '==', userId))
  );
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientDoc));
  return docs.sort((a, b) => tsSeconds(b.lastCaseDate) - tsSeconds(a.lastCaseDate));
}

// ── Conversations ──────────────────────────────────────────────────

export async function getConversations(
  userId: string,
  caseId?: string
): Promise<ConversationDoc[]> {
  if (!db) return [];
  const constraints = caseId
    ? [where('userId', '==', userId), where('caseId', '==', caseId)]
    : [where('userId', '==', userId)];
  const snap = await getDocs(query(collection(db, 'conversations'), ...constraints));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConversationDoc));
  return docs.sort((a, b) => tsSeconds(b.updatedAt) - tsSeconds(a.updatedAt));
}

// ── User ───────────────────────────────────────────────────────────

export async function getUserDoc(uid: string) {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}
