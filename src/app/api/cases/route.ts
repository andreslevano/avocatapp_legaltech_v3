import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { authAdmin, getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

async function verifyToken(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const { uid } = await authAdmin().verifyIdToken(header.slice(7));
    return uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getFirestore(getAdmin());
    const snap = await db
      .collection('cases')
      .where('userId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();

    const cases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ cases });
  } catch (err) {
    console.error('[api/cases GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, type, status, ref, client, notes, deadline } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const db = getFirestore(getAdmin());
    const now = new Date();

    const docRef = await db.collection('cases').add({
      userId: uid,
      title: title.trim(),
      type: type ?? 'otro',
      status: status ?? 'active',
      ref: ref?.trim() ?? '',
      client: client?.trim() ?? '',
      notes: notes?.trim() ?? '',
      deadline: deadline ?? null,
      documents: [],
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('[api/cases POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
