import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { orgNdaTemplateFor } from '@/lib/org-templates';

export const dynamic = 'force-dynamic';

// GET /api/org-templates/[id] — fixed data of an organisation template that is kept out of the code
// (e.g. the representative's DNI). Only for users of that organisation (verified email or named).
const ORG_OF: Record<string, string> = {
  'mobilityforwork.es_servicios': 'mobilityforwork',
  'mobilityforwork.es_nda': 'mobilityforwork',
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('Authorization') ?? '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let email: string | undefined, emailVerified = false;
  try {
    const t = await authAdmin().verifyIdToken(idToken);
    email = t.email; emailVerified = t.email_verified === true;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const org = ORG_OF[params.id];
  if (!org || orgNdaTemplateFor({ email, emailVerified }) !== org) return NextResponse.json({ error: 'No disponible' }, { status: 403 });
  const snap = await db().collection('org_templates').doc(params.id).get();
  return NextResponse.json({ fixed: (snap.get('fixed') as Record<string, string> | undefined) ?? {} });
}
