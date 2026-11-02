// F0 backfill: contract records for NDAs generated before contracts existed.
// Runs the same extraction as "Analizar como contrato" → UNCONFIRMED records (the user confirms them
// in /documents; alerts only run on confirmed ones). Dry-run by default.
//
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/contracts-backfill.ts --email someone@x.com
//   … --email someone@x.com --apply          (writes; one OpenAI call per document)
//
// Single Firebase project: this talks to PRODUCTION Firestore. Limit it with --email or --uid.

import { db } from '@/lib/firebase-admin';
import { extractContractForDocument } from '@/lib/contracts/server';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const apply = process.argv.includes('--apply');

(async () => {
  let uid = arg('--uid');
  const email = arg('--email');
  if (!uid && email) uid = (await db().collection('users').where('email', '==', email).limit(1).get()).docs[0]?.id;
  if (!uid) { console.error('Usage: --email <email> | --uid <uid> [--apply]'); process.exit(1); }

  const docs = await db().collection('documents').where('userId', '==', uid).get();
  const candidates = docs.docs.filter(d => {
    const x = d.data();
    return x.source === 'generated' && x.type === 'doc' && !x.contractId && !x.signedFromDocumentId && /(^|[_\s-])NDA([_\s.-]|$)/i.test(x.name ?? '');
  });
  console.log(`${candidates.length} generated NDA(s) without a contract record${apply ? '' : ' (dry run — add --apply to create them)'}:`);
  for (const d of candidates) {
    if (!apply) { console.log(`  · ${d.get('name')} (${d.id})`); continue; }
    try {
      const c = await extractContractForDocument(uid, d.id);
      console.log(`  ✓ ${d.get('name')} → ${c.id} · ends ${c.dates.termEndDate ?? '—'} · unconfirmed`);
    } catch (e) {
      console.log(`  ✗ ${d.get('name')}: ${(e as Error).message}`);
    }
  }
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
