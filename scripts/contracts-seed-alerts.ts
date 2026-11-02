// F3 QA: seeds four confirmed test contracts ending in +90/+30/+7/0 days for one user, each with
// a placeholder document "[PRUEBA] NDA +Nd" (no file). Then run the scan for that user
// (/notifications → "Revisar ahora", or POST /api/admin/contract-alerts) and expect exactly one
// notification per contract; running it again must create nothing new. Dry-run by default.
//
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/contracts-seed-alerts.ts --email someone@x.com [--apply]
//   … --email someone@x.com --clean --apply      (removes the seeded contracts, documents, alerts, notifications)
//
// Single Firebase project: this writes to PRODUCTION Firestore.

import { db } from '@/lib/firebase-admin';
import { addDays, madridToday } from '@/lib/contracts/dates';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const apply = process.argv.includes('--apply');
const clean = process.argv.includes('--clean');
const OFFSETS = [90, 30, 7, 0];

(async () => {
  let uid = arg('--uid');
  const email = arg('--email');
  if (!uid && email) uid = (await db().collection('users').where('email', '==', email).limit(1).get()).docs[0]?.id;
  if (!uid) { console.error('Usage: --email <email> | --uid <uid> [--clean] [--apply]'); process.exit(1); }

  if (clean) {
    const [cs, ds] = await Promise.all([
      db().collection('contracts').where('userId', '==', uid).where('seed', '==', true).get(),
      db().collection('documents').where('userId', '==', uid).where('seed', '==', true).get(),
    ]);
    const ids = cs.docs.map(d => d.id);
    const ns = ids.length ? await db().collection('notifications').where('userId', '==', uid).where('contractId', 'in', ids.slice(0, 30)).get() : null;
    const as = ids.length ? await db().collection('contract_alerts').where('contractId', 'in', ids.slice(0, 30)).get() : null;
    const refs = [...cs.docs, ...ds.docs, ...(ns?.docs ?? []), ...(as?.docs ?? [])].map(d => d.ref);
    console.log(`${refs.length} seeded record(s) to delete${apply ? '' : ' (dry run)'}`);
    if (apply) { const b = db().batch(); refs.forEach(r => b.delete(r)); await b.commit(); console.log('deleted'); }
    process.exit(0);
  }

  const today = madridToday();
  for (const n of OFFSETS) {
    const end = addDays(today, n);
    const title = `[PRUEBA] NDA +${n}d`;
    console.log(`${apply ? '+' : '·'} ${title} → ends ${end}`);
    if (!apply) continue;
    const docRef = db().collection('documents').doc();
    const cRef = db().collection('contracts').doc();
    const at = new Date().toISOString();
    await docRef.set({
      userId: uid, caseId: null, name: `${title}.doc`, type: 'doc', size: 0, storagePath: '', downloadUrl: '',
      source: 'generated', seed: true, createdAt: new Date(),
      contractId: cRef.id, contractConfirmed: true, contractNextDate: end, contractLifecycle: n <= 30 ? 'expiring' : 'active',
    });
    await cRef.set({
      userId: uid, documentId: docRef.id, caseId: null, clientId: null, type: 'nda', title, language: 'es',
      jurisdiction: { country: 'ES', region: null }, governingLaw: 'España', ndaKind: 'unilateral',
      parties: [{ name: 'Parte A', company: null, role: 'disclosing' }, { name: 'Parte B', company: null, role: 'receiving' }],
      term: { months: null, fixedEndDate: end }, clauses: [],
      dates: { effectiveDate: addDays(end, -365), termEndDate: end, confidentialitySurvivalEnd: null, noticeDeadline: null },
      extraction: { source: 'generated', confidence: 1, fieldConfidence: {}, extractedAt: at },
      confirmedByUser: true, confirmedAt: at, lifecycle: n <= 30 ? 'expiring' : 'active',
      snoozedUntil: null, alertsMuted: false, renewsContractId: null, renewedByContractId: null,
      seed: true, createdAt: at, updatedAt: at,
    });
  }
  if (!apply) console.log('(dry run — add --apply to write)');
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
