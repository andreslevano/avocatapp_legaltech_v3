# Almacenamiento en Firebase Storage

## Problema Identificado

Los archivos no se estaban guardando en Firebase Storage porque:
1. ❌ No existía código para guardar archivos subidos para OCR
2. ❌ No existía webhook de Stripe para procesar pagos completados
3. ❌ No existía código para guardar PDFs generados después del pago

## Solución Implementada

### 1. Librería de Almacenamiento (`src/lib/storage.ts`)

Se creó una librería con funciones para:

- **`savePdfForUser()`**: Guarda PDFs generados en Storage
  - Ruta: `{uid}/{userType}/{documentType}/documents/{documentId}/{fileName}`
  - Acepta `storageContext: { userType, documentType }` o usa `documentType` legacy para resolver
  - Retorna: `storagePath`, `downloadURL`, `bucket`, `size`

- **`saveUploadedFile()`**: Guarda archivos subidos por el usuario (para OCR)
  - Ruta: `{uid}/{userType}/{documentType}/ocr/{fileId}_{originalName}`
  - Acepta `storageContext` opcional; usa `documentType` legacy si no se proporciona
  - También guarda metadatos en Firestore (`uploaded_files` collection)
  - Retorna: `storagePath`, `downloadURL`, `fileId`

- **`savePurchase()`**: Guarda información de compras en Firestore
  - Collection: `purchases/{purchaseId}`
  - Actualiza estadísticas del usuario en `users/{userId}`

- **`getSignedUrl()`**: Obtiene URL firmada de un archivo en Storage

### 2. Webhook de Stripe (`src/app/api/stripe/webhook/route.ts`)

Endpoint para procesar eventos de Stripe:

- **`checkout.session.completed`**: 
  - Guarda la compra en Firestore usando `savePurchase()`
  - Envía notificación a Google Chat (si está configurado)
  - Procesa PDFs generados si están en metadata

- **`payment_intent.succeeded`**: Registra pago exitoso
- **`payment_intent.payment_failed`**: Registra pago fallido

### 3. Estructura de Almacenamiento (UID-first hierarchy)

**Nueva jerarquía**: `{uid}/{userType}/{documentType}/{documents|ocr}/...`

- **userType**: `abogado` | `estudiante` | `autoservicio` (según menú lateral)
- **documentType**: según opciones del menú (dashboard, casos, clientes, reclamacion-cantidades, accion-tutela, etc.)

```
Firebase Storage (nueva estructura):
├── {uid}/                           ← UID del usuario (primer nivel)
│   ├── abogado/
│   │   ├── dashboard/documents/...   (Dashboard)
│   │   ├── casos/documents/...      (Casos)
│   │   └── clientes/documents/...    (Clientes)
│   ├── estudiante/
│   │   └── documentos/documents/... (Material estudio, plantillas)
│   └── autoservicio/
│       ├── generacion-escritos/documents/...
│       ├── accion-tutela/documents/... y ocr/...
│       ├── reclamacion-cantidades/documents/... y ocr/...
│       ├── analisis-documentos/ocr/...
│       ├── extraccion-datos/ocr/...
│       └── revision-email/ocr/...
│
Firestore:
├── purchases/
│   └── {purchaseId}  (Información de compras)
├── uploaded_files/
│   └── {fileId}  (Metadatos de archivos subidos)
└── users/
    └── {userId}  (Estadísticas del usuario, incluye campo "plan")
```

**Resolución de contexto**: El sistema usa `resolveStorageContext()` en `src/lib/storage-paths.ts`:
1. **storageContext explícito** (prioridad): Si se pasa `{ userType, documentType }` se usa directamente
2. **documentType legacy**: `reclamacion_cantidades` → autoservicio/reclamacion-cantidades, `accion_tutela` → autoservicio/accion-tutela, etc.
3. **Plan del usuario**: `Estudiantes` → estudiante/documentos, `Reclamación de Cantidades` → autoservicio/reclamacion-cantidades
4. **Por defecto**: abogado/dashboard

**Compatibilidad**: Las reglas de Storage permiten tanto la nueva estructura UID-first como las rutas legacy (students/, reclamaciones/, users/, repositorio/) para archivos existentes.

## Integración Pendiente

### En `ReclamacionProcessSimple.tsx`:

1. **Guardar archivos cuando se suben**:
```typescript
import { saveUploadedFile } from '@/lib/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

// En handleFileUpload, después de crear newDocuments:
const [user] = useAuthState(auth);
if (user) {
  for (const doc of newDocuments) {
    try {
      const result = await saveUploadedFile(
        user.uid,
        doc.file,
        doc.category?.id
      );
      // Guardar storagePath en el documento
      doc.storagePath = result.storagePath;
      doc.downloadURL = result.downloadURL;
    } catch (error) {
      console.error('Error guardando archivo:', error);
    }
  }
}
```

2. **Guardar PDF generado después del pago**:
```typescript
import { savePdfForUser } from '@/lib/storage';

// Después de generar el PDF (en generateDocument o similar):
const pdfBuffer = /* buffer del PDF generado */;
const storageResult = await savePdfForUser(
  user.uid,
  documentId,
  pdfBuffer,
  {
    fileName: `reclamacion_${documentId}.pdf`,
    documentType: 'reclamacion_cantidades'
  }
);
```

### En `create-checkout-session/route.ts`:

Agregar `userId` al metadata del checkout session:
```typescript
metadata: {
  userId: user.uid,  // Agregar esto
  documentType: 'reclamacion_cantidades',
  ...metadata,
}
```

## Configuración Requerida

### Variables de Entorno:

```env
# Firebase Storage
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_tu_secreto_webhook
```

### Configurar Webhook en Stripe:

1. Ir a Stripe Dashboard → Developers → Webhooks
2. Agregar endpoint: `https://tu-dominio.com/api/stripe/webhook`
3. Seleccionar eventos:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copiar el `Signing secret` a `STRIPE_WEBHOOK_SECRET`

## Verificación

Para verificar que los archivos se están guardando:

1. **Firebase Console → Storage**:
   - Deberías ver carpetas `users/{userId}/documents/` y `users/{userId}/ocr/`

2. **Firebase Console → Firestore**:
   - Collection `purchases`: Compras completadas
   - Collection `uploaded_files`: Archivos subidos con metadatos

3. **Logs del webhook**:
   - Verificar en Cloud Run logs que el webhook se ejecuta correctamente

## Próximos Pasos

1. ✅ Crear librería de almacenamiento
2. ✅ Crear webhook de Stripe
3. ⏳ Integrar guardado de archivos en `ReclamacionProcessSimple`
4. ⏳ Integrar guardado de PDFs generados
5. ⏳ Agregar `userId` al metadata del checkout session

