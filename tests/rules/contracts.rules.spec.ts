// Firestore rules — contracts (F0) are owner read-only; notifications (F3) are owner read +
// mark-as-read only; contract_alerts / system are server-only; contract fields on documents are
// written by the server only.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

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
    await setDoc(doc(db, 'contracts/c1'), {
      userId: 'alice', documentId: 'd1', confirmedByUser: true, lifecycle: 'active',
      dates: { effectiveDate: '2026-11-02', termEndDate: '2028-11-02' },
    });
    await setDoc(doc(db, 'notifications/n1'), {
      userId: 'alice', type: 'contract_expiry', contractId: 'c1', title: 'NDA vence', readAt: null, emailed: false, createdAt: '2026-11-02T08:00:00Z',
    });
    await setDoc(doc(db, 'contract_alerts/c1_termEndDate_30'), { userId: 'alice', contractId: 'c1' });
    await setDoc(doc(db, 'documents/d1'), { userId: 'alice', name: 'NDA.doc', caseId: null, contractId: 'c1', contractConfirmed: true });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('contracts', () => {
  test('owner reads their contract and can list by userId', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'contracts/c1')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'contracts'), where('userId', '==', 'alice'))));
  });
  test('others and anonymous cannot read', async () => {
    await assertFails(getDoc(doc(as('bob'), 'contracts/c1')));
    await assertFails(getDoc(doc(as(null), 'contracts/c1')));
    await assertFails(getDocs(query(collection(as('bob'), 'contracts'), where('userId', '==', 'alice'))));
  });
  test('owner cannot create, edit or delete (dates are computed server-side)', async () => {
    await assertFails(setDoc(doc(as('alice'), 'contracts/c2'), { userId: 'alice', confirmedByUser: true }));
    await assertFails(updateDoc(doc(as('alice'), 'contracts/c1'), { 'dates.termEndDate': '2099-01-01' }));
    await assertFails(deleteDoc(doc(as('alice'), 'contracts/c1')));
  });
});

test.describe('notifications', () => {
  test('owner reads their notifications (query by userId)', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'notifications/n1')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'notifications'), where('userId', '==', 'alice'))));
  });
  test('others cannot read', async () => {
    await assertFails(getDoc(doc(as('bob'), 'notifications/n1')));
  });
  test('owner can mark as read', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'notifications/n1'), { readAt: '2026-11-02T09:00:00Z' }));
  });
  test('owner cannot change anything else, create or delete', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'notifications/n1'), { title: 'x' }));
    await assertFails(updateDoc(doc(as('alice'), 'notifications/n1'), { readAt: '2026-11-02T09:00:00Z', emailed: true }));
    await assertFails(updateDoc(doc(as('alice'), 'notifications/n1'), { readAt: 5 }));
    await assertFails(updateDoc(doc(as('bob'), 'notifications/n1'), { readAt: '2026-11-02T09:00:00Z' }));
    await assertFails(setDoc(doc(as('alice'), 'notifications/n2'), { userId: 'alice', title: 'fake' }));
    await assertFails(deleteDoc(doc(as('alice'), 'notifications/n1')));
  });
});

test.describe('server-only collections', () => {
  test('contract_alerts and system are not readable or writable', async () => {
    await assertFails(getDoc(doc(as('alice'), 'contract_alerts/c1_termEndDate_30')));
    await assertFails(setDoc(doc(as('alice'), 'contract_alerts/x'), { userId: 'alice' }));
    await assertFails(getDoc(doc(as('alice'), 'system/contract_alerts')));
  });
});

test.describe('contract fields on documents', () => {
  test('owner can still rename a contract document', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'documents/d1'), { name: 'NDA ACME.doc' }));
  });
  test('owner cannot write the contract summary', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { contractNextDate: '2099-01-01' }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { contractConfirmed: false }));
    await assertFails(setDoc(doc(as('alice'), 'documents/d2'), { userId: 'alice', name: 'x.doc', contractId: 'c1' }));
  });
});

test.describe('users/{uid}/conversations (agent history)', () => {
  test('owner reads (incl. query by case); others and clients cannot write', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users/alice/conversations/k1'), { uid: 'alice', caseId: 'c9', messages: [{ role: 'user', content: 'hola' }] });
    });
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice/conversations/k1')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'users', 'alice', 'conversations'), where('caseId', '==', 'c9'))));
    await assertFails(getDoc(doc(as('bob'), 'users/alice/conversations/k1')));
    await assertFails(setDoc(doc(as('alice'), 'users/alice/conversations/k2'), { uid: 'alice', messages: [] }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice/conversations/k1'), { messages: [] }));
  });
});
