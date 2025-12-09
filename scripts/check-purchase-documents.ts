#!/usr/bin/env ts-node
/**
 * Script to check if documents were generated for a purchase
 * Usage: ts-node scripts/check-purchase-documents.ts <purchaseId>
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let app: admin.app.App;

try {
  if (require('fs').existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Use default credentials (for Cloud Functions environment)
    app = admin.initializeApp();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

async function checkPurchaseDocuments(purchaseId?: string) {
  try {
    let purchaseRef: admin.firestore.DocumentReference;
    
    if (purchaseId) {
      purchaseRef = db.collection('purchases').doc(purchaseId);
    } else {
      // Get the most recent purchase
      const snapshot = await db.collection('purchases')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log('❌ No purchases found');
        return;
      }
      
      purchaseRef = snapshot.docs[0].ref;
      purchaseId = snapshot.docs[0].id;
    }
    
    const purchaseDoc = await purchaseRef.get();
    
    if (!purchaseDoc.exists) {
      console.log(`❌ Purchase ${purchaseId} not found`);
      return;
    }
    
    const purchaseData = purchaseDoc.data();
    
    console.log('\n📦 Purchase Information:');
    console.log(`   ID: ${purchaseId}`);
    console.log(`   Status: ${purchaseData?.status || 'unknown'}`);
    console.log(`   Created: ${purchaseData?.createdAt?.toDate?.() || purchaseData?.createdAt}`);
    console.log(`   User ID: ${purchaseData?.userId}`);
    console.log(`   Customer Email: ${purchaseData?.customerEmail}`);
    console.log(`   Total: ${purchaseData?.total} ${purchaseData?.currency}`);
    console.log(`   Documents Generated: ${purchaseData?.documentsGenerated || 0}`);
    console.log(`   Documents Failed: ${purchaseData?.documentsFailed || 0}`);
    
    if (purchaseData?.items && Array.isArray(purchaseData.items)) {
      console.log(`\n📄 Items (${purchaseData.items.length}):`);
      purchaseData.items.forEach((item: any, index: number) => {
        console.log(`\n   Item ${index + 1}:`);
        console.log(`     Name: ${item.name}`);
        console.log(`     Status: ${item.status || 'unknown'}`);
        console.log(`     Price: ${item.price} ${purchaseData.currency}`);
        console.log(`     Quantity: ${item.quantity}`);
        
        if (item.packageFiles) {
          console.log(`     ✅ Package Files Available:`);
          if (item.packageFiles.templatePdf) {
            console.log(`        - Template PDF: ${item.packageFiles.templatePdf.downloadUrl}`);
          }
          if (item.packageFiles.templateDocx) {
            console.log(`        - Template Word: ${item.packageFiles.templateDocx.downloadUrl}`);
          }
          if (item.packageFiles.samplePdf) {
            console.log(`        - Sample PDF: ${item.packageFiles.samplePdf.downloadUrl}`);
          }
          if (item.packageFiles.sampleDocx) {
            console.log(`        - Sample Word: ${item.packageFiles.sampleDocx.downloadUrl}`);
          }
          if (item.packageFiles.studyMaterialPdf) {
            console.log(`        - Study Material PDF: ${item.packageFiles.studyMaterialPdf.downloadUrl}`);
          }
        } else {
          console.log(`     ❌ No package files found`);
        }
        
        if (item.downloadUrl) {
          console.log(`     Download URL: ${item.downloadUrl}`);
        }
        if (item.storagePath) {
          console.log(`     Storage Path: ${item.storagePath}`);
        }
      });
    } else {
      console.log('\n❌ No items found in purchase');
    }
    
    // Check Firebase Storage
    if (purchaseData?.userId) {
      console.log(`\n🔍 Checking Firebase Storage for user: ${purchaseData.userId}`);
      const storage = admin.storage();
      const bucket = storage.bucket();
      
      // List files in user's documents folder
      const [files] = await bucket.getFiles({
        prefix: `students/${purchaseData.userId}/`,
        maxResults: 50
      });
      
      if (files.length > 0) {
        console.log(`\n📁 Found ${files.length} files in Storage:`);
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`);
          const size = typeof file.metadata.size === 'number' ? file.metadata.size : 0;
          console.log(`      Size: ${(size / 1024).toFixed(2)} KB`);
          console.log(`      Created: ${file.metadata.timeCreated || 'Unknown'}`);
        });
      } else {
        console.log('\n❌ No files found in Storage');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking purchase:', error);
  } finally {
    process.exit(0);
  }
}

// Get purchase ID from command line or use most recent
const purchaseId = process.argv[2];
checkPurchaseDocuments(purchaseId);

