// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'lawyer';
  plan?: 'Abogados' | 'Estudiantes' | 'Reclamación de Cantidades' | 'Acción de Tutela';
  firm?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document types
export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: 'contract' | 'case_file' | 'legal_brief' | 'other';
  userId: string;
  clientId?: string;
  tags: string[];
  analysis?: DocumentAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentAnalysis {
  id: string;
  documentId: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  recommendations: string[];
  aiGenerated: boolean;
  createdAt: Date;
}

// Case types
export interface LegalCase {
  id: string;
  title: string;
  description: string;
  clientId: string;
  lawyerId: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  documents: string[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Client types
export interface Client {
  id: string;
  email: string;
  name: string;
  phone?: string;
  firm?: string;
  cases: string[];
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Payment types
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  isPopular: boolean;
}

// AI Analysis types
export interface AIAnalysisRequest {
  documentId: string;
  analysisType: 'summary' | 'risk_assessment' | 'legal_research' | 'contract_review';
  customPrompt?: string;
}

export interface AIAnalysisResponse {
  id: string;
  requestId: string;
  content: string;
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
  };
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Document Processing types for Reclamación de Cantidades
export interface UploadedDocument {
  id: string;
  name: string;
  file: File;
  size: number;
  type: string;
  category?: DocumentCategory;
  uploadDate: Date;
  previewUrl?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  color: string;
}

export interface DocumentSummary {
  totalDocuments: number;
  categorizedDocuments: { [categoryId: string]: UploadedDocument[] };
  missingRequired: string[];
  analysisComplete: boolean;
  totalAmount?: number; // Cantidad total reclamada (opcional)
  precision?: number; // Precisión del análisis OCR (opcional, 0-100)
}

export interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  type: 'reclamacion_cantidades' | 'accion_tutela';
  generatedAt: Date;
  downloadUrl?: string;
}

// Purchase History types
export interface PurchaseHistory {
  id: string;
  userId: string;
  documentTitle: string;
  documentType: 'reclamacion_cantidades' | 'accion_tutela';
  purchaseDate: Date;
  price: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  documentCount: number;
  accuracy: number;
  amountClaimed?: number; // Amount claimed in the document (for reclamacion_cantidades)
  files: {
    wordUrl?: string;
    pdfUrl?: string;
  };
  emailSent: boolean;
  emailSentAt?: Date;
  paid?: boolean; // Si el documento está pagado
  docId?: string; // ID del documento en Firestore
  documentContent?: string; // Contenido del documento generado (texto)
  uploadedDocuments?: string[]; // Lista de nombres de documentos subidos
}
