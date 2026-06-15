# Purchase Collection Structure Standard

## Overview

This document defines the **unified, canonical structure** for all Purchase documents in Firestore. All purchases must follow this structure, regardless of how they were created (webhook, manual, migrated).

## Unified Purchase Structure

### Location
- **TypeScript Interface:** `src/types/purchase.ts`
- **Firestore Collection:** `purchases/{purchaseId}`

### Required Fields

```typescript
interface Purchase {
  // Core identification
  id: string;                    // Purchase document ID (UUID for webhook, can be orderId for legacy)
  userId: string;                // User who made the purchase
  customerEmail: string;         // Customer email address
  
  // Purchase items
  items: PurchaseItem[];         // Array of purchased documents
  
  // Financial
  total: number;                 // Total amount in currency units (not cents)
  currency: string;             // Currency code (e.g., "EUR")
  
  // Status
  status: PurchaseStatus;        // 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  
  // Timestamps
  createdAt: Timestamp | Date;  // When purchase was created
  updatedAt: Timestamp | Date;   // Last update timestamp
  
  // Source tracking (REQUIRED)
  source: PurchaseSource;        // 'stripe_webhook' | 'manual' | 'migrated' | 'admin'
}
```

### Optional Fields

```typescript
  // Stripe integration
  stripeSessionId?: string;              // Stripe checkout session ID
  stripePaymentIntentId?: string;        // Stripe payment intent ID
  
  // Document generation tracking
  documentsGenerated?: number;            // Number of documents successfully generated
  documentsFailed?: number;              // Number of documents that failed
  webhookProcessedAt?: Timestamp | Date; // When webhook processed (if applicable)
  
  // Payment metadata
  paymentMethod?: string;                 // Payment method used
  
  // Legacy fields (for backward compatibility)
  orderId?: string;                      // Legacy: client_reference_id from old purchases
  metadata?: Record<string, any>;        // Additional metadata
```

### PurchaseItem Structure

```typescript
interface PurchaseItem {
  // Required
  id: string;                    // Item ID (UUID)
  name: string;                  // Document name (e.g., "Demanda por despido improcedente")
  area: string;                  // Legal area (e.g., "Derecho Laboral (Jurisdicción Social)")
  country: string;               // Country (e.g., "España")
  price: number;                 // Price per item in currency units
  quantity: number;             // Quantity purchased
  status: 'pending' | 'completed' | 'failed';
  
  // Document generation (populated after generation)
  documentId?: string | null;           // Generated document package ID
  storagePath?: string | null;           // Firebase Storage path
  downloadUrl?: string | null;           // Download URL
  generatedAt?: Timestamp | Date;        // When document was generated
  packageFiles?: DocumentPackageFiles;    // Generated files (PDF/Word)
  documents?: GeneratedDocument[];        // Array of generated documents
  error?: string;                        // Error message if generation failed
}
```

### DocumentPackageFiles Structure

```typescript
interface DocumentPackageFiles {
  templatePdf?: GeneratedPackageFile;      // Template PDF
  templateDocx?: GeneratedPackageFile;      // Template Word
  samplePdf?: GeneratedPackageFile;        // Sample PDF
  sampleDocx?: GeneratedPackageFile;        // Sample Word
  studyMaterialPdf?: GeneratedPackageFile;  // Study material PDF
}

interface GeneratedPackageFile {
  path: string;           // Firebase Storage path
  downloadUrl: string;    // Download URL
  contentType: string;     // MIME type
  size: number;          // File size in bytes
  token?: string;        // Optional access token
}
```

## Migration Strategy

### Phase 1: Define Structure ✅
- [x] Create unified `Purchase` interface in `src/types/purchase.ts`
- [x] Include validation and normalization helpers

### Phase 2: Update Code
- [ ] Update webhook code to ensure it follows structure
- [ ] Update dashboard code to use unified interface
- [ ] Update all purchase creation points

### Phase 3: Migrate Existing Purchases
- [ ] Run migration script: `ts-node scripts/migrate-purchases-to-unified-structure.ts --dry-run`
- [ ] Review changes
- [ ] Run migration: `ts-node scripts/migrate-purchases-to-unified-structure.ts`

### Phase 4: Validation
- [ ] Verify all purchases follow structure
- [ ] Update documentation
- [ ] Add validation in webhook code

## Structure Differences

### Old Structure (Legacy)
```typescript
{
  id: "P1llnJ5znwd2PS2qLZnZ",  // Uses client_reference_id
  userId: "...",
  items: [...],
  // Missing: source, documentsGenerated, documentsFailed, stripeSessionId
}
```

### New Structure (Webhook)
```typescript
{
  id: "12f2a4e8-07b7-4b3a-b351-d9034b32baaa",  // UUID
  userId: "...",
  items: [...],
  source: "stripe_webhook",                    // ✅ Required
  stripeSessionId: "cs_live_...",              // ✅ Required for webhook purchases
  documentsGenerated: 0,                       // ✅ Required
  documentsFailed: 1,                          // ✅ Required
  // ... all other fields
}
```

### Unified Structure (After Migration)
```typescript
{
  id: "...",                    // Can be UUID or orderId
  userId: "...",
  items: [...],
  source: "stripe_webhook" | "manual" | "migrated" | "admin",  // ✅ Always present
  documentsGenerated: 0,       // ✅ Always present (default 0)
  documentsFailed: 0,          // ✅ Always present (default 0)
  // ... all fields normalized
}
```

## Validation

### Helper Functions

```typescript
import { validatePurchase, normalizePurchase } from '@/types/purchase';

// Validate structure
if (validatePurchase(purchaseData)) {
  // Purchase is valid
}

// Normalize old structure to new
const normalized = normalizePurchase(oldPurchaseData);
```

## Best Practices

1. **Always use the unified interface** - Import from `@/types/purchase`
2. **Set source field** - Always specify how purchase was created
3. **Initialize counters** - Always set `documentsGenerated: 0` and `documentsFailed: 0` on creation
4. **Use Timestamps** - Use Firestore `Timestamp` or `Date` objects
5. **Preserve legacy data** - Store old fields in `metadata` or `orderId` if needed

## Migration Script

Run the migration script to normalize all existing purchases:

```bash
# Dry run (preview changes)
ts-node --project tsconfig.scripts.json scripts/migrate-purchases-to-unified-structure.ts --dry-run

# Apply changes
ts-node --project tsconfig.scripts.json scripts/migrate-purchases-to-unified-structure.ts
```

## Next Steps

1. ✅ Define unified structure
2. ⏳ Update webhook code to enforce structure
3. ⏳ Update dashboard code to use unified interface
4. ⏳ Run migration script
5. ⏳ Add validation in webhook
6. ⏳ Update all documentation

