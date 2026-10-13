import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type WriteBatch } from 'firebase-admin/firestore';
import { storage } from '@/lib/firebase-admin';
import { planFolderDelete } from '@/lib/folders/tree';
import type { FolderDeleteMode } from '@/lib/folders/types';
import {
  commitInBatches, documentRef, folderRef, loadUserDocs, loadUserFolders, requireUid,
} from '@/lib/folders/server';

// POST /api/folders/{id}/delete  { mode: 'move-up' | 'delete-all', confirm?: { folders, documents } }
// move-up (default): sub-folders and documents go to the parent folder, then the folder is removed.
// delete-all: removes the subtree and its documents (records + Storage blobs); requires the counts
// the user confirmed to match the current server state. Documents are never orphaned.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireUid(req);
  if (typeof uid !== 'string') return uid;

  const body = await req.json().catch(() => null) as {
    mode?: unknown; confirm?: { folders?: unknown; documents?: unknown };
  } | null;
  const mode: FolderDeleteMode = body?.mode === 'delete-all' ? 'delete-all' : 'move-up';

  const [folders, docs] = await Promise.all([loadUserFolders(uid), loadUserDocs(uid)]);
  const result = planFolderDelete(folders, docs, params.id, mode);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === 'not-found' ? 404 : 409 });
  }
  const { plan } = result;

  if (mode === 'delete-all') {
    const confirm = body?.confirm;
    if (confirm?.folders !== plan.counts.folders || confirm?.documents !== plan.counts.documents) {
      return NextResponse.json({
        error: 'El contenido de la carpeta ha cambiado. Revisa los totales y vuelve a confirmar.',
        code: 'confirm-mismatch',
        counts: plan.counts,
      }, { status: 409 });
    }
  }

  // 1. Move content out first, so a failure part-way never leaves documents in a deleted folder.
  await commitInBatches([
    ...plan.docMoves.map(m => (b: WriteBatch) => { b.update(documentRef(m.id), { folderId: m.folderId }); }),
    ...plan.folderPatches.map(p => (b: WriteBatch) => {
      const data: Record<string, unknown> = { ancestors: p.ancestors, depth: p.depth, updatedAt: FieldValue.serverTimestamp() };
      if (p.parentId !== undefined) data.parentId = p.parentId;
      if (p.name !== undefined) data.name = p.name;
      b.update(folderRef(p.id), data);
    }),
  ]);

  // 2. delete-all: documents (records + blobs), then the folders.
  if (plan.deleteDocIds.length) {
    const toDelete = new Set(plan.deleteDocIds);
    const bucket = storage().bucket();
    await Promise.all(docs.filter(d => toDelete.has(d.id) && d.storagePath)
      .map(d => bucket.file(d.storagePath!).delete().catch(() => {})));
    await commitInBatches(plan.deleteDocIds.map(id => (b: WriteBatch) => { b.delete(documentRef(id)); }));
  }
  await commitInBatches(plan.deleteFolderIds.map(id => (b: WriteBatch) => { b.delete(folderRef(id)); }));

  return NextResponse.json({
    ok: true,
    deletedFolders: plan.deleteFolderIds.length,
    movedDocuments: plan.docMoves.length,
    deletedDocuments: plan.deleteDocIds.length,
  });
}
