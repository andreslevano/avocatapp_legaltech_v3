// Firestore rules — DocuSign Phase 2: signature_requests is owner read-only; signature state on
// documents (D11 lock) can only be written by the server.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test } from '@playwright/test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
    await setDoc(doc(db, 'signature_requests/r1'), {
      userId: 'alice', documentId: 'd1', envelopeId: 'e1', status: 'pending_owner', webhookTokenHash: 'h',
    });
    await setDoc(doc(db, 'documents/d1'), {
      userId: 'alice', name: 'NDA.doc', caseId: null,
      signatureRequestId: 'r1', signatureStatus: 'pending_owner', lockedAt: new Date(), kind: 'original',
    });
    await setDoc(doc(db, 'documents/d2'), { userId: 'alice', name: 'Otro.doc', caseId: null });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test.describe('signature_requests', () => {
  test('owner can read their request', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'signature_requests/r1')));
  });
  test('other users and anonymous cannot read', async () => {
    await assertFails(getDoc(doc(as('bob'), 'signature_requests/r1')));
    await assertFails(getDoc(doc(as(null), 'signature_requests/r1')));
  });
  test('owner cannot create, update or delete (server only)', async () => {
    await assertFails(setDoc(doc(as('alice'), 'signature_requests/r2'), { userId: 'alice', status: 'completed' }));
    await assertFails(updateDoc(doc(as('alice'), 'signature_requests/r1'), { status: 'completed' }));
    await assertFails(setDoc(doc(as('alice'), 'signature_requests/r1'), { userId: 'alice', status: 'completed' }));
  });
});

test.describe('documents signature fields (D11 lock)', () => {
  test('owner can still rename a document that is out for signature', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'documents/d1'), { name: 'NDA ACME.doc' }));
  });
  test('owner cannot unlock or fake a signature status', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { lockedAt: deleteField() }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { signatureStatus: 'completed' }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { signatureRequestId: 'other' }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d1'), { kind: 'signed' }));
  });
  test('owner cannot add signature fields to an unlocked document', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'documents/d2'), { signatureStatus: 'completed' }));
    await assertFails(updateDoc(doc(as('alice'), 'documents/d2'), { signedFromDocumentId: 'd1' }));
  });
  test('cannot create a document that already carries signature fields', async () => {
    await assertFails(setDoc(doc(as('alice'), 'documents/d3'), { userId: 'alice', name: 'x', kind: 'signed' }));
    await assertSucceeds(setDoc(doc(as('alice'), 'documents/d3'), { userId: 'alice', name: 'x', caseId: null }));
  });
});
