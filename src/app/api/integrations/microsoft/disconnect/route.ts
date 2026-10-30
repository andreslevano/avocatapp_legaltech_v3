import { NextRequest, NextResponse } from 'next/server';
import { deleteConnection } from '@/lib/integrations/microsoft/connection';
import { requireMicrosoftUser } from '@/lib/integrations/microsoft/route-helpers';

// POST /api/integrations/microsoft/disconnect — forgets the tokens. Imported documents stay in
// Avocat and nothing is called on Microsoft's side (M2).
export async function POST(req: NextRequest) {
  const uid = await requireMicrosoftUser(req);
  if (typeof uid !== 'string') return uid;
  await deleteConnection(uid);
  return NextResponse.json({ ok: true });
}
