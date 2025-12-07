import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando documentos para email: ${email}`);

    // 1. Buscar usuario en Firebase Auth
    const admin = getAdmin();
    const auth = getAuth(admin);
    let userRecord;
    
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({
          success: false,
          error: 'User not found in Firebase Auth',
          email: email
        }, { status: 404 });
      }
      throw error;
    }

    const uid = userRecord.uid;
    console.log(`✅ Usuario encontrado: ${uid}`);

    // 2. Obtener datos del usuario en Firestore
    const firestore = getFirestore(admin);
    const userDoc = await firestore.collection('users').doc(uid).get();
    
    let userData: any = {
      uid: uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: userRecord.metadata.creationTime,
      emailVerified: userRecord.emailVerified
    };

    if (userDoc.exists) {
      const firestoreData = userDoc.data();
      userData = {
        ...userData,
        ...firestoreData,
        isActive: firestoreData?.isActive !== false
      };
    }

    // 3. Buscar documentos generados (colección global)
    const documentsSnapshot = await firestore.collection('documents')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const documents = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 4. Buscar en subcolección users/{uid}/documents
    const userDocumentsSnapshot = await firestore.collection('users').doc(uid)
      .collection('documents')
      .orderBy('createdAt', 'desc')
      .get();

    const userDocuments = userDocumentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 5. Buscar reclamaciones
    const reclamacionesSnapshot = await firestore.collection('reclamaciones')
      .where('userId', '==', uid)
      .orderBy('fechaISO', 'desc')
      .get();

    const reclamaciones = reclamacionesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 6. Buscar tutelas
    const tutelasSnapshot = await firestore.collection('tutelas')
      .where('userId', '==', uid)
      .orderBy('fechaISO', 'desc')
      .get();

    const tutelas = tutelasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 7. Buscar compras
    const purchasesSnapshot = await firestore.collection('purchases')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const purchases = purchasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Resumen
    const totalDocs = documents.length + userDocuments.length;
    const totalReclamaciones = reclamaciones.length;
    const totalTutelas = tutelas.length;
    const totalPurchases = purchases.length;

    console.log(`✅ Búsqueda completada:`);
    console.log(`   Documentos: ${totalDocs}`);
    console.log(`   Reclamaciones: ${totalReclamaciones}`);
    console.log(`   Tutelas: ${totalTutelas}`);
    console.log(`   Compras: ${totalPurchases}`);

    return NextResponse.json({
      success: true,
      user: userData,
      summary: {
        totalDocuments: totalDocs,
        totalReclamaciones: totalReclamaciones,
        totalTutelas: totalTutelas,
        totalPurchases: totalPurchases,
        totalRecords: totalDocs + totalReclamaciones + totalTutelas + totalPurchases
      },
      documents: {
        global: documents,
        userCollection: userDocuments
      },
      reclamaciones: reclamaciones,
      tutelas: tutelas,
      purchases: purchases
    });

  } catch (error: any) {
    console.error('❌ Error buscando documentos:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}




