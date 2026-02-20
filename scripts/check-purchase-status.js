/**
 * Diagnostic script to check purchase status in Firestore
 * Usage: node scripts/check-purchase-status.js <purchaseId>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPurchaseStatus(purchaseId) {
  try {
    console.log(`\n🔍 Checking purchase: ${purchaseId}\n`);
    
    const purchaseRef = db.collection('purchases').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();
    
    if (!purchaseDoc.exists) {
      console.log('❌ Purchase not found!');
      return;
    }
    
    const data = purchaseDoc.data();
    
    console.log('📋 Purchase Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${purchaseId}`);
    console.log(`Status: ${data.status || 'NOT SET'}`);
    console.log(`Document Type: ${data.documentType || 'NOT SET'}`);
    console.log(`Customer Email: ${data.customerEmail || 'NOT SET'}`);
    console.log(`Currency: ${data.currency || 'NOT SET'}`);
    console.log(`Total: ${data.total || 0}`);
    console.log(`Created At: ${data.createdAt?.toDate?.() || data.createdAt || 'NOT SET'}`);
    console.log(`Updated At: ${data.updatedAt?.toDate?.() || data.updatedAt || 'NOT SET'}`);
    console.log(`\n📊 Document Generation Status:`);
    console.log(`Documents Generated: ${data.documentsGenerated ?? 'NOT SET (null/undefined)'}`);
    console.log(`Documents Failed: ${data.documentsFailed ?? 'NOT SET (null/undefined)'}`);
    console.log(`Total Items: ${data.items?.length || 0}`);
    
    console.log(`\n📦 Items Status:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!data.items || data.items.length === 0) {
      console.log('⚠️  No items found!');
    } else {
      data.items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}: ${item.name || 'UNNAMED'}`);
        console.log(`  Status: ${item.status || 'NOT SET'}`);
        console.log(`  Quantity: ${item.quantity || 0}`);
        console.log(`  Area: ${item.area || 'NOT SET'}`);
        console.log(`  Country: ${item.country || 'NOT SET'}`);
        console.log(`  Has packageFiles: ${item.packageFiles ? 'YES ✅' : 'NO ❌'}`);
        
        if (item.packageFiles) {
          const files = Object.keys(item.packageFiles);
          console.log(`  Package Files: ${files.length} files`);
          files.forEach(fileKey => {
            const file = item.packageFiles[fileKey];
            if (file?.downloadUrl) {
              console.log(`    - ${fileKey}: ✅ ${file.downloadUrl.substring(0, 50)}...`);
            } else {
              console.log(`    - ${fileKey}: ❌ No download URL`);
            }
          });
        }
        
        console.log(`  Document ID: ${item.documentId || 'NOT SET'}`);
        console.log(`  Storage Path: ${item.storagePath || 'NOT SET'}`);
        console.log(`  Download URL: ${item.downloadUrl || 'NOT SET'}`);
        console.log(`  Generated Count: ${item.generatedCount || 'NOT SET'}`);
        console.log(`  Requested Count: ${item.requestedCount || 'NOT SET'}`);
        
        if (item.error) {
          console.log(`  ⚠️  Error: ${item.error}`);
        }
      });
    }
    
    // Check polling conditions
    console.log(`\n🔍 Polling Condition Check:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const documentsGenerated = data.documentsGenerated ?? 0;
    const totalItems = data.items?.length || 0;
    const items = data.items || [];
    const completedItems = items.filter(item => item.status === 'completed').length;
    const failedItems = items.filter(item => item.status === 'failed').length;
    const hasPackageFiles = items.some(item => item.packageFiles && Object.keys(item.packageFiles).length > 0);
    
    console.log(`Condition 1 - documentsGenerated > 0: ${documentsGenerated > 0 ? '✅ YES' : '❌ NO'} (value: ${documentsGenerated})`);
    console.log(`Condition 2 - All items processed: ${(completedItems + failedItems) === totalItems && totalItems > 0 ? '✅ YES' : '❌ NO'} (${completedItems + failedItems}/${totalItems})`);
    console.log(`Condition 3 - Has packageFiles: ${hasPackageFiles ? '✅ YES' : '❌ NO'}`);
    
    const allItemsProcessed = (completedItems + failedItems) === totalItems && totalItems > 0;
    const documentsReady = documentsGenerated > 0 || allItemsProcessed || hasPackageFiles;
    
    console.log(`\n📊 Final Assessment:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Documents Ready: ${documentsReady ? '✅ YES' : '❌ NO'}`);
    console.log(`Should stop polling: ${documentsReady ? '✅ YES' : '❌ NO'}`);
    
    if (!documentsReady) {
      console.log(`\n⚠️  ISSUE DETECTED: Polling will continue because:`);
      if (documentsGenerated === 0) console.log(`  - documentsGenerated is 0 (should be > 0)`);
      if (!allItemsProcessed) console.log(`  - Not all items are processed (${completedItems + failedItems}/${totalItems})`);
      if (!hasPackageFiles) console.log(`  - No items have packageFiles`);
    }
    
    console.log(`\n✅ Check complete!\n`);
    
  } catch (error) {
    console.error('❌ Error checking purchase:', error);
  }
}

// Get purchase ID from command line
const purchaseId = process.argv[2];

if (!purchaseId) {
  console.error('❌ Please provide a purchase ID');
  console.log('Usage: node scripts/check-purchase-status.js <purchaseId>');
  process.exit(1);
}

checkPurchaseStatus(purchaseId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
