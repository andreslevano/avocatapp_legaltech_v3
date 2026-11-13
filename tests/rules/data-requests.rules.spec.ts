// Firestore rules — data_requests ("Solicitar datos al cliente"): the owner reads their own requests;
// nobody else reads them and no client SDK writes them (the server uses the Admin SDK).
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
    await setDoc(doc(ctx.firestore(), 'data_requests/r1'), {
      ownerId: 'alice', orgId: null, clientId: 'c1', clientEmail: 'cli@x.com', status: 'enviada', tokenHash: 'h',
    });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('data_requests', () => {
  test('the owner reads their request (by id and by query)', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'data_requests/r1')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'data_requests'), where('ownerId', '==', 'alice'))));
  });
  test('another user and anonymous visitors cannot read it', async () => {
    await assertFails(getDoc(doc(as('bob'), 'data_requests/r1')));
    await assertFails(getDocs(collection(as('bob'), 'data_requests')));
    await assertFails(getDoc(doc(as(null), 'data_requests/r1')));
    await assertFails(getDocs(query(collection(as(null), 'data_requests'), where('tokenHash', '==', 'h'))));
  });
  test('no client writes, not even the owner', async () => {
    await assertFails(setDoc(doc(as('alice'), 'data_requests/r2'), { ownerId: 'alice', status: 'enviada' }));
    await assertFails(updateDoc(doc(as('alice'), 'data_requests/r1'), { status: 'completada' }));
    await assertFails(deleteDoc(doc(as('alice'), 'data_requests/r1')));
    await assertFails(setDoc(doc(as(null), 'data_requests/r3'), { ownerId: 'x' }));
  });
});
