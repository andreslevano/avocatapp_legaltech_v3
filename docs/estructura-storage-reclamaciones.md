# Estructura de Storage para Reclamaciones

## Carpeta Específica para Reclamaciones

El sistema ahora crea automáticamente una carpeta separada para documentos de reclamación de cantidades en Firebase Storage.

## Estructura

```
Firebase Storage:
└── reclamaciones/
    └── {userId}/
        ├── ocr/
        │   └── {fileId}_{fileName}  ← PDFs adjuntos subidos por el usuario
        └── documents/
            └── {documentId}/
                └── {fileName}.pdf  ← PDFs generados por IA
```

## Detección Automática

El sistema detecta automáticamente si un documento es de reclamación de dos formas:

1. **Por tipo de documento** (prioridad):
   - Si `documentType = "reclamacion_cantidades"` → Archivos se guardan en `reclamaciones/{userId}/`

2. **Por plan del usuario**:
   - Si el plan del usuario es "Reclamación de Cantidades" → Archivos se guardan en `reclamaciones/{userId}/`

## Funciones Actualizadas

### `saveUploadedFile(userId, file, category?, documentType?)`
- Detecta automáticamente si es reclamación
- Guarda archivos subidos en: `reclamaciones/{userId}/ocr/` cuando `documentType = "reclamacion_cantidades"`

### `savePdfForUser(userId, documentId, fileBuffer, metadata?)`
- Detecta automáticamente si es reclamación
- Guarda PDFs generados en: `reclamaciones/{userId}/documents/{documentId}/` cuando `metadata.documentType = "reclamacion_cantidades"`

## Ejemplo de Uso en ReclamacionProcessSimple

```typescript
import { saveUploadedFile, savePdfForUser } from '@/lib/storage';

// Subir archivo adjunto (se guarda automáticamente en reclamaciones/)
const result = await saveUploadedFile(
  user.uid,
  file,
  category.id,
  'reclamacion_cantidades' // ← Esto hace que se guarde en reclamaciones/
);
// Resultado: reclamaciones/{userId}/ocr/{fileId}_{fileName}

// Guardar PDF generado por IA
const pdfResult = await savePdfForUser(
  user.uid,
  documentId,
  pdfBuffer,
  {
    fileName: 'reclamacion.pdf',
    documentType: 'reclamacion_cantidades' // ← Esto hace que se guarde en reclamaciones/
  }
);
// Resultado: reclamaciones/{userId}/documents/{documentId}/reclamacion.pdf
```

## Ventajas

1. **Organización**: Los archivos de reclamaciones están separados de otros tipos de documentos
2. **Fácil identificación**: Fácil identificar qué archivos pertenecen a reclamaciones
3. **Gestión**: Más fácil gestionar permisos y cuotas para reclamaciones
4. **Automático**: Solo necesitas pasar `documentType: 'reclamacion_cantidades'` o el plan del usuario

## Verificación

Para verificar que los archivos se están guardando correctamente:

1. **Firebase Console → Storage**
   - Deberías ver la carpeta `reclamaciones/` si hay documentos de reclamación
   - Dentro de `reclamaciones/{userId}/` deberías ver:
     - `ocr/` con los PDFs subidos
     - `documents/` con los PDFs generados por IA

2. **Firestore → users/{userId}**
   - Verificar que el campo `plan` esté configurado como "Reclamación de Cantidades" (opcional)
   - O verificar que `documentType = "reclamacion_cantidades"` en los metadatos de los documentos

