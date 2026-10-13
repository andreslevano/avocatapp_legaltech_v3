// Firestore rules — D1 folders + documents.folderId.
// Run with: npm run test:rules   (starts the Firestore emulator via `firebase emulators:exec`)
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const ALICE = 'alice';
const BOB = 'bob';

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
  // Seed: Alice has A (depth 1) › A1 (depth 2) and a depth-8 chain; Bob has B.
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'folders/A'),  { userId: ALICE, name: 'A',  parentId: null, ancestors: [],    depth: 1 });
    await setDoc(doc(db, 'folders/A1'), { userId: ALICE, name: 'A1', parentId: 'A',  ancestors: ['A'], depth: 2 });
    const chain: string[] = [];
    for (let d = 1; d <= 8; d++) {
      const id = `D${d}`;
      await setDoc(doc(db, `folders/${id}`), {
        userId: ALICE, name: id, parentId: chain.length ? chain[chain.length - 1] : null, ancestors: [...chain], depth: d,
      });
      chain.push(id);
    }
    await setDoc(doc(db, 'folders/B'), { userId: BOB, name: 'B', parentId: null, ancestors: [], depth: 1 });
    await setDoc(doc(db, 'documents/legacy'), { userId: ALICE, name: 'NDA.pdf', caseId: null }); // no folderId
    await setDoc(doc(db, 'documents/inA'),    { userId: ALICE, name: 'x.pdf', caseId: null, folderId: 'A' });
    await setDoc(doc(db, 'documents/bobDoc'), { userId: BOB,   name: 'b.pdf', caseId: null, folderId: 'B' });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const root = (name: string, extra: Record<string, unknown> = {}) =>
  ({ userId: ALICE, name, parentId: null, ancestors: [], depth: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra });

// ── folders: read ─────────────────────────────────────────────────

test.describe('folders — read', () => {
  test('owner can read own folder', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'folders/A')));
  });
  test('other user cannot read', async () => {
    await assertFails(getDoc(doc(as(BOB), 'folders/A')));
  });
  test('unauthenticated cannot read', async () => {
    await assertFails(getDoc(doc(as(null), 'folders/A')));
  });
});

// ── folders: create ───────────────────────────────────────────────

test.describe('folders — create', () => {
  test('owner creates a top-level folder', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'folders/new'), root('Clientes')));
  });
  test('cannot create a folder for another user', async () => {
    await assertFails(setDoc(doc(as(BOB), 'folders/new'), root('Clientes')));
  });
  test('unauthenticated cannot create', async () => {
    await assertFails(setDoc(doc(as(null), 'folders/new'), root('Clientes')));
  });

  for (const bad of ['', 'a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b', ' padded', '..', 'x'.repeat(121)]) {
    test(`rejects invalid name ${JSON.stringify(bad.length > 20 ? `${bad.length} chars` : bad)}`, async () => {
      await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root(bad)));
    });
  }
  test('accepts accents, spaces and dots inside the name', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'folders/new'), root('Acme S.L. — Contratos 2026')));
  });

  test('rejects unknown fields (e.g. client-set source)', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('X', { source: { provider: 'microsoft' } })));
  });
  test('rejects missing required fields', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), { userId: ALICE, name: 'X', parentId: null }));
  });
  test('top-level folder must have depth 1 and no ancestors', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('X', { depth: 2 })));
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('X', { ancestors: ['A'] })));
  });

  test('child with ancestors = parent.ancestors + parent and depth + 1', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'folders/new'), root('Sub', { parentId: 'A1', ancestors: ['A', 'A1'], depth: 3 })));
  });
  test('child with wrong ancestors is rejected', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('Sub', { parentId: 'A1', ancestors: ['A1'], depth: 3 })));
  });
  test('child with wrong depth is rejected', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('Sub', { parentId: 'A1', ancestors: ['A', 'A1'], depth: 2 })));
  });
  test("cannot create inside another user's folder", async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('Sub', { parentId: 'B', ancestors: ['B'], depth: 2 })));
  });
  test('cannot create under a non-existent parent', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'folders/new'), root('Sub', { parentId: 'nope', ancestors: ['nope'], depth: 2 })));
  });
  test('depth 8 is allowed, depth 9 is rejected', async () => {
    const chain7 = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
    // D7 is at depth 7 → its child is depth 8 (allowed)
    await assertSucceeds(setDoc(doc(as(ALICE), 'folders/ok8'), root('ok', { parentId: 'D7', ancestors: chain7, depth: 8 })));
    // D8 is at depth 8 → its child would be depth 9
    await assertFails(setDoc(doc(as(ALICE), 'folders/bad9'), root('bad', { parentId: 'D8', ancestors: [...chain7, 'D8'], depth: 9 })));
  });
});

// ── folders: update / move / delete ──────────────────────────────

test.describe('folders — update & delete', () => {
  test('owner can rename', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'folders/A'), { name: 'Clientes', updatedAt: serverTimestamp() }));
  });
  test('rename to an invalid name is rejected', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A'), { name: 'a/b' }));
  });
  test('other user cannot rename', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'folders/A'), { name: 'hack' }));
  });
  test('client cannot move a folder (parentId/ancestors/depth are server-only) — prevents cycles', async () => {
    // A → inside its own child A1 would be a cycle
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A'), { parentId: 'A1', ancestors: ['A', 'A1'], depth: 3 }));
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A1'), { parentId: null }));
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A1'), { ancestors: [] }));
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A1'), { depth: 1 }));
  });
  test('client cannot change userId', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'folders/A'), { userId: BOB }));
  });
  test('client cannot delete folders (server route only)', async () => {
    await assertFails(deleteDoc(doc(as(ALICE), 'folders/A')));
  });
});

// ── documents.folderId ────────────────────────────────────────────

test.describe('documents — folderId', () => {
  const newDoc = (extra: Record<string, unknown> = {}) =>
    ({ userId: ALICE, name: 'n.pdf', caseId: null, source: 'uploaded', ...extra });

  test('create without folderId (legacy shape) is allowed', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'documents/n'), newDoc()));
  });
  test('create with folderId null is allowed', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'documents/n'), newDoc({ folderId: null })));
  });
  test('create in own folder is allowed', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'documents/n'), newDoc({ folderId: 'A1' })));
  });
  test("create in another user's folder is rejected", async () => {
    await assertFails(setDoc(doc(as(ALICE), 'documents/n'), newDoc({ folderId: 'B' })));
  });
  test('create in a non-existent folder is rejected', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'documents/n'), newDoc({ folderId: 'nope' })));
  });

  test('move legacy doc into own folder', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'documents/legacy'), { folderId: 'A' }));
  });
  test('move doc back to root', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'documents/inA'), { folderId: null }));
  });
  test("move doc into another user's folder is rejected", async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'documents/inA'), { folderId: 'B' }));
  });
  test('folderId must be a string or null', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'documents/inA'), { folderId: 42 }));
  });
  test('updates that do not touch folderId still work on legacy docs', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'documents/legacy'), { name: 'NDA_v2.pdf', caseId: 'c1' }));
  });
  test('cannot reassign a document to another user', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'documents/legacy'), { userId: BOB }));
  });
  test("other user cannot read or move someone else's document", async () => {
    await assertFails(getDoc(doc(as(BOB), 'documents/inA')));
    await assertFails(updateDoc(doc(as(BOB), 'documents/inA'), { folderId: 'B' }));
  });
});
