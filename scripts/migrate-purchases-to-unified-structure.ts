#!/usr/bin/env ts-node
/**
 * Migration Script: Normalize all purchases to unified structure
 * 
 * This script:
 * 1. Reads all purchases from Firestore
 * 2. Normalizes them to the unified Purchase structure
 * 3. Updates them in Firestore
 * 
 * Usage: ts-node --project tsconfig.scripts.json scripts/migrate-purchases-to-unified-structure.ts [--dry-run]
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

/**
 * Normalize purchase to unified structure
 */
function normalizePurchase(purchaseData: any, docId: string): any {
  const normalized: any = {
    // Required fields
    id: purchaseData.id || docId,
    userId: purchaseData.userId || 'unknown',
    customerEmail: purchaseData.customerEmail || purchaseData.email || '',
    items: Array.isArray(purchaseData.items) 
      ? purchaseData.items.map((item: any) => ({
          id: item.id || '',
          name: item.name || '',
          area: item.area || '',
          country: item.country || 'España',
          price: item.price || 0,
          quantity: item.quantity || 1,
          status: item.status || 'pending',
          documentId: item.documentId || null,
          storagePath: item.storagePath || null,
          downloadUrl: item.downloadUrl || null,
          packageFiles: item.packageFiles || {},
          documents: item.documents || [],
          error: item.error,
        }))
      : [],
    total: purchaseData.total || 0,
    currency: purchaseData.currency || 'EUR',
    status: purchaseData.status || 'pending',
    createdAt: purchaseData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Source tracking
    source: purchaseData.source || (purchaseData.stripeSessionId ? 'stripe_webhook' : 'manual'),
    
    // Stripe integration
    stripeSessionId: purchaseData.stripeSessionId,
    stripePaymentIntentId: purchaseData.stripePaymentIntentId,
    
    // Document generation tracking
    documentsGenerated: purchaseData.documentsGenerated ?? 0,
    documentsFailed: purchaseData.documentsFailed ?? 0,
    webhookProcessedAt: purchaseData.webhookProcessedAt,
    
    // Payment metadata
    paymentMethod: purchaseData.paymentMethod,
    
    // Legacy fields (preserved for reference)
    orderId: purchaseData.orderId || purchaseData.client_reference_id,
    metadata: purchaseData.metadata || {},
  };
  
  return normalized;
}

/**
 * Check if purchase needs migration
 */
function needsMigration(purchaseData: any): boolean {
  // Check if it has the new structure
  if (!purchaseData.source) return true;
  if (!purchaseData.items || !Array.isArray(purchaseData.items)) return true;
  if (typeof purchaseData.documentsGenerated === 'undefined') return true;
  if (typeof purchaseData.documentsFailed === 'undefined') return true;
  
  // Check if items have proper structure
  for (const item of purchaseData.items) {
    if (!item.id) return true;
    if (typeof item.status === 'undefined') return true;
  }
  
  return false;
}

async function migratePurchases(dryRun: boolean = false) {
  try {
    console.log(`\n${dryRun ? '🔍 DRY RUN' : '🚀 MIGRATION'} - Normalizing purchases to unified structure\n`);
    
    const purchasesRef = db.collection('purchases');
    const snapshot = await purchasesRef.get();
    
    if (snapshot.empty) {
      console.log('No purchases found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} purchases to check.\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const doc of snapshot.docs) {
      const purchaseData = doc.data();
      const docId = doc.id;
      
      try {
        if (!needsMigration(purchaseData)) {
          console.log(`✅ ${docId}: Already normalized, skipping`);
          skipped++;
          continue;
        }
        
        const normalized = normalizePurchase(purchaseData, docId);
        
        console.log(`\n📦 ${docId}:`);
        console.log(`   Old source: ${purchaseData.source || 'none'}`);
        console.log(`   New source: ${normalized.source}`);
        console.log(`   Items: ${normalized.items.length}`);
        console.log(`   Status: ${normalized.status}`);
        
        if (!dryRun) {
          await doc.ref.set(normalized, { merge: true });
          console.log(`   ✅ Migrated`);
        } else {
          console.log(`   🔍 Would migrate (dry run)`);
        }
        
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${docId}:`, error);
        errors++;
      }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Summary:`);
    console.log(`  Total: ${snapshot.size}`);
    console.log(`  Migrated: ${migrated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`${'='.repeat(50)}\n`);
    
    if (dryRun) {
      console.log('🔍 This was a dry run. Use without --dry-run to apply changes.\n');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

migratePurchases(dryRun);

