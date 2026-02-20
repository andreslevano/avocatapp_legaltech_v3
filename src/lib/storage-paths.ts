/**
 * Storage path hierarchy: UID → userType → documentType → subfolder → file
 *
 * Structure:
 *   {uid}/{userType}/{documentType}/{documents|ocr}/{...}
 *
 * User types (from sidebar): abogado | estudiante | autoservicio
 * Document types follow menu options for each user type.
 */

export type StorageUserType = 'abogado' | 'estudiante' | 'autoservicio';

/** Document types per user type - aligned with Sidebar menu structure */
export type StorageDocumentType =
  // Abogados
  | 'dashboard'
  | 'casos'
  | 'clientes'
  // Estudiantes
  | 'documentos'
  // Autoservicio
  | 'generacion-escritos'
  | 'accion-tutela'
  | 'reclamacion-cantidades'
  | 'analisis-documentos'
  | 'extraccion-datos'
  | 'revision-email';

export interface StorageContext {
  userType: StorageUserType;
  documentType: StorageDocumentType;
}

/** Legacy document type strings (from Firestore, API) mapped to new StorageContext */
const LEGACY_TO_CONTEXT: Record<string, StorageContext> = {
  reclamacion_cantidades: { userType: 'autoservicio', documentType: 'reclamacion-cantidades' },
  accion_tutela: { userType: 'autoservicio', documentType: 'accion-tutela' },
  estudiantes: { userType: 'estudiante', documentType: 'documentos' },
  reclamacion: { userType: 'autoservicio', documentType: 'reclamacion-cantidades' },
  tutela: { userType: 'autoservicio', documentType: 'accion-tutela' },
};

/** User plan (from Firestore) mapped to StorageContext */
const PLAN_TO_CONTEXT: Record<string, StorageContext> = {
  Estudiantes: { userType: 'estudiante', documentType: 'documentos' },
  'Reclamación de Cantidades': { userType: 'autoservicio', documentType: 'reclamacion-cantidades' },
};

/**
 * Resolves StorageContext from legacy documentType or user plan.
 */
export function resolveStorageContext(
  documentType?: string | null,
  userPlan?: string | null
): StorageContext {
  if (documentType && LEGACY_TO_CONTEXT[documentType]) {
    return LEGACY_TO_CONTEXT[documentType];
  }
  if (userPlan && PLAN_TO_CONTEXT[userPlan]) {
    return PLAN_TO_CONTEXT[userPlan];
  }
  // Default: abogado dashboard
  return { userType: 'abogado', documentType: 'dashboard' };
}

/**
 * Builds storage path: {uid}/{userType}/{documentType}/{subfolder}/{...}
 */
export function buildStoragePath(
  uid: string,
  context: StorageContext,
  subfolder: 'documents' | 'ocr',
  ...pathParts: string[]
): string {
  const base = `${uid}/${context.userType}/${context.documentType}/${subfolder}`;
  const rest = pathParts.filter(Boolean).join('/');
  return rest ? `${base}/${rest}` : base;
}

/**
 * Path for generated PDF: {uid}/{userType}/{documentType}/documents/{documentId}/{fileName}
 */
export function buildDocumentPath(
  uid: string,
  context: StorageContext,
  documentId: string,
  fileName: string
): string {
  return buildStoragePath(uid, context, 'documents', documentId, fileName);
}

/**
 * Path for uploaded file (OCR): {uid}/{userType}/{documentType}/ocr/{fileId}_{originalName}
 */
export function buildOcrPath(
  uid: string,
  context: StorageContext,
  fileId: string,
  originalFileName: string
): string {
  return buildStoragePath(uid, context, 'ocr', `${fileId}_${originalFileName}`);
}
