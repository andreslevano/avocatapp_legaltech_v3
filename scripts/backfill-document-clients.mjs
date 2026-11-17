// One-off backfill: link generated documents to their client (documents.clientId), for documents
// created before the tools saved it. Sources, only when documents.clientId is empty and the owner
// matches:
//   1. contracts/{id}      { userId, documentId, clientId }   (NDA / contrato de servicios)
//   2. data_requests/{id}  { ownerId, clientId, documentIds: { docId: documentId } }
//   3. documents with manualSignedFrom → the original's client ("firmado por ti" copies)
// Dry run by default; --apply writes. Credentials: GCP_SA_EMAIL / GCP_SA_PRIVATE_KEY (.env).
//   node scripts/backfill-document-clients.mjs [--apply]
import 'dotenv/config';
import admin from 'firebase-admin';

const apply = process.argv.includes('--apply');
admin.initializeApp({ credential: admin.credential.cert({
  projectId: 'avocat-legaltech-v3', clientEmail: process.env.GCP_SA_EMAIL,
  privateKey: (process.env.GCP_SA_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
}) });
const db = admin.firestore();
const planned = new Map();   // documentId → { clientId, from }

async function propose(documentId, clientId, owner, from) {
  if (!documentId || !clientId || planned.has(documentId)) return;
  const d = await db.collection('documents').doc(documentId).get();
  if (!d.exists || d.get('userId') !== owner || d.get('clientId')) return;
  const c = await db.collection('clients').doc(clientId).get();
  if (!c.exists || c.get('userId') !== owner) return;
  planned.set(documentId, { clientId, from, name: d.get('name'), client: c.get('name') });
}

for (const k of (await db.collection('contracts').get()).docs) {
  await propose(k.get('documentId'), k.get('clientId'), k.get('userId'), `contract ${k.id}`);
}
for (const r of (await db.collection('data_requests').get()).docs) {
  for (const documentId of Object.values(r.get('documentIds') ?? {})) await propose(documentId, r.get('clientId'), r.get('ownerId'), `data_request ${r.id}`);
}
// "firmado por ti" copies follow their original (after 1–2, so newly linked originals count too).
for (const s of (await db.collection('documents').where('manualSignedFrom', '!=', null).get()).docs) {
  const orig = await db.collection('documents').doc(s.get('manualSignedFrom')).get();
  const clientId = planned.get(orig.id)?.clientId ?? orig.get('clientId');
  await propose(s.id, clientId, s.get('userId'), `copy of ${orig.id}`);
}

for (const [id, p] of planned) console.log(`${apply ? 'LINK' : 'would link'} ${p.name} → ${p.client}  (${p.from}, doc ${id})`);
if (apply && planned.size) {
  const batch = db.batch();
  for (const [id, p] of planned) batch.update(db.collection('documents').doc(id), { clientId: p.clientId });
  await batch.commit();
}
console.log(`${planned.size} document(s) ${apply ? 'linked' : 'to link (dry run; --apply to write)'}.`);
process.exit(0);
