// Firestore rules — Yousign server-only collections: webhook events and counterparty invites.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    await setDoc(doc(ctx.firestore(), 'signature_webhook_events/e1'), { eventName: 'signer.done', externalId: 'r1' });
    await setDoc(doc(ctx.firestore(), 'signature_invites/h1'), { requestId: 'r1', userId: 'alice', email: 'x@y.es' });
  });
});
const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test('webhook events and invites: no client reads or writes, not even the owner', async () => {
  for (const who of ['alice', 'bob', null]) {
    await assertFails(getDoc(doc(as(who), 'signature_webhook_events/e1')));
    await assertFails(getDoc(doc(as(who), 'signature_invites/h1')));
    await assertFails(setDoc(doc(as(who), 'signature_webhook_events/e2'), { eventName: 'x' }));
    await assertFails(setDoc(doc(as(who), 'signature_invites/h2'), { requestId: 'r1', userId: 'alice' }));
  }
});
