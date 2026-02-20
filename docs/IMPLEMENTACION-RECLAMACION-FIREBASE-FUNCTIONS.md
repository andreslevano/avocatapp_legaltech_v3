# Implementación: Generación de Reclamación en Firebase Functions

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementado

---

## ✅ Cambios Realizados

### 1. Nueva Función: `generateReclamacionDocumentPackageCore`

**Ubicación:** `functions/src/index.ts` (después de `generateTutelaDocumentPackageCore`)

**Funcionalidad:**
- ✅ Obtiene caso de Firestore (`users/{uid}/reclamaciones_cantidades/{caseId}`)
- ✅ Valida que tiene OCR y formData
- ✅ Construye prompt usando la misma lógica que Next.js
- ✅ Genera documento con OpenAI (GPT-4o)
- ✅ Crea PDF y DOCX usando `createPdfBuffer` y `createDocxBuffer`
- ✅ Sube archivos a Storage usando `uploadToStorage`
- ✅ Actualiza caso en Firestore con URLs del documento
- ✅ Guarda package en `reclamacion_document_packages` para tracking

**Parámetros:**
```typescript
{
  userId: string;
  userEmail?: string | null;
  caseId: string;
  uid: string;
  openai?: OpenAI;
}
```

**Retorna:**
```typescript
{
  packageId: string;
  storageBasePath: string;
  files: {
    reclamacionPdf: StorageUploadResult;
    reclamacionDocx: StorageUploadResult;
  };
}
```

---

### 2. Actualización del Webhook

**Ubicación:** `functions/src/index.ts` - `processItemDocuments` (línea ~2781)

**Cambio:**
- ❌ **Antes:** Llamaba al endpoint de Next.js `/api/reclamaciones-cantidades/generate-final`
- ✅ **Ahora:** Llama directamente a `generateReclamacionDocumentPackageCore` (igual que estudiantes y tutela)

**Código:**
```typescript
else if (documentType === 'reclamacion_cantidades' && uid && caseId) {
  // Generar documento directamente en Firebase Functions
  const generation = await generateReclamacionDocumentPackageCore({
    userId: userId as string,
    userEmail: customerEmail,
    caseId: caseId,
    uid: uid,
    openai,
  });
  
  // Actualizar item con resultado
  const reclamacionResult = {
    ...item,
    status: 'completed',
    documentId: generation.packageId,
    storagePath: generation.files.reclamacionPdf.path,
    downloadUrl: generation.files.reclamacionPdf.downloadUrl,
    // ...
  };
}
```

---

## 📊 Comparación: Antes vs. Ahora

### Antes (Llamaba a Next.js)
```typescript
// Llamada HTTP externa
const generateResponse = await fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ caseId, uid }),
});
```

**Problemas:**
- ⚠️ Dependencia de Next.js estar disponible
- ⚠️ Llamada HTTP adicional (latencia)
- ⚠️ Requiere variables de entorno (NEXTAUTH_URL, INTERNAL_API_SECRET)
- ⚠️ Inconsistente con estudiantes y tutela

### Ahora (Generación Directa)
```typescript
// Generación directa en Firebase Functions
const generation = await generateReclamacionDocumentPackageCore({
  userId, userEmail, caseId, uid, openai
});
```

**Ventajas:**
- ✅ Sin dependencias externas
- ✅ Más rápido (sin llamada HTTP)
- ✅ Consistente con estudiantes y tutela
- ✅ Mismo stack tecnológico
- ✅ Mejor manejo de errores

---

## 🎯 Estado Final

| Tipo | Generación | Ubicación | Estado |
|------|------------|-----------|--------|
| **Estudiantes** | Directa | Firebase Functions | ✅ Funciona |
| **Tutela** | Directa | Firebase Functions | ✅ Funciona |
| **Reclamación** | Directa | Firebase Functions | ✅ **IMPLEMENTADO** |

**Todos los 3 tipos ahora generan documentos directamente en Firebase Functions de forma consistente.**

---

## 🚀 Próximos Pasos

### 1. Compilar TypeScript
```bash
cd functions
npm run build
```

### 2. Desplegar
```bash
firebase deploy --only functions:stripeWebhook
```

### 3. Verificar Logs
```bash
firebase functions:log --only stripeWebhook --limit 50
```

### 4. Probar con Reclamación Real
1. Crear caso de reclamación
2. Procesar OCR y borrador
3. Realizar pago
4. Verificar que webhook genera documento automáticamente
5. Verificar que PDF está en Storage
6. Verificar que caso se actualiza en Firestore

---

## 📝 Notas Técnicas

### Prompt Builder
- Se copió la lógica del prompt de `src/lib/prompts/reclamacion-cantidades-maestro.ts`
- Se mantiene la misma estructura y formato que en Next.js
- Se asegura consistencia en la generación

### Storage Path
- **Path:** `repositorio/{userId}/reclamaciones/{caseId}/{timestamp}/`
- **Archivos:** 
  - `reclamacion-cantidades-{caseId}.pdf`
  - `reclamacion-cantidades-{caseId}.docx`

### Firestore Updates
- Actualiza el caso en `users/{uid}/reclamaciones_cantidades/{caseId}`
- Crea package en `reclamacion_document_packages` para tracking
- Mantiene consistencia con estudiantes y tutela

---

## ✅ Checklist de Verificación

- [x] Función `generateReclamacionDocumentPackageCore` creada
- [x] Webhook actualizado para usar función directa
- [x] Prompt builder implementado
- [x] PDF y DOCX generation implementados
- [x] Storage upload implementado
- [x] Firestore updates implementados
- [ ] Compilación TypeScript exitosa
- [ ] Deploy a Firebase Functions
- [ ] Prueba con reclamación real
- [ ] Verificación de logs

---

**Última Actualización:** Diciembre 2024

