// Firestore rules — billing fields on users/{uid} are server-only (Precios v4: credits, planTier,
// welcome credits), at creation as well as on update.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
test.beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-avocat',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host, port: Number(port) },
  });
});
test.afterAll(async () => { await env?.cleanup(); });
test.beforeEach(async () => { await env.clearFirestore(); });

const as = (uid: string) => env.authenticatedContext(uid).firestore();

test('signup can create a normal profile', async () => {
  await assertSucceeds(setDoc(doc(as('ana'), 'users/ana'), { name: 'Ana', plan: 'Autoservicio', isAdmin: false }));
});

for (const field of ['creditos_disponibles', 'creditos_consumidos', 'stripe_customer_id', 'planTier', 'welcomeCreditsGranted']) {
  test(`client cannot set ${field} at creation or later`, async () => {
    await assertFails(setDoc(doc(as('eve'), 'users/eve'), { name: 'Eve', [field]: field === 'planTier' ? 'EmpresaNegocio' : 9999 }));
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'users/bob'), { name: 'Bob' }); });
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { [field]: field === 'planTier' ? 'EmpresaNegocio' : 9999 }));
  });
}
