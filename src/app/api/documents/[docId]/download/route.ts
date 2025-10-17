import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { signedUrlFor } from '@/lib/storage';

export const runtime = 'nodejs' as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const { docId } = params;
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid') || 'demo_user'; // Fallback para desarrollo
    
    // Verificar que el documento existe y pertenece al usuario
    const docRef = db().collection('users').doc(uid).collection('documents').doc(docId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    const docData = docSnap.data();
    
    // Verificar ownership
    if (docData?.userId !== uid) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    // Generar URL firmada
    const downloadUrl = await signedUrlFor(uid, docId, { expiresMinutes: 15 });
    
    // Opción A: Redirigir a URL firmada
    return NextResponse.redirect(downloadUrl, 302);
    
    // Opción B: Stream directo (comentado por ahora)
    /*
    const bucket = storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(`users/${uid}/documents/${docId}.pdf`);
    
    const [fileBuffer] = await file.download();
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${docData.filename || 'documento.pdf'}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
    */
    
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
