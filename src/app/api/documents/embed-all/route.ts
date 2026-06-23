import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, authAdmin, storage } from '@/lib/firebase-admin';
import { generateEmbedding } from '@/lib/vertex-embeddings';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromStorage(storagePath: string): Promise<string> {
  try {
    const bucket = storage().bucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';

    // Skip image files — no text to extract
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '';

    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      return ((await pdfParse(buffer)).text ?? '').slice(0, 12000);
    }

    if (['docx', 'doc'].includes(ext)) {
      // Agent-generated .doc files are actually HTML — detect and strip tags
      const raw = buffer.toString('utf-8');
      if (raw.startsWith('﻿<') || raw.includes('<html') || raw.includes('<body')) {
        return stripHtml(raw).slice(0, 12000);
      }
      // Real binary DOCX/DOC — use mammoth
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        if (result.value?.trim()) return result.value.slice(0, 12000);
      } catch { /* not a real docx/doc binary */ }
    }

    return buffer.toString('utf-8').slice(0, 12000);
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let uid: string;
  try {
    uid = (await authAdmin().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }

  // Fetch all docs for this user, filter client-side to avoid composite index requirement
  const snap = await db()
    .collection('documents')
    .where('userId', '==', uid)
    .get();

  const allDocs = snap.docs.filter(d => d.data().embeddingStatus !== 'done');

  let embedded = 0;
  let failed = 0;

  for (const docSnap of allDocs) {
    const data = docSnap.data();
    const docRef = docSnap.ref;

    try {
      await docRef.update({ embeddingStatus: 'pending', updatedAt: FieldValue.serverTimestamp() });

      const rawText = await extractTextFromStorage(data.storagePath as string);
      if (!rawText || rawText.length < 10) {
        await docRef.update({ embeddingStatus: 'error' });
        failed++;
        continue;
      }

      const vector = await generateEmbedding(rawText.slice(0, 2000), 'RETRIEVAL_DOCUMENT');
      await docRef.update({
        embedding: FieldValue.vector(vector),
        embeddingStatus: 'done',
        updatedAt: FieldValue.serverTimestamp(),
      });
      embedded++;
    } catch (err) {
      console.error('[embed-all] doc', docSnap.id, err);
      await docRef.update({ embeddingStatus: 'error' }).catch(() => {});
      failed++;
    }
  }

  return NextResponse.json({ ok: true, embedded, failed, total: allDocs.length });
}
