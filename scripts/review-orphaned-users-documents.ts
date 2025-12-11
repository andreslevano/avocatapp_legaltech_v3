/**
 * Script to review documents associated with orphaned users
 * Shows detailed information about each document to help decide what to do
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/review-orphaned-users-documents.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || "avocat-legaltech-v3",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    initializeApp({
      projectId: "avocat-legaltech-v3",
    });
    console.log('⚠️ Firebase Admin initialized with default credentials');
  }
}

const db = getFirestore();
const auth = getAuth();

interface DocumentInfo {
  id: string;
  collection: string;
  title?: string;
  type?: string;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  content?: string;
  [key: string]: any;
}

async function reviewOrphanedUsersDocuments() {
  try {
    console.log('\n🔍 Reviewing documents associated with orphaned users...\n');
    
    // Get all users from Firebase Auth
    const authUsers = await auth.listUsers();
    const authUserIds = new Set(authUsers.users.map(user => user.uid));
    
    // Get all user documents from Firestore
    const firestoreUsersSnapshot = await db.collection('users').get();
    
    // Find orphaned users
    const orphanedUsers = firestoreUsersSnapshot.docs
      .filter(doc => !authUserIds.has(doc.id))
      .map(doc => ({
        uid: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName
      }));
    
    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found!\n');
      return;
    }
    
    console.log(`📋 Reviewing documents for ${orphanedUsers.length} orphaned users...\n`);
    
    // Review documents for each orphaned user
    for (let i = 0; i < orphanedUsers.length; i++) {
      const user = orphanedUsers[i];
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`USER ${i + 1}/${orphanedUsers.length}: ${user.uid}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Display Name: ${user.displayName || 'N/A'}\n`);
      
      const allDocuments: DocumentInfo[] = [];
      
      // Check documents collection
      try {
        const documentsSnapshot = await db.collection('documents')
          .where('userId', '==', user.uid)
          .get();
        
        documentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allDocuments.push({
            id: doc.id,
            collection: 'documents',
            title: data.title || data.name || 'N/A',
            type: data.type || data.documentType || 'N/A',
            status: data.status || 'N/A',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            ...data
          });
        });
      } catch (error) {
        // Collection might not exist
      }
      
      // Check student_document_packages collection
      try {
        const packagesSnapshot = await db.collection('student_document_packages')
          .where('userId', '==', user.uid)
          .get();
        
        packagesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allDocuments.push({
            id: doc.id,
            collection: 'student_document_packages',
            title: data.title || data.name || data.documentName || 'N/A',
            type: data.type || data.documentType || 'Package',
            status: data.status || 'N/A',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            ...data
          });
        });
      } catch (error) {
        // Collection might not exist
      }
      
      // Check generated_emails collection
      try {
        const emailsSnapshot = await db.collection('generated_emails')
          .where('userId', '==', user.uid)
          .get();
        
        emailsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allDocuments.push({
            id: doc.id,
            collection: 'generated_emails',
            title: data.subject || data.title || 'Email',
            type: 'email',
            status: data.status || 'N/A',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            ...data
          });
        });
      } catch (error) {
        // Collection might not exist
      }
      
      if (allDocuments.length === 0) {
        console.log('   ✅ No documents found\n');
        continue;
      }
      
      console.log(`   📄 Found ${allDocuments.length} document(s):\n`);
      
      // Display each document
      allDocuments.forEach((doc, index) => {
        console.log(`   ${index + 1}. Document ID: ${doc.id}`);
        console.log(`      Collection: ${doc.collection}`);
        console.log(`      Title: ${doc.title || 'N/A'}`);
        console.log(`      Type: ${doc.type || 'N/A'}`);
        console.log(`      Status: ${doc.status || 'N/A'}`);
        
        // Format dates
        if (doc.createdAt) {
          let createdAtStr = 'N/A';
          if (doc.createdAt.toDate) {
            createdAtStr = doc.createdAt.toDate().toISOString();
          } else if (doc.createdAt instanceof Date) {
            createdAtStr = doc.createdAt.toISOString();
          } else if (typeof doc.createdAt === 'string') {
            createdAtStr = doc.createdAt;
          }
          console.log(`      Created: ${createdAtStr}`);
        }
        
        if (doc.updatedAt) {
          let updatedAtStr = 'N/A';
          if (doc.updatedAt.toDate) {
            updatedAtStr = doc.updatedAt.toDate().toISOString();
          } else if (doc.updatedAt instanceof Date) {
            updatedAtStr = doc.updatedAt.toISOString();
          } else if (typeof doc.updatedAt === 'string') {
            updatedAtStr = doc.updatedAt;
          }
          console.log(`      Updated: ${updatedAtStr}`);
        }
        
        // Show additional relevant fields
        const relevantFields = ['area', 'country', 'price', 'amount', 'downloadUrl', 'pdfUrl', 'wordUrl', 'fileName'];
        const hasRelevantFields = relevantFields.some(field => doc[field] !== undefined);
        
        if (hasRelevantFields) {
          console.log(`      Additional Info:`);
          relevantFields.forEach(field => {
            if (doc[field] !== undefined) {
              const value = typeof doc[field] === 'object' ? JSON.stringify(doc[field]) : doc[field];
              console.log(`         ${field}: ${value}`);
            }
          });
        }
        
        // Show content preview if available
        if (doc.content) {
          const contentPreview = typeof doc.content === 'string' 
            ? doc.content.substring(0, 200) 
            : JSON.stringify(doc.content).substring(0, 200);
          console.log(`      Content Preview: ${contentPreview}${contentPreview.length >= 200 ? '...' : ''}`);
        }
        
        console.log('');
      });
      
      console.log('');
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    let totalDocuments = 0;
    const documentsByCollection: { [key: string]: number } = {};
    
    for (const user of orphanedUsers) {
      // Count documents for this user
      try {
        const documentsSnapshot = await db.collection('documents')
          .where('userId', '==', user.uid)
          .get();
        totalDocuments += documentsSnapshot.size;
        if (documentsSnapshot.size > 0) {
          documentsByCollection['documents'] = (documentsByCollection['documents'] || 0) + documentsSnapshot.size;
        }
      } catch (error) {}
      
      try {
        const packagesSnapshot = await db.collection('student_document_packages')
          .where('userId', '==', user.uid)
          .get();
        totalDocuments += packagesSnapshot.size;
        if (packagesSnapshot.size > 0) {
          documentsByCollection['student_document_packages'] = (documentsByCollection['student_document_packages'] || 0) + packagesSnapshot.size;
        }
      } catch (error) {}
      
      try {
        const emailsSnapshot = await db.collection('generated_emails')
          .where('userId', '==', user.uid)
          .get();
        totalDocuments += emailsSnapshot.size;
        if (emailsSnapshot.size > 0) {
          documentsByCollection['generated_emails'] = (documentsByCollection['generated_emails'] || 0) + emailsSnapshot.size;
        }
      } catch (error) {}
    }
    
    console.log(`Total orphaned users: ${orphanedUsers.length}`);
    console.log(`Total documents found: ${totalDocuments}`);
    console.log(`Documents by collection:`);
    Object.entries(documentsByCollection).forEach(([collection, count]) => {
      console.log(`   - ${collection}: ${count}`);
    });
    console.log('');
    
    console.log('💡 Based on the review above, you can now decide:');
    console.log('   1. Delete users and their documents (if they are test/mock data)');
    console.log('   2. Keep documents but delete users (if documents have value)');
    console.log('   3. Keep everything (if needed for historical records)');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  }
}

// Main execution
reviewOrphanedUsersDocuments()
  .then(() => {
    console.log('✅ Review completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Review failed:', error);
    process.exit(1);
  });



