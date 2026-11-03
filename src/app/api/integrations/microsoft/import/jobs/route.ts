import { NextRequest, NextResponse } from 'next/server';
import { connectorErrorResponse, requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';
import { createImportJob, ImportError } from '@/lib/integrations/microsoft/import-server';
import { MAX_JOB_FILES, MAX_SOURCE_DEPTH, validIds } from '@/lib/integrations/microsoft/import';
import type { FolderSource } from '@/lib/folders/types';

export const dynamic = 'force-dynamic';

const optId = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : null);
const rel = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()).slice(0, MAX_SOURCE_DEPTH).map(s => s.slice(0, 120)) : []);

// POST /api/integrations/microsoft/import/jobs — creates an import job from the options sheet:
// { destinationFolderId?, keepStructure, caseId?, clientId?, analyze, files: [{ driveId, itemId, name, size, rel }],
//   folders: [{ key, name, source }] }. Items are then imported one per POST …/jobs/[id]/next.
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  const rawFiles = Array.isArray(b?.files) ? b!.files as Record<string, unknown>[] : [];
  if (rawFiles.length > MAX_JOB_FILES) return NextResponse.json({ error: `Máximo ${MAX_JOB_FILES} archivos por importación.` }, { status: 400 });
  const files = rawFiles.filter(f => validIds(f?.driveId, f?.itemId)).map(f => ({
    driveId: f.driveId as string, itemId: f.itemId as string,
    name: typeof f.name === 'string' ? f.name : 'documento', size: Number(f.size) || 0, rel: rel(f.rel),
  }));
  const folders = (Array.isArray(b?.folders) ? b!.folders as Record<string, unknown>[] : []).slice(0, 500).flatMap(f => {
    const s = (f?.source ?? {}) as Record<string, unknown>;
    if (typeof f?.key !== 'string' || typeof f?.name !== 'string' || !validIds(s.driveId, s.itemId)) return [];
    const source: FolderSource = {
      provider: 'microsoft', driveId: s.driveId as string, itemId: s.itemId as string,
      webUrl: typeof s.webUrl === 'string' && /^https:\/\//.test(s.webUrl) ? s.webUrl.slice(0, 1000) : '',
      path: typeof s.path === 'string' ? s.path.slice(0, 500) : '',
    };
    return [{ key: f.key.slice(0, 1000), name: f.name.slice(0, 120), source }];
  });
  try {
    const id = await createImportJob(uid, {
      destinationFolderId: optId(b?.destinationFolderId), keepStructure: b?.keepStructure === true,
      caseId: optId(b?.caseId), clientId: optId(b?.clientId), analyze: b?.analyze === true, files, folders,
    });
    return NextResponse.json({ jobId: id });
  } catch (err) {
    if (err instanceof ImportError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    return connectorErrorResponse(err);
  }
}
