import { NextRequest, NextResponse } from 'next/server';
import { legalErrorResponse, requireLegalAdmin } from '@/lib/legal/route-helpers';
import { addManualChange } from '@/lib/legal/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/admin/legal-changes { title, url?, text, jurisdiction: 'ES'|'EU', publishedAt? } — add a
// change by hand (F2 step 1). The AI drafts summary / requirement / clause; it starts as "new".
export async function POST(req: NextRequest) {
  const uid = await requireLegalAdmin(req);
  if (typeof uid !== 'string') return uid;
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  const text = typeof b?.text === 'string' ? b.text.trim() : '';
  if (!title || text.length < 200) return NextResponse.json({ error: 'Indica el título y pega el texto de la norma (mín. 200 caracteres).' }, { status: 400 });
  if (b?.jurisdiction !== 'ES' && b?.jurisdiction !== 'EU') return NextResponse.json({ error: 'Jurisdicción no válida.' }, { status: 400 });
  const url = typeof b?.url === 'string' && /^https?:\/\//.test(b.url) ? b.url : undefined;
  try {
    return NextResponse.json({ change: await addManualChange({ title, text, url, jurisdiction: b.jurisdiction, publishedAt: b?.publishedAt as string | undefined }) });
  } catch (err) {
    return legalErrorResponse(err);
  }
}
