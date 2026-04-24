/**
 * Export Firestore `users` documents to Excel where `createdAt` falls between
 * March 1 (UTC, current year) and end of local "today" by default.
 *
 * Scans the full collection and filters in memory so mixed types work
 * (Firestore Timestamp, ISO strings, Auth-style RFC strings, millis numbers).
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/export-firestore-users-createdAt-excel.ts
 *
 * Env (optional, also reads ../.env.local without dotenv):
 *   EXPORT_SINCE, EXPORT_UNTIL — ISO bounds
 *   EXPORT_OUT_DIR — output folder (default: exports)
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as XLSX from 'xlsx';

function loadEnvLocal(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\n/g, '\n');
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadEnvLocal(path.resolve(__dirname, '../.env.local'));

if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'avocat-legaltech-v3',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.projectId,
    });
    console.log('✅ Firebase Admin initialized (service account)');
  } else {
    initializeApp({ projectId: serviceAccount.projectId });
    console.log('⚠️ Firebase Admin initialized (default credentials)');
  }
}

const db = getFirestore();

function defaultSinceUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 2, 1, 0, 0, 0, 0));
}

function defaultUntilLocalEndOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const anyV = value as Record<string, unknown> & { path?: string; latitude?: number };
  if (typeof anyV.toDate === 'function') {
    try {
      return (anyV as Timestamp).toDate().toISOString();
    } catch {
      /* ignore */
    }
  }
  if (typeof anyV.path === 'string' && typeof (anyV as { id?: string }).id === 'string') {
    return anyV.path;
  }
  if (typeof anyV.latitude === 'number' && typeof anyV.longitude === 'number') {
    return `${anyV.latitude},${anyV.longitude}`;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function flattenData(
  data: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    const base = prefix ? `${prefix}.${k}` : k;
    if (v instanceof Timestamp || v instanceof Date) {
      out[base] = cellString(v);
      continue;
    }
    if (Array.isArray(v)) {
      out[base] = cellString(v);
      continue;
    }
    const anyV = v as { path?: string; latitude?: number };
    if (typeof anyV?.path === 'string' && typeof (anyV as { id?: string }).id === 'string') {
      out[base] = cellString(v);
      continue;
    }
    if (typeof anyV?.latitude === 'number' && typeof anyV.longitude === 'number') {
      out[base] = cellString(v);
      continue;
    }
    if (isPlainObject(v)) {
      Object.assign(out, flattenData(v, base));
      continue;
    }
    out[base] = cellString(v);
  }
  return out;
}

function parseDocumentCreatedAt(data: Record<string, unknown>): Date | null {
  const raw = data.createdAt ?? data.createdAtISO;
  if (raw === null || raw === undefined) return null;

  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;

  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const o = raw as Record<string, unknown>;
  const sec = (typeof o._seconds === 'number' ? o._seconds : o.seconds) as number | undefined;
  if (typeof sec === 'number') {
    const nanos = (typeof o._nanoseconds === 'number' ? o._nanoseconds : o.nanoseconds) as
      | number
      | undefined;
    return new Date(sec * 1000 + (nanos ?? 0) / 1e6);
  }

  if (typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (raw as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  const since = process.env.EXPORT_SINCE
    ? new Date(process.env.EXPORT_SINCE)
    : defaultSinceUtc();
  const until = process.env.EXPORT_UNTIL
    ? new Date(process.env.EXPORT_UNTIL)
    : defaultUntilLocalEndOfDay();

  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
    throw new Error('Invalid EXPORT_SINCE or EXPORT_UNTIL date');
  }

  const outDir = path.resolve(process.cwd(), process.env.EXPORT_OUT_DIR || 'exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(
    outDir,
    `firestore-users-createdAt-${since.toISOString().slice(0, 10)}_to_${until.toISOString().slice(0, 10)}_${stamp}.xlsx`
  );

  console.log(`\n📅 createdAt range: ${since.toISOString()} → ${until.toISOString()}`);
  console.log('📋 Loading all documents from collection `users`...\n');

  const snapshot = await db.collection('users').get();
  let skippedNoDate = 0;
  let skippedOutOfRange = 0;
  const rows: Record<string, string>[] = [];
  const columnOrder: string[] = [];

  function rememberKeys(obj: Record<string, string>) {
    for (const k of Object.keys(obj)) {
      if (!columnOrder.includes(k)) columnOrder.push(k);
    }
  }

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const created = parseDocumentCreatedAt(data);
    if (!created) {
      skippedNoDate++;
      continue;
    }
    if (created < since || created > until) {
      skippedOutOfRange++;
      continue;
    }

    const flat = flattenData(data);
    const row: Record<string, string> = {
      documentId: doc.id,
      export_createdAtNormalized: created.toISOString(),
      ...flat,
    };
    rememberKeys(row);
    rows.push(row);
  }

  const firstCols = ['documentId', 'export_createdAtNormalized'];
  const rest = columnOrder.filter((c) => !firstCols.includes(c)).sort();
  const orderedHeaders = [...firstCols, ...rest];

  const sheetRows = rows.map((r) => {
    const line: Record<string, string> = {};
    for (const h of orderedHeaders) {
      line[h] = r[h] ?? '';
    }
    return line;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'users');

  XLSX.writeFile(workbook, outFile);

  console.log(`✅ Total documents in collection: ${snapshot.size}`);
  console.log(`✅ Exported (in range): ${rows.length}`);
  console.log(`   Skipped (no parseable createdAt): ${skippedNoDate}`);
  console.log(`   Skipped (outside range): ${skippedOutOfRange}`);
  console.log(`📁 ${outFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
