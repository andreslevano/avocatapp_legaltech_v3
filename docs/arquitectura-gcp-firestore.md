# Arquitectura GCP con Firestore para Reclamación de Cantidades

## ✅ Estado Actual

Ya estás usando **Firestore** y **Firebase Storage** (que son servicios de GCP). El sistema actual funciona así:

```
Cliente (Next.js)
  ↓
Firebase Storage (GCP) ← Guarda PDFs
  ↓
Firestore (GCP) ← Guarda metadatos
  ↓
Next.js API Routes (Cloud Run) ← Procesa OCR y OpenAI
```

## 🏗️ Arquitectura Recomendada para GCP

### Opción 1: Cloud Functions (Recomendada para procesamiento)

```
┌─────────────────┐
│   Cliente Web   │
│   (Next.js)     │
└────────┬────────┘
         │
         │ 1. Sube PDF
         ↓
┌─────────────────┐
│ Firebase Storage│ ← PDFs almacenados
│   (GCP)         │
└────────┬────────┘
         │
         │ 2. Trigger
         ↓
┌─────────────────┐
│ Cloud Function  │ ← OCR + OpenAI
│  (GCP)          │
└────────┬────────┘
         │
         │ 3. Guarda resultado
         ↓
┌─────────────────┐
│   Firestore     │ ← Metadatos + Documento generado
│   (GCP)         │
└─────────────────┘
```

### Opción 2: Cloud Run (Actual - Funciona bien)

```
┌─────────────────┐
│   Cliente Web   │
│   (Next.js)     │
└────────┬────────┘
         │
         │ 1. Sube PDF
         ↓
┌─────────────────┐
│ Firebase Storage│
│   (GCP)         │
└────────┬────────┘
         │
         │ 2. API Call
         ↓
┌─────────────────┐
│  Cloud Run      │ ← Next.js API Routes
│  (GCP)          │   (OCR + OpenAI aquí)
└────────┬────────┘
         │
         │ 3. Guarda resultado
         ↓
┌─────────────────┐
│   Firestore     │
│   (GCP)         │
└─────────────────┘
```

## 📊 Comparación de Opciones

| Característica | Cloud Functions | Cloud Run (Actual) |
|---------------|-----------------|-------------------|
| **Escalabilidad** | ✅ Automática | ✅ Automática |
| **Costo** | 💰 Pago por uso | 💰 Pago por uso |
| **Tiempo de inicio** | ⚠️ Cold start | ✅ Más rápido |
| **Complejidad** | ✅ Más simple | ⚠️ Más configuración |
| **Integración** | ✅ Trigger automático | ⚠️ Manual (API) |
| **Mejor para** | Procesamiento asíncrono | APIs síncronas |

## 🎯 Recomendación: Híbrida

**Usar Cloud Functions para:**
- OCR de documentos (procesamiento pesado)
- Generación con OpenAI (puede tardar)
- Procesamiento asíncrono

**Usar Cloud Run (Next.js API) para:**
- Endpoints rápidos
- Autenticación
- Lógica de negocio

## 🔧 Implementación con Cloud Functions

### 1. Estructura de Firestore

```typescript
// Estructura recomendada en Firestore:

users/{userId}/
  ├── plan: "Reclamación de Cantidades"
  ├── createdAt: timestamp
  └── totalReclamaciones: number

reclamaciones/{reclId}/
  ├── userId: string
  ├── status: "pending" | "processing" | "completed" | "error"
  ├── documentos: [
  │   {
  │     id: string,
  │     name: string,
  │     storagePath: string,
  │     category: string,
  │     textoExtraido?: string,  // ← Se llena con OCR
  │     infoFactura?: {          // ← Se llena con OCR
  │       amounts: number[],
  │       dates: string[],
  │       debtorName?: string
  │     }
  │   }
  │ ]
  ├── documentoGenerado?: {
  │   title: string,
  │   content: string,
  │   storagePath: string,
  │   downloadURL: string
  │ }
  ├── metadata: {
  │   cantidadReclamada?: number,
  │   deudor?: string,
  │   fechas?: string[]
  │ }
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── completedAt?: timestamp
```

### 2. Cloud Function para OCR

```typescript
// functions/src/processReclamacionOCR.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { extractTextFromPDF, extractInvoiceInfo } from './pdf-ocr';
import { getStorage } from 'firebase-admin/storage';

export const processReclamacionOCR = onDocumentCreated(
  'reclamaciones/{reclId}',
  async (event) => {
    const reclId = event.params.reclId;
    const reclamacion = event.data?.data();
    
    if (!reclamacion || reclamacion.status !== 'pending') {
      return;
    }
    
    // Actualizar estado
    await event.data?.ref.update({ status: 'processing' });
    
    // Procesar cada documento
    const documentosProcesados = [];
    
    for (const doc of reclamacion.documentos) {
      try {
        // Descargar PDF desde Storage
        const bucket = getStorage().bucket();
        const file = bucket.file(doc.storagePath);
        const [buffer] = await file.download();
        
        // Extraer texto
        const textoExtraido = await extractTextFromPDF(buffer);
        
        // Extraer información si es factura
        let infoFactura = null;
        if (doc.category === 'invoice') {
          infoFactura = extractInvoiceInfo(textoExtraido);
        }
        
        documentosProcesados.push({
          ...doc,
          textoExtraido,
          infoFactura,
        });
      } catch (error) {
        console.error(`Error procesando ${doc.name}:`, error);
      }
    }
    
    // Actualizar Firestore con texto extraído
    await event.data?.ref.update({
      documentos: documentosProcesados,
      status: 'ocr_completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

### 3. Cloud Function para Generación con OpenAI

```typescript
// functions/src/generateReclamacionDocument.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { buildReclamacionPrompt } from './prompts/reclamacion-cantidades-es';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateReclamacionDocument = onDocumentUpdated(
  'reclamaciones/{reclId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // Solo procesar si cambió de 'ocr_completed' a algo que necesite generación
    if (before?.status !== 'ocr_completed' || after?.status !== 'ocr_completed') {
      return;
    }
    
    // Verificar que todos los documentos tengan texto extraído
    const todosProcesados = after.documentos.every(
      (doc: any) => doc.textoExtraido
    );
    
    if (!todosProcesados) {
      return;
    }
    
    // Actualizar estado
    await event.data.after.ref.update({ status: 'generating' });
    
    try {
      // Construir prompt
      const prompt = buildReclamacionPrompt({
        documentos: after.documentos,
        cantidadReclamada: after.metadata?.cantidadReclamada,
        deudor: after.metadata?.deudor,
        fechas: after.metadata?.fechas,
      });
      
      // Generar con OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un abogado experto español...',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      });
      
      const documentoGenerado = completion.choices[0]?.message?.content || '';
      
      // Guardar PDF en Storage
      const pdfBuffer = await generatePDF(documentoGenerado);
      const storagePath = `reclamaciones/${after.userId}/documents/${reclId}.pdf`;
      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      await file.save(pdfBuffer, { contentType: 'application/pdf' });
      const [downloadURL] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // URL permanente
      });
      
      // Actualizar Firestore
      await event.data.after.ref.update({
        status: 'completed',
        documentoGenerado: {
          title: `Reclamación de Cantidades - ${new Date().toLocaleDateString('es-ES')}`,
          content: documentoGenerado,
          storagePath,
          downloadURL,
        },
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error generando documento:', error);
      await event.data.after.ref.update({
        status: 'error',
        error: error.message,
      });
    }
  }
);
```

## 🔄 Flujo Completo con Cloud Functions

```
1. Usuario sube PDFs
   ↓
2. Cliente guarda en Storage y crea documento en Firestore
   Firestore: reclamaciones/{reclId} { status: "pending", documentos: [...] }
   ↓
3. Cloud Function (processReclamacionOCR) se activa automáticamente
   ↓
4. Extrae texto de cada PDF (OCR)
   ↓
5. Actualiza Firestore con texto extraído
   Firestore: { status: "ocr_completed", documentos: [{ textoExtraido: "...", infoFactura: {...} }] }
   ↓
6. Cloud Function (generateReclamacionDocument) se activa automáticamente
   ↓
7. Genera documento con OpenAI
   ↓
8. Guarda PDF en Storage
   ↓
9. Actualiza Firestore con documento generado
   Firestore: { status: "completed", documentoGenerado: {...} }
   ↓
10. Cliente recibe notificación (Firestore listener) y muestra resultado
```

## 💰 Costos Estimados en GCP

### Firestore
- **Escrituras:** $0.18 por 100,000 documentos
- **Lecturas:** $0.06 por 100,000 documentos
- **Almacenamiento:** $0.18 por GB/mes

### Cloud Functions
- **Invocaciones:** $0.40 por millón
- **Tiempo de cómputo:** $0.0000025 por GB-segundo
- **Ejemplo:** 10,000 reclamaciones/mes = ~$5-10

### Cloud Storage
- **Almacenamiento:** $0.020 por GB/mes
- **Operaciones:** $0.05 por 10,000 operaciones

### OpenAI
- **GPT-4o:** ~$0.01-0.02 por reclamación (depende de tokens)

**Total estimado:** ~$50-100/mes para 1,000 reclamaciones

## ✅ Ventajas de Usar Cloud Functions

1. **Procesamiento Asíncrono:** No bloquea al usuario
2. **Escalabilidad Automática:** GCP escala automáticamente
3. **Costo Eficiente:** Solo pagas por uso
4. **Confiabilidad:** Reintentos automáticos
5. **Integración Nativa:** Se activa automáticamente con Firestore

## 🚀 Pasos para Implementar

### Paso 1: Mantener lo Actual (Cloud Run)
- ✅ Ya funciona
- ✅ Fácil de mantener
- ✅ Control total

### Paso 2: Migrar a Cloud Functions (Opcional)
- Crear carpeta `functions/`
- Implementar funciones de OCR y generación
- Configurar triggers de Firestore
- Desplegar con `firebase deploy --only functions`

### Paso 3: Híbrido (Recomendado)
- Cloud Run para APIs rápidas
- Cloud Functions para procesamiento pesado
- Firestore como fuente de verdad

## 📝 Conclusión

**Sí, todo puede funcionar perfectamente en GCP con Firestore:**

✅ **Ya estás usando GCP** (Firestore y Storage son servicios de GCP)
✅ **El código actual funciona** en Cloud Run
✅ **Puedes optimizar** usando Cloud Functions para procesamiento pesado
✅ **Firestore es perfecto** para guardar metadatos y estado

**Recomendación:** Mantén la arquitectura actual (Cloud Run) y considera Cloud Functions solo si necesitas procesamiento asíncrono o mejor escalabilidad.



