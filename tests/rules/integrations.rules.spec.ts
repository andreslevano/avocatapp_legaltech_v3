// Firestore rules — F1: users.integrations is server-only; integration_secrets is never client-readable.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ALICE = 'alice';
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
    await setDoc(doc(db, 'users/alice'), {
      name: 'Alice', plan: 'Abogados',
      integrations: { microsoft: { email: 'a@contoso.com', status: 'connected' } },
    });
    await setDoc(doc(db, 'integration_secrets/alice'), { microsoft: { refreshToken: 'v1.enc' } });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('users.integrations', () => {
  test('owner can read their integration display info', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'users/alice')));
  });
  test('owner can still update normal profile fields', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'users/alice'), { name: 'Alice B.' }));
  });
  test('owner cannot write integrations (spoof a connection or status)', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { 'integrations.microsoft.status': 'reauth_required' }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { 'integrations.microsoft.email': 'spoof@evil.com' }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { integrations: {} }));
  });
  test('cannot create a user doc that already carries integrations', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users/bob'), { name: 'Bob', integrations: { microsoft: { email: 'x' } } }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob'), { name: 'Bob' }));
  });
});

test.describe('integration_secrets', () => {
  test('owner cannot read or write their own secrets', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'integration_secrets/alice')));
    await assertFails(setDoc(doc(as(ALICE), 'integration_secrets/alice'), { microsoft: { refreshToken: 'x' } }));
  });
  test('other users and anonymous cannot read', async () => {
    await assertFails(getDoc(doc(as('bob'), 'integration_secrets/alice')));
    await assertFails(getDoc(doc(as(null), 'integration_secrets/alice')));
  });
});
