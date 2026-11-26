// Firestore rules — billing fields on users/{uid} are server-only (Precios v4: credits, planTier,
// welcome credits), at creation as well as on update.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

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
  await assertSucceeds(setDoc(doc(as('ana'), 'users/ana'), { name: 'Ana', plan: 'Autoservicio', isAdmin: false, createdAt: serverTimestamp() }));
});

for (const field of ['creditos_disponibles', 'creditos_consumidos', 'stripe_customer_id', 'planTier', 'welcomeCreditsGranted', 'billing']) {
  test(`client cannot set ${field} at creation or later`, async () => {
    await assertFails(setDoc(doc(as('eve'), 'users/eve'), { name: 'Eve', createdAt: serverTimestamp(), [field]: field === 'planTier' ? 'EmpresaNegocio' : 9999 }));
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'users/bob'), { name: 'Bob' }); });
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { [field]: field === 'planTier' ? 'EmpresaNegocio' : 9999 }));
  });
}

test('createdAt: must be the server time at signup and can never be changed (payment enforcement cutoff)', async () => {
  await assertFails(setDoc(doc(as('eve'), 'users/eve'), { name: 'Eve', plan: 'Abogados' }));                                          // missing
  await assertFails(setDoc(doc(as('eve'), 'users/eve'), { name: 'Eve', plan: 'Abogados', createdAt: Timestamp.fromDate(new Date('2025-01-01')) })); // backdated
  await assertSucceeds(setDoc(doc(as('eve'), 'users/eve'), { name: 'Eve', plan: 'Abogados', createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('eve'), 'users/eve'), { createdAt: Timestamp.fromDate(new Date('2025-01-01')) }));
  await assertSucceeds(updateDoc(doc(as('eve'), 'users/eve'), { plan: 'Estudiantes' }));
});
