# 📦 Guía: Firebase Storage desde la Consola

**URL**: https://console.firebase.google.com/project/avocat-legaltech-v3/storage

## ✅ Verificaciones desde Firebase Console

### 1. Verificar que CORS esté Configurado

Aunque Firebase Console no muestra directamente la configuración CORS, puedes verificar que los archivos se están subiendo correctamente:

1. **Ve a Storage**: https://console.firebase.google.com/project/avocat-legaltech-v3/storage
2. **Navega por las carpetas**:
   - `reclamaciones/` - Archivos de reclamación de cantidades
   - `students/` - Archivos de estudiantes
   - `users/` - Archivos generales de usuarios

### 2. Verificar Reglas de Storage

1. **Ve a la pestaña "Rules"** (Reglas) en Firebase Console Storage
2. **Las reglas están en**: `storage.rules` (archivo local)
3. **Para desplegar las reglas**:
   ```bash
   firebase deploy --only storage
   ```

**Reglas actuales** (en `storage.rules`):
- ✅ Permiten lectura/escritura a usuarios autenticados en sus propias carpetas
- ✅ Protegen archivos de otros usuarios
- ✅ Estructura: `reclamaciones/{userId}/`, `students/{userId}/`, `users/{userId}/`

### 3. Verificar Archivos Subidos

1. **Navega a**: `reclamaciones/{userId}/ocr/`
2. **Deberías ver los PDFs** que los usuarios han subido
3. **Verifica que los nombres** tengan el formato: `{fileId}_{fileName}.pdf`

## 🔍 Estructura de Carpetas Esperada

```
Firebase Storage:
├── reclamaciones/
│   └── {userId}/
│       ├── ocr/
│       │   └── {fileId}_{fileName}.pdf  ← PDFs subidos por usuarios
│       └── documents/
│           └── {documentId}/
│               └── {fileName}.pdf  ← PDFs generados por IA
├── students/
│   └── {userId}/
│       ├── ocr/
│       └── documents/
└── users/
    └── {userId}/
        ├── ocr/
        └── documents/
```

## 🚨 Si los Archivos No Se Suben

### Verificar desde la Consola:

1. **Revisa las reglas de Storage**:
   - Ve a Storage → Rules
   - Asegúrate de que permitan `write` para usuarios autenticados

2. **Verifica permisos del proyecto**:
   - Asegúrate de tener permisos de "Editor" o "Owner" en el proyecto

3. **Revisa los logs**:
   - Ve a Firebase Console → Functions → Logs
   - Busca errores relacionados con Storage

### Verificar CORS (desde Google Cloud Console):

Aunque Firebase Console no muestra CORS, puedes verificar desde:
- [Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3)
- Selecciona el bucket: `avocat-legaltech-v3.firebasestorage.app`
- Ve a "Configuration" → "CORS configuration"

## 📝 Comandos Útiles

### Verificar CORS desde código (ya configurado):

```bash
npx ts-node scripts/configure-storage-cors.ts
```

### Ver archivos en Storage desde código:

```typescript
import { getStorage } from 'firebase-admin/storage';

const storage = getStorage();
const bucket = storage.bucket('avocat-legaltech-v3.firebasestorage.app');

// Listar archivos
const [files] = await bucket.getFiles({ prefix: 'reclamaciones/' });
files.forEach(file => console.log(file.name));
```

## ✅ Estado Actual

- ✅ **CORS configurado** usando script TypeScript
- ✅ **Bucket**: `avocat-legaltech-v3.firebasestorage.app`
- ✅ **Dominios permitidos**: avocatapp.com, www.avocatapp.com, avocat-legaltech-v3.web.app
- ✅ **Métodos permitidos**: GET, HEAD, PUT, POST, DELETE

## 🔗 Enlaces Útiles

- **Firebase Console - Storage**: https://console.firebase.google.com/project/avocat-legaltech-v3/storage
- **Google Cloud Console - Storage**: https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3
- **Firebase Storage Rules**: https://console.firebase.google.com/project/avocat-legaltech-v3/storage/rules

---

**Última actualización**: 27 de Enero 2025

