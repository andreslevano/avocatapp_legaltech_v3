/**
 * One-time ingestion script: Spanish legal corpus → Firestore legal_chunks
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/ingest-spain-legal.ts
 *
 * Requires env vars:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (same as .env.local)
 *
 * Sources:
 *   Phase A: BOE API — Código Civil, LEC, Código Penal
 *   Phase B: CENDOJ — Tribunal Supremo sentencias (Civil + Social)
 */

import * as admin from 'firebase-admin';
import { load as cheerioLoad } from 'cheerio';

// ── Firebase Admin init (standalone, no Next.js) ────────────────────────────

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'avocat-legaltech-v3',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: serviceAccount.projectId,
  });
}

const db = admin.firestore();

// ── Vertex AI embedding (direct REST, avoids @/lib alias) ──────────────────

const VERTEX_URL =
  'https://us-central1-aiplatform.googleapis.com/v1/projects/avocat-legaltech-v3' +
  '/locations/us-central1/publishers/google/models/text-embedding-005:predict';

async function getGcpToken(): Promise<string> {
  const cred = admin.app().options.credential as admin.credential.Credential;
  const token = await cred.getAccessToken();
  return token.access_token;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const token = await getGcpToken();
  const res = await fetch(VERTEX_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: texts.map(content => ({ task_type: 'RETRIEVAL_DOCUMENT', content })),
    }),
  });
  if (!res.ok) throw new Error(`Vertex AI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { predictions: { embeddings: { values: number[] } }[] };
  return data.predictions.map(p => p.embeddings.values);
}

// ── Types ───────────────────────────────────────────────────────────────────

interface LegalChunk {
  chunkId: string;
  content: string;
  lawName: string;
  lawShort: string;
  articleNumber: string;
  sectionTitle: string;
  jurisdiction: 'ES';
  areas: string[];
  sourceType: 'ley' | 'sentencia';
  sourceUrl: string;
  tribunal?: string;
  sala?: string;
  fecha?: string;
  ecli?: string;
}

// ── Phase A: BOE legislation ────────────────────────────────────────────────

const BOE_LAWS = [
  {
    id: 'BOE-A-1889-4763',
    lawName: 'Código Civil',
    lawShort: 'CC',
    areas: ['civil', 'contractual'],
  },
  {
    id: 'BOE-A-2000-323',
    lawName: 'Ley de Enjuiciamiento Civil',
    lawShort: 'LEC',
    areas: ['civil'],
  },
  {
    id: 'BOE-A-1995-25444',
    lawName: 'Código Penal',
    lawShort: 'CP',
    areas: ['civil'],
    // Only include articles mentioning these civil/laboral keywords
    filter: ['responsabilidad', 'daños', 'indemnización', 'contrato', 'laboral', 'trabajador'],
  },
] as const;

async function fetchBoeArticles(law: (typeof BOE_LAWS)[number]): Promise<LegalChunk[]> {
  console.log(`  Fetching ${law.lawName} from BOE...`);
  const url = `https://www.boe.es/buscar/act.php?id=${law.id}&tipo=E`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es-ES' } });
  if (!res.ok) throw new Error(`BOE fetch failed for ${law.id}: ${res.status}`);
  const html = await res.text();
  const $ = cheerioLoad(html);

  const chunks: LegalChunk[] = [];

  // BOE structures articles in <div class="articulo"> or similar; article numbers in <h4>,<h5>
  $('div.articulo, div[class*="articulo"]').each((_i, el) => {
    const header = $(el).find('h4, h5, .preambulo').first().text().trim();
    const body = $(el).text().replace(/\s+/g, ' ').trim();
    if (!header || body.length < 50) return;

    // Extract article number (e.g., "Artículo 1124")
    const artMatch = header.match(/art[íi]culo\s+(\d+[º°]?(?:\s*bis)?)/i);
    if (!artMatch) return;
    const artNum = artMatch[1].replace(/[º°]/, '').trim();
    const articleLabel = `Art. ${artNum}`;

    // Filter CP to civil/laboral relevant articles
    if ('filter' in law && law.filter) {
      const lowerBody = body.toLowerCase();
      if (!law.filter.some(kw => lowerBody.includes(kw))) return;
    }

    // Truncate to ~1400 tokens (~5600 chars)
    const content = body.slice(0, 5600);
    const chunkId = `${law.lawShort}-art-${artNum.replace(/\s+/g, '-')}`;

    chunks.push({
      chunkId,
      content,
      lawName: law.lawName,
      lawShort: law.lawShort,
      articleNumber: articleLabel,
      sectionTitle: header.replace(/art[íi]culo\s+\d+[º°]?\s*/i, '').trim().slice(0, 100),
      jurisdiction: 'ES',
      areas: [...law.areas],
      sourceType: 'ley',
      sourceUrl: `https://www.boe.es/buscar/act.php?id=${law.id}#a${artNum}`,
    });
  });

  // Fallback: parse <p> elements with "Artículo N" pattern if div.articulo not found
  if (chunks.length === 0) {
    console.log(`  Trying fallback parser for ${law.lawName}...`);
    const fullText = $('body').text();
    const artRegex = /Art[íi]culo\s+(\d+[º°]?)\.?\s*([^\n]*)\n([\s\S]{50,3000}?)(?=Art[íi]culo\s+\d|$)/gi;
    let match;
    while ((match = artRegex.exec(fullText)) !== null) {
      const artNum = match[1].replace(/[º°]/, '');
      const sectionTitle = match[2].trim().slice(0, 100);
      const content = `Artículo ${match[1]}. ${match[2]}\n${match[3]}`.slice(0, 5600);

      if ('filter' in law && law.filter) {
        if (!law.filter.some(kw => content.toLowerCase().includes(kw))) continue;
      }

      const chunkId = `${law.lawShort}-art-${artNum.replace(/\s+/g, '-')}`;
      chunks.push({
        chunkId,
        content,
        lawName: law.lawName,
        lawShort: law.lawShort,
        articleNumber: `Art. ${artNum}`,
        sectionTitle,
        jurisdiction: 'ES',
        areas: [...law.areas],
        sourceType: 'ley',
        sourceUrl: `https://www.boe.es/buscar/act.php?id=${law.id}#a${artNum}`,
      });
    }
  }

  console.log(`  → ${chunks.length} articles parsed from ${law.lawName}`);
  return chunks;
}

// ── Phase B: CENDOJ sentencias ──────────────────────────────────────────────

interface CendojResult {
  ECLI?: string;
  ORGANO?: string;
  FECHA?: string;
  RESUMEN?: string;
  TEXTO?: string;
  PONENTE?: string;
  RMATERIA?: string;
}

async function fetchCendojSentencias(
  sala: '10' | '40', // 10=Civil, 40=Social
  maxPages: number,
): Promise<LegalChunk[]> {
  const salaName = sala === '10' ? 'Sala de lo Civil' : 'Sala de lo Social';
  const areas = sala === '10' ? ['civil', 'contractual'] : ['laboral'];
  console.log(`  Fetching CENDOJ TS ${salaName}...`);

  const chunks: LegalChunk[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url =
        `https://www.poderjudicial.es/search/AN/openInterface.do` +
        `?apelacion=AN&org=TS&sala=${sala}&pag=${page}&nres=25&dscrd=true`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/javascript, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; avocat-legal-rag/1.0)',
        },
      });

      if (!res.ok) {
        console.log(`    Page ${page}: HTTP ${res.status}, stopping`);
        break;
      }

      const contentType = res.headers.get('content-type') ?? '';
      let results: CendojResult[] = [];

      if (contentType.includes('json')) {
        const data = (await res.json()) as { results?: CendojResult[] } | CendojResult[];
        results = Array.isArray(data) ? data : (data as { results?: CendojResult[] }).results ?? [];
      } else {
        // HTML response — try to parse embedded JSON
        const text = await res.text();
        const jsonMatch = text.match(/\[(\{[\s\S]*?\})\]/);
        if (!jsonMatch) { console.log(`    Page ${page}: no JSON found, stopping`); break; }
        try { results = JSON.parse(`[${jsonMatch[1]}]`) as CendojResult[]; } catch { break; }
      }

      if (results.length === 0) break;

      for (const r of results) {
        const ecli = r.ECLI ?? '';
        const texto = (r.TEXTO ?? r.RESUMEN ?? '').replace(/\s+/g, ' ').trim();
        if (texto.length < 100) continue;

        const content = texto.slice(0, 5600);
        const fecha = r.FECHA ?? '';
        const year = fecha.split('/').pop() ?? fecha.split('-')[0] ?? '';
        const num = ecli.split(':').pop() ?? chunks.length.toString();
        const chunkId = `STS-${sala === '10' ? 'civil' : 'social'}-${year}-${num}`;

        chunks.push({
          chunkId,
          content,
          lawName: 'Sentencia Tribunal Supremo',
          lawShort: 'STS',
          articleNumber: ecli ? `STS ${ecli.split(':').slice(-2).join('/')}` : `STS ${year}/${num}`,
          sectionTitle: r.RMATERIA ?? '',
          jurisdiction: 'ES',
          areas,
          sourceType: 'sentencia',
          sourceUrl: `https://www.poderjudicial.es/search/AN/openInterface.do?ecli=${encodeURIComponent(ecli)}`,
          tribunal: 'Tribunal Supremo',
          sala: salaName,
          fecha: fecha.includes('/') ? fecha.split('/').reverse().join('-') : fecha,
          ecli,
        });
      }

      console.log(`    Page ${page}: ${results.length} sentencias (total so far: ${chunks.length})`);
      await new Promise(r => setTimeout(r, 200)); // polite rate limit
    } catch (err) {
      console.warn(`    Page ${page} error: ${(err as Error).message}`);
      break;
    }
  }

  console.log(`  → ${chunks.length} sentencias from ${salaName}`);
  return chunks;
}

// ── Embed + write to Firestore ──────────────────────────────────────────────

async function ingestChunks(chunks: LegalChunk[]): Promise<void> {
  const BATCH_EMBED = 50; // Vertex AI max per request
  const BATCH_WRITE = 499; // Firestore batch limit

  // Skip already-ingested chunks
  console.log(`  Checking for existing chunks...`);
  const existingSnap = await db.collection('legal_chunks').select().get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const toIngest = chunks.filter(c => !existingIds.has(c.chunkId));
  console.log(`  ${existingIds.size} existing, ${toIngest.length} new to ingest`);

  if (toIngest.length === 0) return;

  // Embed in batches
  const withEmbeddings: (LegalChunk & { embedding: number[] })[] = [];
  for (let i = 0; i < toIngest.length; i += BATCH_EMBED) {
    const slice = toIngest.slice(i, i + BATCH_EMBED);
    process.stdout.write(`  Embedding batch ${Math.floor(i / BATCH_EMBED) + 1}/${Math.ceil(toIngest.length / BATCH_EMBED)}...`);
    try {
      const embeddings = await embedBatch(slice.map(c => c.content));
      slice.forEach((chunk, j) => {
        withEmbeddings.push({ ...chunk, embedding: embeddings[j] });
      });
      process.stdout.write(` ✓\n`);
    } catch (err) {
      process.stdout.write(` ✗ (${(err as Error).message})\n`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Write to Firestore in batches
  console.log(`  Writing ${withEmbeddings.length} chunks to Firestore...`);
  for (let i = 0; i < withEmbeddings.length; i += BATCH_WRITE) {
    const batch = db.batch();
    const slice = withEmbeddings.slice(i, i + BATCH_WRITE);
    for (const chunk of slice) {
      const { chunkId, embedding, ...meta } = chunk;
      const ref = db.collection('legal_chunks').doc(chunkId);
      batch.set(ref, {
        ...meta,
        embedding: admin.firestore.FieldValue.vector(embedding),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  Wrote batch ${Math.floor(i / BATCH_WRITE) + 1}/${Math.ceil(withEmbeddings.length / BATCH_WRITE)}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Avocat RAG Ingestion — Spain Legal Corpus ===\n');

  // Phase A: Legislation
  console.log('PHASE A: BOE Legislation');
  const lawChunks: LegalChunk[] = [];
  for (const law of BOE_LAWS) {
    try {
      const articles = await fetchBoeArticles(law);
      lawChunks.push(...articles);
    } catch (err) {
      console.error(`  ERROR fetching ${law.lawName}: ${(err as Error).message}`);
    }
  }
  console.log(`Phase A total: ${lawChunks.length} law articles\n`);

  // Phase B: CENDOJ sentencias
  console.log('PHASE B: CENDOJ Sentencias');
  const sentenciaChunks: LegalChunk[] = [];
  try {
    const civil = await fetchCendojSentencias('10', 20); // up to 500 sentencias
    sentenciaChunks.push(...civil);
    await new Promise(r => setTimeout(r, 500));
    const social = await fetchCendojSentencias('40', 10); // up to 250 sentencias
    sentenciaChunks.push(...social);
  } catch (err) {
    console.error(`  ERROR fetching CENDOJ: ${(err as Error).message}`);
  }
  console.log(`Phase B total: ${sentenciaChunks.length} sentencias\n`);

  const allChunks = [...lawChunks, ...sentenciaChunks];
  console.log(`TOTAL CHUNKS: ${allChunks.length}\n`);

  // Phase C+D: Embed + write
  console.log('PHASE C+D: Embedding + Firestore write');
  await ingestChunks(allChunks);

  console.log('\n=== INGESTION COMPLETE ===');
  console.log(`\nNEXT STEP — Create Firestore Vector Index (run once, takes ~30 min):\n`);
  console.log(`gcloud firestore indexes composite create \\`);
  console.log(`  --project=avocat-legaltech-v3 \\`);
  console.log(`  --collection-group=legal_chunks \\`);
  console.log(`  --query-scope=COLLECTION \\`);
  console.log(`  --field-config=field-path=embedding,vector-config='{"dimension":"768","flat":"{}"}'\n`);
  console.log(`After the index is ACTIVE, test the RAG by asking the agent:`);
  console.log(`  "¿Qué dice el Código Civil sobre resolución de contratos?"\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
