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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const db = getFirestore(getAdmin());
    const snap = await db.collection('cases').doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ case: { id: snap.id, ...data } });
  } catch (err) {
    console.error('[api/cases/[id] GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const db = getFirestore(getAdmin());
    const ref = db.collection('cases').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (snap.data()!.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const allowed = ['title', 'type', 'status', 'ref', 'client', 'notes', 'deadline', 'documents'];
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    await ref.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/cases/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const db = getFirestore(getAdmin());
    const ref = db.collection('cases').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (snap.data()!.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/cases/[id] DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
