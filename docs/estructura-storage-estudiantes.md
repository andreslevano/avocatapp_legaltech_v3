# Estructura de Storage para Estudiantes y Reclamaciones

## Carpetas Específicas por Tipo

El sistema crea automáticamente carpetas separadas según el tipo de usuario o documento:

## Estructura Completa

```
Firebase Storage:
├── students/                    ← Para usuarios con plan "Estudiantes"
│   └── {userId}/
│       ├── ocr/
│       │   └── {fileId}_{fileName}  ← PDFs adjuntos subidos
│       └── documents/
│           └── {documentId}/
│               └── {fileName}.pdf  ← PDFs generados por IA
│
├── reclamaciones/              ← Para documentos de "Reclamación de Cantidades"
│   └── {userId}/
│       ├── ocr/
│       │   └── {fileId}_{fileName}  ← PDFs adjuntos subidos
│       └── documents/
│           └── {documentId}/
│               └── {fileName}.pdf  ← PDFs generados por IA
│
└── users/                      ← Para otros usuarios (por defecto)
    └── {userId}/
        ├── ocr/
        └── documents/
```

## Detección Automática

El sistema detecta automáticamente la carpeta correcta según:

1. **Tipo de documento** (prioridad):
   - `documentType = "reclamacion_cantidades"` → `reclamaciones/{userId}/`
   
2. **Plan del usuario** (si no hay tipo de documento):
   - Plan = "Estudiantes" → `students/{userId}/`
   - Plan = "Reclamación de Cantidades" → `reclamaciones/{userId}/`
   - Otros planes → `users/{userId}/`

## Funciones Actualizadas

### `saveUploadedFile(userId, file, category?, documentType?)`
- Detecta automáticamente la carpeta según el tipo de documento o plan
- Guarda archivos subidos en:
  - `reclamaciones/{userId}/ocr/` si `documentType = "reclamacion_cantidades"`
  - `students/{userId}/ocr/` si el plan es "Estudiantes"
  - `users/{userId}/ocr/` en otros casos

### `savePdfForUser(userId, documentId, fileBuffer, metadata?)`
- Detecta automáticamente la carpeta según el tipo de documento o plan
- Guarda PDFs generados en:
  - `reclamaciones/{userId}/documents/{documentId}/` si `metadata.documentType = "reclamacion_cantidades"`
  - `students/{userId}/documents/{documentId}/` si el plan es "Estudiantes"
  - `users/{userId}/documents/{documentId}/` en otros casos

## Ejemplo de Uso

### Para Estudiantes

```typescript
import { saveUploadedFile, savePdfForUser } from '@/lib/storage';

// Subir archivo adjunto (se guarda automáticamente en students/ si el plan es "Estudiantes")
const result = await saveUploadedFile(userId, file, 'invoice');
// Resultado: students/{userId}/ocr/{fileId}_{fileName}

// Guardar PDF generado por IA
const pdfResult = await savePdfForUser(userId, documentId, pdfBuffer, {
  fileName: 'documento.pdf',
  documentType: 'estudiante_document'
});
// Resultado: students/{userId}/documents/{documentId}/documento.pdf
```

### Para Reclamaciones

```typescript
import { saveUploadedFile, savePdfForUser } from '@/lib/storage';

// Subir archivo adjunto (se guarda en reclamaciones/ cuando se especifica el tipo)
const result = await saveUploadedFile(userId, file, 'contract', 'reclamacion_cantidades');
// Resultado: reclamaciones/{userId}/ocr/{fileId}_{fileName}

// Guardar PDF generado por IA
const pdfResult = await savePdfForUser(userId, documentId, pdfBuffer, {
  fileName: 'reclamacion.pdf',
  documentType: 'reclamacion_cantidades'
});
// Resultado: reclamaciones/{userId}/documents/{documentId}/reclamacion.pdf
```

## Ventajas

1. **Organización**: Los archivos están separados por tipo (estudiantes, reclamaciones, otros)
2. **Fácil identificación**: Fácil identificar qué archivos pertenecen a cada tipo
3. **Gestión**: Más fácil gestionar permisos y cuotas por tipo
4. **Automático**: No requiere cambios en el código que usa las funciones (excepto pasar documentType cuando sea necesario)
5. **Flexible**: Funciona tanto por plan del usuario como por tipo de documento

## Verificación

Para verificar que los archivos se están guardando correctamente:

1. **Firebase Console → Storage**
   - Deberías ver las carpetas:
     - `students/` si hay usuarios con plan "Estudiantes"
     - `reclamaciones/` si hay documentos de tipo "reclamacion_cantidades"
     - `users/` para otros usuarios
   - Dentro de cada carpeta `{tipo}/{userId}/` deberías ver:
     - `ocr/` con los PDFs subidos
     - `documents/` con los PDFs generados por IA

2. **Firestore → users/{userId}**
   - Verificar que el campo `plan` esté configurado correctamente
   - Para reclamaciones, verificar que `documentType = "reclamacion_cantidades"` en los metadatos


