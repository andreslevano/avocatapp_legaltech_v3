/**
 * Tipos TypeScript para el módulo de Reclamación de Cantidades
 * Basado en diseño técnico: Firestore first
 */

export type ReclamacionStatus =
  | "draft"
  | "waiting_payment"
  | "paid"
  | "error";

export type PaymentStatus =
  | "not_started"
  | "in_process"
  | "paid"
  | "failed";

export interface OcrExtracted {
  fechas?: string[];
  importes?: number[];
  empresas?: string[];
  tipoContrato?: string;
  deudor?: string;
  cantidadTotal?: number;
  [key: string]: any;
}

export interface OcrData {
  rawText: string;
  extracted: OcrExtracted;
}

export interface FormDataRC {
  nombreDemandante?: string;
  dniDemandante?: string;
  direccionDemandante?: string;
  nombreEmpresa?: string;
  cifEmpresa?: string;
  direccionEmpresa?: string;
  descripcionHechos?: string;
  [key: string]: any;
}

export interface DraftHistoryEntry {
  createdAt: string; // ISO string
  prompt: string;
  response: string;
}

export interface DraftingData {
  lastPrompt?: string;
  lastResponse?: string;
  lastResponseFormat?: "markdown" | "html" | "plain";
  history?: DraftHistoryEntry[];
}

export interface PaymentData {
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paidAt?: string | null;
}

export interface StorageFileRef {
  fileName: string;
  path: string;
  uploadedAt: string;
}

export interface FinalPdfRef {
  path: string | null;
  url: string | null;
  generatedAt: string | null;
}

export interface StorageDataRC {
  inputFiles: StorageFileRef[];
  finalPdf: FinalPdfRef;
}

export interface LegalMeta {
  jurisdiction: string;
  tipoProcedimiento: string;
  versionPrompt: string;
  abogadoVirtual: string;
}

export interface ReclamacionCantidades {
  id: string;           // caseId
  uid: string;
  status: ReclamacionStatus;
  createdAt: string;
  updatedAt: string;
  ocr?: OcrData;
  formData?: FormDataRC;
  drafting?: DraftingData;
  payment?: PaymentData;
  storage?: StorageDataRC;
  legalMeta?: LegalMeta;
}

