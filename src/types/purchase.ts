/**
 * Unified Purchase Interface
 * 
 * This is the canonical definition for Purchase documents in Firestore.
 * All purchases (webhook-created, manual, migrated) must follow this structure.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Generated package file information
 */
export interface GeneratedPackageFile {
  path: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  token?: string;
}

/**
 * Package files structure for a document
 */
export interface DocumentPackageFiles {
  templatePdf?: GeneratedPackageFile;
  templateDocx?: GeneratedPackageFile;
  samplePdf?: GeneratedPackageFile;
  sampleDocx?: GeneratedPackageFile;
  studyMaterialPdf?: GeneratedPackageFile;
}

/**
 * Generated document information
 */
export interface GeneratedDocument {
  documentId: string;
  storagePath: string | null;
  downloadUrl: string | null;
  generatedAt: Timestamp | Date;
  packageFiles: DocumentPackageFiles;
}

/**
 * Purchase item (document type purchased)
 */
export interface PurchaseItem {
  id: string;
  name: string;
  area: string;
  country: string;
  price: number;
  quantity: number;
  status: 'pending' | 'completed' | 'failed';
  
  // Document generation fields (populated after generation)
  documentId?: string | null;
  storagePath?: string | null;
  downloadUrl?: string | null;
  generatedAt?: Timestamp | Date;
  packageFiles?: DocumentPackageFiles;
  documents?: GeneratedDocument[];
  error?: string;
}

/**
 * Purchase source
 */
export type PurchaseSource = 'stripe_webhook' | 'manual' | 'migrated' | 'admin';

/**
 * Purchase status
 */
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

/**
 * Unified Purchase interface - Canonical structure for all purchases
 */
export interface Purchase {
  // Required fields
  id: string;
  userId: string;
  customerEmail: string;
  items: PurchaseItem[];
  total: number;
  currency: string;
  status: PurchaseStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  
  // Source tracking
  source: PurchaseSource;
  
  // Stripe integration (if applicable)
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  
  // Document generation tracking
  documentsGenerated?: number;
  documentsFailed?: number;
  webhookProcessedAt?: Timestamp | Date;
  
  // Payment metadata
  paymentMethod?: string;
  
  // Legacy fields (for backward compatibility)
  metadata?: Record<string, any>;
  orderId?: string; // Legacy: client_reference_id from old purchases
}

/**
 * Purchase creation input (for creating new purchases)
 */
export interface CreatePurchaseInput {
  userId: string;
  customerEmail: string;
  items: Omit<PurchaseItem, 'id' | 'status' | 'documentId' | 'storagePath' | 'downloadUrl' | 'generatedAt' | 'packageFiles' | 'documents' | 'error'>[];
  total: number;
  currency?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  source?: PurchaseSource;
  paymentMethod?: string;
}

/**
 * Helper function to validate purchase structure
 */
export function validatePurchase(purchase: any): purchase is Purchase {
  if (!purchase || typeof purchase !== 'object') return false;
  
  // Required fields
  if (!purchase.id || typeof purchase.id !== 'string') return false;
  if (!purchase.userId || typeof purchase.userId !== 'string') return false;
  if (!purchase.customerEmail || typeof purchase.customerEmail !== 'string') return false;
  if (!Array.isArray(purchase.items)) return false;
  if (typeof purchase.total !== 'number') return false;
  if (typeof purchase.currency !== 'string') return false;
  if (!purchase.status || !['pending', 'completed', 'failed', 'cancelled', 'refunded'].includes(purchase.status)) return false;
  if (!purchase.source || !['stripe_webhook', 'manual', 'migrated', 'admin'].includes(purchase.source)) return false;
  
  // Validate items
  for (const item of purchase.items) {
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.name || typeof item.name !== 'string') return false;
    if (!item.area || typeof item.area !== 'string') return false;
    if (typeof item.price !== 'number') return false;
    if (typeof item.quantity !== 'number') return false;
  }
  
  return true;
}

/**
 * Helper function to normalize purchase (convert old structure to new)
 */
export function normalizePurchase(purchase: any): Purchase {
  // If already normalized, return as-is
  if (validatePurchase(purchase)) {
    return purchase;
  }
  
  // Normalize old structure
  const normalized: Purchase = {
    id: purchase.id || purchase.orderId || '',
    userId: purchase.userId || 'unknown',
    customerEmail: purchase.customerEmail || purchase.email || '',
    items: Array.isArray(purchase.items) ? purchase.items.map((item: any) => ({
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
    })) : [],
    total: purchase.total || 0,
    currency: purchase.currency || 'EUR',
    status: purchase.status || 'pending',
    createdAt: purchase.createdAt || new Date(),
    updatedAt: purchase.updatedAt || purchase.createdAt || new Date(),
    source: purchase.source || (purchase.stripeSessionId ? 'stripe_webhook' : 'manual'),
    stripeSessionId: purchase.stripeSessionId,
    stripePaymentIntentId: purchase.stripePaymentIntentId,
    documentsGenerated: purchase.documentsGenerated || 0,
    documentsFailed: purchase.documentsFailed || 0,
    webhookProcessedAt: purchase.webhookProcessedAt,
    paymentMethod: purchase.paymentMethod,
    // Preserve legacy fields
    orderId: purchase.orderId || purchase.client_reference_id,
    metadata: purchase.metadata || {},
  };
  
  return normalized;
}

