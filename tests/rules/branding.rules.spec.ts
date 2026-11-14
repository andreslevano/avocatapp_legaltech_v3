// Firestore rules — users/{uid}.branding (document branding): exact shape and validated values.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

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
    await setDoc(doc(ctx.firestore(), 'users/alice'), { name: 'Alice', plan: 'Abogados', isAdmin: false });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const URL = 'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/users%2Falice%2Fbranding%2Flogo.png?alt=media&token=abc';
const valid = () => ({
  logoUrl: URL, logoPath: 'users/alice/branding/logo.png', logoWidth: 600, logoHeight: 200, logoPosition: 'left',
  colors: { primary: '#1f3a5f', secondary: '#5B6B7F' }, font: 'lato', applyColorsToHeadings: false,
  updatedAt: serverTimestamp(),
});
const save = (uid: string, branding: unknown) => updateDoc(doc(as(uid), `users/${uid === 'bob' ? 'alice' : uid}`), { branding });

test.describe('users.branding', () => {
  test('owner can save valid branding, with and without a logo', async () => {
    await assertSucceeds(save('alice', valid()));
    await assertSucceeds(save('alice', { ...valid(), logoUrl: null, logoPath: null, logoWidth: 0, logoHeight: 0 }));
  });
  test('other profile fields still writable alongside', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { phone: '600', branding: valid() }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { phone: '601' }));
  });
  test('another user cannot write it', async () => {
    await assertFails(save('bob', valid()));
  });
  const bad: Record<string, (b: ReturnType<typeof valid>) => unknown> = {
    'non-hex primary': b => ({ ...b, colors: { ...b.colors, primary: 'red' } }),
    'css injection colour': b => ({ ...b, colors: { ...b.colors, secondary: '#000000;}' } }),
    'unknown font': b => ({ ...b, font: 'comic-sans' }),
    'extra key': b => ({ ...b, script: '<x>' }),
    'extra colour key': b => ({ ...b, colors: { ...b.colors, tertiary: '#000000' } }),
    'missing key': b => { const { font: _f, ...rest } = b; return rest; },
    'bad position': b => ({ ...b, logoPosition: 'center' }),
    'other user logo path': b => ({ ...b, logoPath: 'users/bob/branding/logo.png' }),
    'svg logo path': b => ({ ...b, logoPath: 'users/alice/branding/logo.svg' }),
    'foreign logo url': b => ({ ...b, logoUrl: 'https://evil.com/logo.png' }),
    'other user logo url': b => ({ ...b, logoUrl: URL.replace('alice', 'bob') }),
    'string width': b => ({ ...b, logoWidth: '600' }),
    'huge height': b => ({ ...b, logoHeight: 1e9 }),
    'non-bool toggle': b => ({ ...b, applyColorsToHeadings: 'yes' }),
    'not a map': () => 'branding',
  };
  for (const [name, mutate] of Object.entries(bad)) {
    test(`rejects ${name}`, async () => { await assertFails(save('alice', mutate(valid()))); });
  }
  test('create with invalid branding is rejected, valid accepted', async () => {
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { name: 'C', branding: { font: 'x' } }));
    await assertSucceeds(setDoc(doc(as('dave'), 'users/dave'), {
      name: 'D', branding: { ...valid(), logoUrl: null, logoPath: null },
    }));
  });
});
