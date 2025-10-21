import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      );
    }

    console.log(`🧹 Cleaning up user data for: ${uid}`);

    const firestore = db();
    const collections = [
      'reclamaciones',
      'tutelas',
      'legal_audits',
      'document_generation_history',
      'user_analytics',
      'email_reports',
      'purchase_history',
      'document_templates'
    ];

    let totalDeleted = 0;

    // Delete documents from all collections except 'users'
    for (const collectionName of collections) {
      try {
        const snapshot = await firestore
          .collection(collectionName)
          .where('userId', '==', uid)
          .get();

        if (!snapshot.empty) {
          const batch = firestore.batch();
          
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          totalDeleted += snapshot.size;
          console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
        }
      } catch (collectionError) {
        console.error(`⚠️ Error cleaning collection ${collectionName}:`, collectionError);
        // Continue with other collections even if one fails
      }
    }

    console.log(`✅ User data cleanup completed. Total documents deleted: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      message: `User data cleaned up successfully. ${totalDeleted} documents deleted.`,
      deletedCount: totalDeleted
    });

  } catch (error) {
    console.error('❌ Error cleaning up user data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
