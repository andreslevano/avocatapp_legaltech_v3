// Modelos de datos para Firestore

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  subscription?: {
    plan: 'free' | 'premium' | 'enterprise';
    startDate: string;
    endDate?: string;
    isActive: boolean;
  };
  preferences: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  stats: {
    totalDocuments: number;
    totalGenerations: number;
    totalSpent: number;
    lastGenerationAt?: string;
  };
}

export interface DocumentGeneration {
  id: string;
  userId: string;
  type: 'reclamacion_cantidades' | 'accion_tutela' | 'general_document';
  areaLegal: string;
  tipoEscrito: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'processing';
  metadata: {
    model: string;
    tokensUsed?: number;
    processingTime: number;
    mock: boolean;
    ocrFiles?: number;
    confidence?: number;
  };
  storage: {
    docId: string;
    storagePath: string;
    size: number;
    downloadUrl?: string;
  };
  content: {
    inputData: any;
    extractedText?: string;
    generatedContent: any;
  };
  pricing: {
    cost: number;
    currency: 'EUR';
    plan: string;
  };
}

export interface Purchase {
  id: string;
  userId: string;
  type: 'subscription' | 'credits' | 'document';
  amount: number;
  currency: 'EUR';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  createdAt: string;
  paymentMethod: string;
  description: string;
  metadata: {
    planId?: string;
    credits?: number;
    documentId?: string;
    stripePaymentIntentId?: string;
  };
}

export interface UserAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string;
  metrics: {
    documentsGenerated: number;
    totalSpent: number;
    averageProcessingTime: number;
    mostUsedArea: string;
    mostUsedType: string;
    successRate: number;
    ocrUsage: number;
    mockUsage: number;
  };
  breakdown: {
    byArea: Record<string, number>;
    byType: Record<string, number>;
    byHour: Record<string, number>;
    byDay: Record<string, number>;
  };
}

export interface SystemStats {
  date: string;
  period: 'daily' | 'weekly' | 'monthly';
  users: {
    total: number;
    active: number;
    new: number;
    churned: number;
  };
  documents: {
    total: number;
    byType: Record<string, number>;
    byArea: Record<string, number>;
    successRate: number;
    averageProcessingTime: number;
  };
  revenue: {
    total: number;
    byPlan: Record<string, number>;
    averagePerUser: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface DocumentAnalysis {
  analysisId: string;
  docId: string;
  userId: string;
  analysisType: 'legal' | 'risk' | 'summary' | 'recommendations';
  content: string;
  summary: string;
  risks: string[];
  recommendations: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    finishReason: string;
    createdAt: string;
    processingTime: number;
  };
  createdAt: string;
  status: 'completed' | 'failed' | 'pending';
}

export interface EmailRecord {
  emailId: string;
  userId: string;
  userEmail: string;
  userName: string;
  docId: string;
  downloadUrl: string;
  sentAt: string;
  status: 'generated' | 'sent' | 'failed';
  content: {
    subject: string;
    totalDocuments: number;
    totalSpent: number;
    successRate: number;
    averageProcessingTime: number;
  };
  metadata: {
    generatedBy: string;
    type: string;
    version: string;
  };
}

export interface EmailSend {
  emailId: string;
  userEmail: string;
  subject: string;
  pdfUrl: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  provider: string;
  messageId: string;
  metadata: {
    type: string;
    generatedBy: string;
    version: string;
  };
}

// Colecciones en Firestore:
// - /users/{uid} -> UserProfile
// - /documents/{docId} -> DocumentGeneration  
// - /purchases/{purchaseId} -> Purchase
// - /analytics/users/{userId}/{period}/{date} -> UserAnalytics
// - /analytics/system/{period}/{date} -> SystemStats
// - /admin/users -> Lista de todos los usuarios para admin
// - /admin/stats -> Estadísticas globales del sistema
// - /users/{uid}/documents/{docId}/analysis/{analysisId} -> DocumentAnalysis
// - /document_analysis/{analysisId} -> DocumentAnalysis (global)
// - /sent_emails/{emailId} -> EmailRecord
// - /email_sends/{sendId} -> EmailSend

