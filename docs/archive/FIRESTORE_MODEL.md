# Modelo Completo de Firestore - Avocat LegalTech v3

## Colecciones Principales

### 1. `/users/{uid}` - Perfiles de Usuario

```typescript
interface UserProfile {
  uid: string;                          // ID del usuario (mismo que en Firebase Auth)
  email: string;                        // Email del usuario
  displayName?: string;                 // Nombre para mostrar
  photoURL?: string;                    // URL de la foto de perfil
  createdAt: string;                    // Fecha de creación (ISO)
  lastLoginAt: string;                  // Último login (ISO)
  isActive: boolean;                    // Estado activo/inactivo
  role?: string;                        // Rol: 'estudiante' | 'abogado' | 'admin'
  plan?: string;                        // Plan: 'Estudiantes' | 'Abogados' | 'Reclamación de Cantidades' | 'Acción de Tutela'
  
  // Suscripción
  subscription?: {
    plan: 'free' | 'premium' | 'enterprise';
    startDate: string;
    endDate?: string;
    isActive: boolean;
  };
  
  // Preferencias del usuario
  preferences: {
    language: string;                   // Idioma preferido
    notifications: boolean;             // Habilitar notificaciones
    theme: 'light' | 'dark';           // Tema visual
  };
  
  // Estadísticas del usuario
  stats: {
    totalDocuments: number;             // Total de documentos generados
    totalGenerations: number;           // Total de generaciones
    totalSpent: number;                 // Total gastado (EUR)
    lastGenerationAt?: string;          // Fecha de última generación
  };
  
  // Perfil adicional (opcional)
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    firm?: string;
  };
  
  // Timestamps adicionales
  updatedAt?: string;
  reactivatedAt?: string;
  emailVerified?: boolean;
}
```

### 2. `/documents/{docId}` - Documentos Generados

```typescript
interface DocumentGeneration {
  id: string;                           // ID del documento
  userId: string;                       // ID del usuario que lo generó
  docId: string;                        // ID único del documento
  type: 'reclamacion_cantidades' | 'accion_tutela' | 'general_document';
  areaLegal: string;                    // Área legal (ej: "Derecho Laboral")
  tipoEscrito: string;                  // Tipo de escrito (ej: "Demanda de reclamación")
  filename: string;                     // Nombre del archivo
  mime: string;                         // Tipo MIME (ej: "application/pdf")
  size: number;                         // Tamaño en bytes
  createdAt: string;                    // Fecha de creación (ISO)
  createdAtISO: string;                 // Alias para createdAt
  status: 'completed' | 'failed' | 'processing';
  
  // Metadatos de generación
  metadata: {
    model: string;                      // Modelo usado (ej: "gpt-4o")
    tokensUsed?: number;                // Tokens consumidos
    processingTime: number;             // Tiempo de procesamiento (ms)
    mock: boolean;                      // Si fue generado con datos mock
    ocrFiles?: number;                  // Número de archivos OCR procesados
    confidence?: number;                // Confianza del OCR (0-100)
    elapsedMs?: number;                 // Tiempo transcurrido (ms)
  };
  
  // Información de almacenamiento
  storage: {
    docId: string;                      // ID del documento
    storagePath: string;                // Ruta en Storage (ej: "users/{uid}/documents/{docId}.pdf")
    bucket: string;                     // Bucket de Storage
    size: number;                       // Tamaño del archivo
    downloadUrl?: string;               // URL de descarga (temporal)
  };
  
  // Contenido del documento
  content: {
    inputData: any;                     // Datos de entrada usados para generar
    extractedText?: string;             // Texto extraído (si usó OCR)
    generatedContent: any;              // Contenido generado por IA
  };
  
  // Información de pricing
  pricing: {
    cost: number;                       // Coste del documento (EUR)
    currency: 'EUR';
    plan: string;                       // Plan usado
  };
  
  // Campos adicionales
  tono?: string;                        // Tono del documento ('formal' | 'informal' | 'técnico')
  plantillaId?: string;                 // ID de plantilla usada (si aplica)
}
```

### 3. `/purchases/{purchaseId}` - Compras y Transacciones

```typescript
interface Purchase {
  id: string;                           // ID de la compra
  userId: string;                       // ID del usuario
  purchaseId: string;                   // Alias para id
  type: 'subscription' | 'credits' | 'document';
  amount: number;                       // Monto total (EUR)
  currency: 'EUR';
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';
  createdAt: string;                    // Fecha de compra (ISO)
  date?: string;                        // Alias para createdAt
  
  // Información de pago
  paymentMethod: string;                // Método de pago (ej: "stripe")
  description: string;                  // Descripción de la compra
  
  // Items de la compra (para compras de documentos)
  items?: Array<{
    id: string;
    name: string;                       // Nombre del documento
    price: number;                      // Precio unitario
    quantity: number;                   // Cantidad
    area: string;                       // Área legal
  }>;
  
  // Metadatos adicionales
  metadata: {
    planId?: string;                    // ID del plan (si es suscripción)
    credits?: number;                   // Créditos adquiridos
    documentId?: string;                // ID del documento (si es compra de documento)
    stripePaymentIntentId?: string;     // ID de intención de pago de Stripe
    stripeSessionId?: string;           // ID de sesión de Stripe
    customerEmail?: string;             // Email del cliente
  };
  
  total?: number;                       // Total de la compra (alias para amount)
}
```

### 4. `/reclamaciones/{reclId}` - Reclamaciones de Cantidades

```typescript
interface Reclamacion {
  id: string;                           // ID de la reclamación
  userId: string;                       // ID del usuario
  titulo: string;                       // Título de la reclamación
  fechaISO: string;                     // Fecha de creación (ISO)
  estado: 'pendiente' | 'completada' | 'cancelada';
  
  // Datos del demandante
  demandante: {
    nombre: string;
    dni: string;
    domicilio: string;
    telefono: string;
    email?: string;
  };
  
  // Datos del demandado
  demandada: {
    nombre: string;
    cif: string;
    domicilio: string;
  };
  
  // Hechos del caso
  hechos: {
    primer: {
      tipoContrato: string;
      jornada: string;
      coeficienteParcialidad: string;
      tareas: string;
      antiguedad: string;
      duracion: string;
      salario: string;
      convenio: string;
    };
    segundo: {
      cantidadesAdeudadas: string[];
      interesDemora: boolean;
    };
    tercer: {
      cargoSindical: boolean;
    };
    cuarto: {
      fechaPapeleta: string;
      fechaConciliacion: string;
      resultado: string;
    };
  };
  
  // Fundamentos legales
  fundamentos: {
    primero: string;
    segundo: string;
    tercero: string;
    cuarto: string;
  };
  
  // Petitorio
  petitorio: {
    cantidadReclamada: string;
    intereses: boolean;
    lugar: string;
    fecha: string;
  };
  
  // Otrosí
  otrosi: {
    asistenciaLetrada: boolean;
    mediosPrueba: {
      documental: string[];
      interrogatorio: string;
    };
  };
  
  // Información de OCR
  ocr?: {
    files: Array<{
      filename: string;
      text: string;
      confidence?: number;
    }>;
    summary?: {
      totalFiles: number;
      totalPages: number;
      confidence: number;
    };
  };
  
  // Documentos asociados
  documentos?: number;                  // Cantidad de documentos
  documentId?: string;                  // ID del documento generado
  storagePath?: string;                 // Ruta del documento en Storage
  
  // Métricas
  precision?: number;                   // Precisión de la reclamación
  precio?: number;                      // Precio de la generación
  cuantia?: number;                     // Cuantía reclamada
  
  // Datos adicionales
  derecho?: string;                     // Tipo de derecho
  ciudad?: string;                      // Ciudad
}
```

### 5. `/tutelas/{tutelaId}` - Acciones de Tutela

```typescript
interface Tutela {
  id: string;                           // ID de la tutela
  userId: string;                       // ID del usuario
  titulo: string;                       // Título de la tutela
  fechaISO: string;                     // Fecha de creación (ISO)
  estado: 'pendiente' | 'completada' | 'cancelada';
  
  // Información básica
  datosBasicos: {
    nombreDemandante: string;
    identificacion: string;
    domicilio: string;
    telefono?: string;
    email?: string;
  };
  
  // Datos del proceso
  datosProceso: {
    juzgado: string;
    expediente?: string;
    fechaHechos: string;
  };
  
  // Hechos y peticiones
  hechos: string;                       // Descripción de los hechos
  peticiones: string;                   // Peticiones específicas
  
  // Documentos asociados
  documentos?: number;
  documentId?: string;
  storagePath?: string;
  
  // Métricas
  precision?: number;
  precio?: number;
  
  // Datos adicionales
  derecho?: string;
  ciudad?: string;
}
```

### 6. `/users/{uid}/documents/{docId}` - Documentos por Usuario (Subcolección)

Estructura igual a `/documents/{docId}` pero organizada bajo el usuario.

### 7. `/users/{uid}/documents/{docId}/analysis/{analysisId}` - Análisis de Documentos (Subcolección)

```typescript
interface DocumentAnalysis {
  analysisId: string;                   // ID del análisis
  docId: string;                        // ID del documento analizado
  userId: string;                       // ID del usuario
  analysisType: 'legal' | 'risk' | 'summary' | 'recommendations';
  content: string;                      // Contenido del análisis
  summary: string;                      // Resumen del análisis
  risks: string[];                      // Lista de riesgos identificados
  recommendations: string[];            // Recomendaciones
  createdAt: string;                    // Fecha de creación (ISO)
  status: 'completed' | 'failed' | 'pending';
  
  // Metadatos
  metadata: {
    model: string;                      // Modelo usado
    tokensUsed: number;                 // Tokens consumidos
    finishReason: string;               // Razón de finalización
    createdAt: string;                  // Fecha de creación
    processingTime: number;             // Tiempo de procesamiento (ms)
  };
}
```

### 8. `/document_analysis/{analysisId}` - Análisis Global de Documentos

Estructura igual a la subcolección de análisis, pero como colección global para búsquedas más eficientes.

### 9. `/analytics/users/{userId}/{period}/{date}` - Analytics por Usuario

```typescript
interface UserAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string;                         // Fecha del período
  
  // Métricas generales
  metrics: {
    documentsGenerated: number;         // Documentos generados
    totalSpent: number;                 // Total gastado (EUR)
    averageProcessingTime: number;      // Tiempo promedio de procesamiento (ms)
    mostUsedArea: string;               // Área legal más usada
    mostUsedType: string;               // Tipo de escrito más usado
    successRate: number;                // Tasa de éxito (0-100)
    ocrUsage: number;                   // Uso de OCR
    mockUsage: number;                  // Uso de datos mock
  };
  
  // Desglose detallado
  breakdown: {
    byArea: Record<string, number>;     // Documentos por área legal
    byType: Record<string, number>;     // Documentos por tipo
    byHour: Record<string, number>;     // Documentos por hora del día
    byDay: Record<string, number>;      // Documentos por día de la semana
  };
}
```

### 10. `/analytics/system/{period}/{date}` - Analytics del Sistema

```typescript
interface SystemStats {
  date: string;                         // Fecha del período
  period: 'daily' | 'weekly' | 'monthly';
  
  // Estadísticas de usuarios
  users: {
    total: number;                      // Total de usuarios
    active: number;                     // Usuarios activos
    new: number;                        // Usuarios nuevos
    churned: number;                    // Usuarios que abandonaron
  };
  
  // Estadísticas de documentos
  documents: {
    total: number;                      // Total de documentos generados
    byType: Record<string, number>;     // Por tipo de documento
    byArea: Record<string, number>;     // Por área legal
    successRate: number;                // Tasa de éxito
    averageProcessingTime: number;      // Tiempo promedio (ms)
  };
  
  // Estadísticas de ingresos
  revenue: {
    total: number;                      // Ingresos totales (EUR)
    byPlan: Record<string, number>;     // Ingresos por plan
    averagePerUser: number;             // Promedio por usuario
  };
  
  // Rendimiento del sistema
  performance: {
    averageResponseTime: number;        // Tiempo promedio de respuesta (ms)
    errorRate: number;                  // Tasa de errores (0-100)
    uptime: number;                     // Tiempo de actividad (0-100)
  };
}
```

### 11. `/email_sends/{emailId}` - Emails Enviados

```typescript
interface EmailSend {
  emailId: string;                      // ID único del email
  userEmail: string;                    // Email del destinatario
  userId?: string;                      // ID del usuario
  subject: string;                      // Asunto del email
  pdfUrl?: string;                      // URL del PDF adjunto
  downloadUrl?: string;                 // URL de descarga del documento
  documentName?: string;                // Nombre del documento
  areaLegal?: string;                   // Área legal del documento
  filename?: string;                    // Nombre del archivo
  sentAt: string;                       // Fecha de envío (ISO)
  status: 'sent' | 'failed' | 'pending';
  provider: string;                     // Proveedor de email (ej: "nodemailer")
  messageId?: string;                   // ID del mensaje del proveedor
  
  // Metadatos
  metadata: {
    type: string;                       // Tipo de email
    generatedBy: string;                // Generado por (ej: "api")
    version: string;                    // Versión
  };
}
```

### 12. `/generated_emails/{emailId}` - Emails Generados (Historial)

```typescript
interface EmailRecord {
  emailId: string;
  userId: string;
  userEmail: string;
  userName: string;
  docId: string;
  downloadUrl: string;
  sentAt: string;
  status: 'generated' | 'sent' | 'failed';
  
  // Contenido del email
  content: {
    subject: string;
    totalDocuments: number;
    totalSpent: number;
    successRate: number;
    averageProcessingTime: number;
  };
  
  // Metadatos
  metadata: {
    generatedBy: string;
    type: string;
    version: string;
  };
  
  createdAt?: string;                   // Fecha de creación
}
```

### 13. `/cases/{caseId}` - Casos Legales (para abogados)

```typescript
interface Case {
  id: string;                           // ID del caso
  userId: string;                       // ID del abogado
  titulo: string;                       // Título del caso
  estado: 'abierto' | 'en_proceso' | 'cerrado';
  areaLegal: string;                    // Área legal
  documentos: string[];                 // IDs de documentos asociados
  descripcion?: string;                 // Descripción del caso
  createdAt?: string;                   // Fecha de creación
  updatedAt?: string;                   // Fecha de actualización
  
  // Campos adicionales (si aplican)
  amount?: number;                      // Monto del caso
  cliente?: string;                     // Nombre del cliente
  fechaVencimiento?: string;            // Fecha de vencimiento
}
```

### 14. `/admin/users` - Lista de Usuarios (para administración)

Colección utilizada para sincronización y gestión administrativa. Puede contener referencias o copias resumidas de usuarios.

### 15. `/admin/stats` - Estadísticas Globales (para administración)

Similar a `/analytics/system` pero optimizado para el panel de administración.

## Relaciones entre Colecciones

```
users/{uid}
  ├── documents/{docId} (subcolección)
  │     └── analysis/{analysisId} (subcolección)
  │
documents/{docId} (colección global)
  └── Referencia: userId -> users/{uid}

purchases/{purchaseId}
  └── Referencia: userId -> users/{uid}
  └── Referencia: metadata.documentId -> documents/{docId}

reclamaciones/{reclId}
  └── Referencia: userId -> users/{uid}
  └── Referencia: documentId -> documents/{docId}

tutelas/{tutelaId}
  └── Referencia: userId -> users/{uid}
  └── Referencia: documentId -> documents/{docId}

cases/{caseId}
  └── Referencia: userId -> users/{uid}
  └── Referencia: documentos[] -> documents/{docId}

email_sends/{emailId}
  └── Referencia: userId -> users/{uid}

analytics/users/{userId}/{period}/{date}
  └── Referencia: userId -> users/{uid}
```

## Índices Recomendados

Para optimizar las consultas, se recomiendan los siguientes índices compuestos:

1. **`documents`**: `userId` + `createdAt` (desc)
2. **`purchases`**: `userId` + `createdAt` (desc)
3. **`reclamaciones`**: `userId` + `fechaISO` (desc)
4. **`tutelas`**: `userId` + `fechaISO` (desc)
5. **`cases`**: `userId` + `estado` + `createdAt` (desc)
6. **`email_sends`**: `userId` + `sentAt` (desc)

## Notas Importantes

1. **Consistencia**: Los documentos deben mantener consistencia entre las colecciones globales y las subcolecciones de usuario.
2. **Timestamps**: Todas las fechas deben estar en formato ISO 8601 string.
3. **IDs**: Los IDs de documentos deben ser únicos y generados con UUID v4.
4. **Seguridad**: Todas las colecciones deben tener reglas de seguridad configuradas en Firestore.
5. **Soft Deletes**: Al eliminar usuarios, se marca `isActive: false` en lugar de borrar el documento.




