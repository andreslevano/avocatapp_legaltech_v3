// Firestore rules — waitlist is server-only (POST /api/waitlist with the Admin SDK).
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

test('nobody reads or writes the waitlist from the client', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'waitlist/w1'), { email: 'a@b.es', country: 'CL' }); });
  for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext('alice')]) {
    await assertFails(getDoc(doc(ctx.firestore(), 'waitlist/w1')));
    await assertFails(setDoc(doc(ctx.firestore(), 'waitlist/w2'), { email: 'x@y.es', country: 'MX' }));
  }
});
