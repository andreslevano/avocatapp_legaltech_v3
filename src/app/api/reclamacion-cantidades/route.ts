import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { ReclamacionCantidadesRequestSchema } from '@/lib/validate-reclamacion-cantidades';

interface DocumentPayload {
  name: string;
  mimeType: string;
  base64: string;
}

async function extractText(doc: DocumentPayload): Promise<string> {
  if (doc.mimeType !== 'application/pdf') {
    return `[${doc.name} — no se pudo extraer el texto]`;
  }

  try {
    const buffer = Buffer.from(doc.base64, 'base64');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return result.text?.slice(0, 12000) ?? '';
  } catch {
    return `[${doc.name} — no se pudo extraer el texto]`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, caseId, formData, documents } = (await req.json()) as {
      uid?: string;
      caseId?: string;
      formData?: unknown;
      documents?: DocumentPayload[];
    };

    if (!uid || !caseId) {
      return NextResponse.json({ success: false, error: 'Missing uid or caseId' }, { status: 400 });
    }

    const parsed = ReclamacionCantidadesRequestSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos del formulario inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const extracted = await Promise.all((documents ?? []).map(extractText));
    const rawText = (documents ?? [])
      .map((doc, i) => `[Documento: ${doc.name}]\n${extracted[i]}`)
      .join('\n\n');

    const caseRef = db().collection('users').doc(uid).collection('reclamaciones_cantidades').doc(caseId);
    const existing = await caseRef.get();

    await caseRef.set(
      {
        id: caseId,
        uid,
        status: 'waiting_payment',
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
        ocr: { rawText, extracted: {} },
        formData: parsed.data,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, caseId });
  } catch (err) {
    console.error('[api/reclamacion-cantidades]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
