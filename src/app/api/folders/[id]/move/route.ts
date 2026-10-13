import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { planFolderMove } from '@/lib/folders/tree';
import { commitInBatches, folderRef, loadUserFolders, requireUid } from '@/lib/folders/server';

// POST /api/folders/{id}/move  { parentId: string | null }
// Re-parents a folder and rewrites ancestors/depth of its whole subtree. Rejects cycles,
// depth > 8 and name clashes in the destination. Documents keep their folderId (and Storage path).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireUid(req);
  if (typeof uid !== 'string') return uid;

  const body = await req.json().catch(() => null) as { parentId?: unknown } | null;
  const parentId = body?.parentId ?? null;
  if (parentId !== null && typeof parentId !== 'string') {
    return NextResponse.json({ error: 'parentId inválido' }, { status: 400 });
  }

  // Only the caller's folders are loaded, so foreign folder ids resolve as "not found".
  const folders = await loadUserFolders(uid);
  const result = planFolderMove(folders, params.id, parentId);
  if (!result.ok) {
    if (result.code === 'noop') return NextResponse.json({ ok: true, updated: 0 });
    const status = result.code === 'not-found' ? 404 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  await commitInBatches(result.patches.map(p => batch => {
    const data: Record<string, unknown> = { ancestors: p.ancestors, depth: p.depth, updatedAt: FieldValue.serverTimestamp() };
    if (p.parentId !== undefined) data.parentId = p.parentId;
    batch.update(folderRef(p.id), data);
  }));

  return NextResponse.json({ ok: true, updated: result.patches.length });
}
