// Firestore rules — legal-change monitoring (F2 step 1): approved changes readable by signed-in
// users, the review queue by admins only, no client writes; isAdmin can't be self-granted;
// the legal flag on documents is server-only.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

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
    await setDoc(doc(db, 'users/admin'), { email: 'a@x.com', isAdmin: true });
    await setDoc(doc(db, 'users/alice'), { email: 'alice@x.com', isAdmin: false, plan: 'Abogados' });
    await setDoc(doc(db, 'legal_changes/ok'), { status: 'approved', title: 'Ley X' });
    await setDoc(doc(db, 'legal_changes/q'), { status: 'new', title: 'Ley Y' });
    await setDoc(doc(db, 'legal_seen/boe_1'), { relevant: false });
    await setDoc(doc(db, 'documents/d1'), { userId: 'alice', name: 'NDA.doc', caseId: null, contractLegalFlag: true });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('legal_changes', () => {
  test('signed-in users read approved changes (query by status)', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'legal_changes/ok')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'legal_changes'), where('status', '==', 'approved'))));
  });
  test('the review queue is admin-only', async () => {
    await assertFails(getDoc(doc(as('alice'), 'legal_changes/q')));
    await assertFails(getDocs(query(collection(as('alice'), 'legal_changes'), where('status', '==', 'new'))));
    await assertSucceeds(getDoc(doc(as('admin'), 'legal_changes/q')));
    await assertSucceeds(getDocs(query(collection(as('admin'), 'legal_changes'), where('status', '==', 'new'))));
  });
  test('anonymous reads nothing; nobody writes from the client', async () => {
    await assertFails(getDoc(doc(as(null), 'legal_changes/ok')));
    await assertFails(updateDoc(doc(as('admin'), 'legal_changes/q'), { status: 'approved' }));
    await assertFails(setDoc(doc(as('admin'), 'legal_changes/n'), { status: 'approved' }));
    await assertFails(getDoc(doc(as('admin'), 'legal_seen/boe_1')));
  });
});

test.describe('isAdmin cannot be self-granted', () => {
  test('update and create', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { isAdmin: true }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { name: 'Alice' }));
    await assertFails(setDoc(doc(as('bob'), 'users/bob'), { email: 'b@x.com', isAdmin: true }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob'), { email: 'b@x.com', isAdmin: false }));
    await assertSucceeds(setDoc(doc(as('carol'), 'users/carol'), { email: 'c@x.com' }));
  });
});

test.describe('legal flag on documents', () => {
  test('server-only', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { contractLegalFlag: false }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'documents/d1'), { name: 'NDA 2.doc' }));
  });
});
