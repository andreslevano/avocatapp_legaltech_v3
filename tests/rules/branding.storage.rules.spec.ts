// Storage rules — users/{uid}/branding/logo.<ext>: owner only, PNG/JPG/WebP, < 1 MB, no SVG.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

let env: RulesTestEnvironment;

test.beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-avocat',
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8'), host, port: Number(port) },
  });
});
test.afterAll(async () => { await env?.cleanup(); });
test.beforeEach(async () => { await env.clearStorage(); });

const bucket = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
const put = (uid: string | null, path: string, size: number, contentType: string) =>
  bucket(uid).ref(path).put(new Uint8Array(size), { contentType }).then(() => undefined);

test.describe('branding logo', () => {
  test('owner uploads png / jpg / webp logo and reads it back', async () => {
    await assertSucceeds(put('alice', 'users/alice/branding/logo.png', 1000, 'image/png'));
    await assertSucceeds(put('alice', 'users/alice/branding/logo.jpg', 1000, 'image/jpeg'));
    await assertSucceeds(put('alice', 'users/alice/branding/logo.webp', 1000, 'image/webp'));
    await assertSucceeds(bucket('alice').ref('users/alice/branding/logo.png').getMetadata());
    await assertSucceeds(bucket('alice').ref('users/alice/branding/logo.png').delete());
  });
  test('rejects svg, oversized, mismatched type, other names, other users', async () => {
    await assertFails(put('alice', 'users/alice/branding/logo.svg', 100, 'image/svg+xml'));
    await assertFails(put('alice', 'users/alice/branding/logo.png', 100, 'image/svg+xml'));
    await assertFails(put('alice', 'users/alice/branding/logo.png', 1024 * 1024 + 1, 'image/png'));
    await assertFails(put('alice', 'users/alice/branding/logo.png', 100, 'text/html'));
    await assertFails(put('alice', 'users/alice/branding/evil.png', 100, 'image/png'));
    await assertFails(put('alice', 'users/alice/branding/sub/logo.png', 100, 'image/png'));
    await assertFails(put('bob', 'users/alice/branding/logo.png', 100, 'image/png'));
    await assertFails(put(null, 'users/alice/branding/logo.png', 100, 'image/png'));
  });
  test('other users/{uid}/ paths keep working for the owner only', async () => {
    await assertSucceeds(put('alice', 'users/alice/firma/signature.png', 100, 'image/png'));
    await assertSucceeds(put('alice', 'users/alice/abogado/generacion-escritos/1_x.doc', 5 * 1024 * 1024, 'application/msword'));
    await assertFails(put('bob', 'users/alice/firma/signature.png', 100, 'image/png'));
  });
});
