// Firestore rules — negotiations (NDA negotiation before signature): the owner reads the negotiation,
// its versions and events; nobody else reads them and no client SDK writes them (Admin SDK only).
// documents.negotiation is server-only: the owner can't remove it to sign a draft.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

test.beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-avocat',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host, port: Number(port) },
  });
});
test.afterAll(async () => { await env?.cleanup(); });
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'negotiations/n1'), { ownerId: 'alice', status: 'en_revision', tokenHashes: ['h'] });
    await setDoc(doc(db, 'negotiations/n1/versions/1'), { n: 1, markdown: '# NDA' });
    await setDoc(doc(db, 'negotiations/n1/events/e1'), { type: 'created' });
    await setDoc(doc(db, 'documents/d1'), { userId: 'alice', name: 'NDA.doc', negotiation: { id: 'n1', status: 'en_revision', role: 'draft' } });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('negotiations', () => {
  test('the owner reads the negotiation, its versions and events', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'negotiations/n1')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'negotiations'), where('ownerId', '==', 'alice'))));
    await assertSucceeds(getDoc(doc(as('alice'), 'negotiations/n1/versions/1')));
    await assertSucceeds(getDocs(collection(as('alice'), 'negotiations/n1/events')));
  });
  test('another user and anonymous visitors cannot read anything', async () => {
    await assertFails(getDoc(doc(as('bob'), 'negotiations/n1')));
    await assertFails(getDoc(doc(as('bob'), 'negotiations/n1/versions/1')));
    await assertFails(getDocs(collection(as('bob'), 'negotiations/n1/events')));
    await assertFails(getDoc(doc(as(null), 'negotiations/n1')));
    await assertFails(getDocs(query(collection(as(null), 'negotiations'), where('tokenHashes', 'array-contains', 'h'))));
  });
  test('no client writes, not even the owner', async () => {
    await assertFails(setDoc(doc(as('alice'), 'negotiations/n2'), { ownerId: 'alice', status: 'en_revision' }));
    await assertFails(updateDoc(doc(as('alice'), 'negotiations/n1'), { status: 'acordado' }));
    await assertFails(deleteDoc(doc(as('alice'), 'negotiations/n1')));
    await assertFails(setDoc(doc(as('alice'), 'negotiations/n1/versions/2'), { n: 2 }));
    await assertFails(setDoc(doc(as('alice'), 'negotiations/n1/events/e2'), { type: 'accepted' }));
  });
  test('documents.negotiation is server-only', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { negotiation: deleteField() }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { negotiation: { id: 'n1', status: 'acordado', role: 'final' } }));
    await assertFails(setDoc(doc(as('alice'), 'documents/d2'), { userId: 'alice', name: 'x.doc', negotiation: { id: 'n1', status: 'acordado', role: 'final' } }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'documents/d1'), { name: 'Renombrado.doc' }));
  });
});
