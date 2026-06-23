import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, authAdmin, storage } from '@/lib/firebase-admin';
import { generateEmbedding } from '@/lib/vertex-embeddings';

async function extractTextFromStorage(storagePath: string): Promise<string> {
  try {
    const bucket = storage().bucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';

    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '';

    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return (result.text ?? '').slice(0, 12000);
    }

    if (['docx', 'doc'].includes(ext)) {
      // Agent-generated .doc files are HTML — detect and strip tags
      const raw = buffer.toString('utf-8');
      if (raw.startsWith('﻿<') || raw.includes('<html') || raw.includes('<body')) {
        return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
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
  } catch (err) {
    console.warn('[documents/embed] text extraction failed:', (err as Error).message);
    return '';
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await authAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }

  const { docId, text } = (await req.json().catch(() => ({}))) as {
    docId?: string;
    text?: string;
  };
  if (!docId) return NextResponse.json({ ok: false, error: 'missing docId' }, { status: 400 });

  const docRef = db().collection('documents').doc(docId);
  const snap = await docRef.get();
  if (!snap.exists || snap.data()?.userId !== uid) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // Mark as pending so duplicate calls are idempotent
  if (snap.data()?.embeddingStatus === 'done') {
    return NextResponse.json({ ok: true, skipped: true });
  }
  await docRef.update({ embeddingStatus: 'pending', updatedAt: FieldValue.serverTimestamp() });

  try {
    // Resolve text: caller may supply it (generated docs) or we extract from Storage
    const rawText = text?.trim()
      ? text.slice(0, 12000)
      : await extractTextFromStorage(snap.data()!.storagePath as string);

    if (!rawText || rawText.length < 20) {
      await docRef.update({ embeddingStatus: 'error' });
      return NextResponse.json({ ok: false, error: 'no_text_extracted' });
    }

    // Truncate to ~2000 chars (~500 tokens) for the embedding vector
    const embeddingInput = rawText.slice(0, 2000);
    const vector = await generateEmbedding(embeddingInput, 'RETRIEVAL_DOCUMENT');

    await docRef.update({
      embedding: FieldValue.vector(vector),
      embeddingStatus: 'done',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[documents/embed]', err);
    await docRef.update({ embeddingStatus: 'error' }).catch(() => {});
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
