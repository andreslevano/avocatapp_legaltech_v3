# Plan de Unificación: Webhook para los 3 Flujos

**Fecha:** Diciembre 2024  
**Webhook Activo:** `https://stripewebhook-xph64x4ova-uc.a.run.app` (Firebase Functions)  
**Estado Actual:** ✅ Estudiantes y Tutela | ❌ Reclamación

---

## 🔍 Situación Actual

### Webhook Activo en Stripe
- **URL:** `https://stripewebhook-xph64x4ova-uc.a.run.app`
- **Nombre:** `avocat-payments-webhook`
- **Eventos:** `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
- **Problemas:**
  - ⚠️ 53% de errores (muy alto)
  - ⚠️ Tiempo de respuesta promedio: 6439 ms (muy alto)

### Estado de Generación Automática

| Tipo | Generación Auto | Estado |
|------|----------------|--------|
| **Estudiantes** | ✅ Sí | ✅ Funciona |
| **Tutela** | ✅ Sí | ✅ Funciona |
| **Reclamación** | ❌ No | ❌ **FALTA IMPLEMENTAR** |

---

## 🎯 Objetivo

Unificar los 3 flujos en el webhook de Firebase Functions para que:
1. ✅ Estudiantes: Siga funcionando (ya funciona)
2. ✅ Tutela: Siga funcionando (ya funciona)
3. ✅ Reclamación: Agregar generación automática

---

## 📋 Plan de Implementación

### Paso 1: Agregar Detección de Reclamación

**Archivo:** `functions/src/index.ts` - `processWebhookAsync`

**Ubicación:** Después de detectar `documentType` (línea ~2430)

**Código a agregar:**
```typescript
// Ya existe en línea ~2430:
let documentType = session.metadata?.documentType || 'estudiantes';
let caseId = session.metadata?.caseId;
let uid = session.metadata?.uid;

// Agregar detección de reclamación si no está en metadata
if (!documentType && caseId && uid) {
  documentType = 'reclamacion_cantidades';
}
```

---

### Paso 2: Agregar Procesamiento de Reclamación

**Archivo:** `functions/src/index.ts` - `processItemDocuments` (línea ~2765)

**Ubicación:** Después de procesar tutela (línea ~2790)

**Código a agregar:**
```typescript
// En processItemDocuments, después de tutela (línea ~2790):
if (documentType === 'accion_tutela') {
  // ... código existente ...
} else if (documentType === 'reclamacion_cantidades' && uid && caseId) {
  // ⭐ NUEVO: Procesar reclamación
  try {
    console.log(`📋 Procesando reclamación de cantidades: ${caseId}`);
    
    // Llamar al endpoint de Next.js para generar documento final
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const generateResponse = await fetch(`${baseUrl}/api/reclamaciones-cantidades/generate-final`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'internal-secret'}`,
      },
      body: JSON.stringify({ caseId, uid }),
    });

    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ Documento de reclamación generado:', result);
      
      return {
        ...item,
        status: 'completed',
        documentId: result.pdf?.path || caseId,
        storagePath: result.pdf?.path || null,
        downloadUrl: result.pdf?.url || null,
        generatedAt: admin.firestore.Timestamp.now(),
        documentType: 'reclamacion_cantidades' as const,
      };
    } else {
      const error = await generateResponse.json();
      console.error('❌ Error generando documento de reclamación:', error);
      throw new Error(error.error || 'Error generando documento');
    }
  } catch (error) {
    console.error(`❌ Error procesando reclamación ${caseId}:`, error);
    return {
      ...item,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      documentType: 'reclamacion_cantidades' as const,
    };
  }
} else {
  // Procesar estudiantes (lógica existente)
  // ... código existente ...
}
```

---

### Paso 3: Agregar Reclamación al Purchase Data

**Archivo:** `functions/src/index.ts` - `processWebhookAsync` (línea ~2709)

**Ubicación:** En `purchaseData` (línea ~2709)

**Código a modificar:**
```typescript
// Ya existe en línea ~2735:
documentType: documentType, // ⭐ Ya existe

// Agregar metadata específica para reclamación:
if (documentType === 'reclamacion_cantidades' && caseId) {
  purchaseData.caseId = caseId;
  purchaseData.uid = uid;
  purchaseData.documentId = caseId;
}
```

---

### Paso 4: Mejorar Manejo de Errores

**Problema:** 53% de errores es muy alto

**Soluciones:**
1. Agregar retry logic para llamadas a APIs externas
2. Mejorar logging para identificar errores
3. Agregar timeouts apropiados
4. Validar datos antes de procesar

**Código a agregar:**
```typescript
// En processItemDocuments, agregar try-catch más robusto:
const processItemDocuments = async (item: any, itemIndex: number): Promise<any> => {
  try {
    // ... código existente ...
  } catch (error) {
    console.error(`❌ Error procesando item ${itemIndex + 1}:`, error);
    
    // Log detallado para debugging
    console.error('Error details:', {
      item: item.name,
      documentType,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return {
      ...item,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      documentType: documentType as any,
    };
  }
};
```

---

## 🧪 Testing

### Test 1: Verificar Detección de Reclamación
1. Crear checkout session con `documentType: 'reclamacion_cantidades'`
2. Verificar que webhook detecta el tipo correctamente
3. Verificar que llama a `/api/reclamaciones-cantidades/generate-final`

### Test 2: Verificar Generación de Reclamación
1. Simular webhook con reclamación
2. Verificar que documento se genera
3. Verificar que PDF se guarda en Storage
4. Verificar que purchase se actualiza

### Test 3: Verificar que Estudiantes y Tutela Siguen Funcionando
1. Simular webhook con estudiantes
2. Simular webhook con tutela
3. Verificar que ambos siguen generando documentos

---

## 📊 Resumen de Cambios

### Archivos a Modificar
1. ✅ `functions/src/index.ts`
   - Agregar detección de reclamación
   - Agregar procesamiento de reclamación
   - Agregar metadata de reclamación al purchase
   - Mejorar manejo de errores

### Líneas Aproximadas
- **Detección:** Línea ~2430
- **Procesamiento:** Línea ~2790
- **Purchase Data:** Línea ~2709

---

## ✅ Checklist de Implementación

- [ ] Agregar detección de `reclamacion_cantidades` en metadata
- [ ] Agregar lógica de procesamiento en `processItemDocuments`
- [ ] Agregar metadata de reclamación al purchase
- [ ] Mejorar manejo de errores
- [ ] Probar con reclamación real
- [ ] Verificar que estudiantes y tutela siguen funcionando
- [ ] Desplegar a Firebase Functions
- [ ] Verificar logs en producción

---

## 🚀 Próximos Pasos

1. **Implementar cambios** en `functions/src/index.ts`
2. **Probar localmente** con Stripe CLI
3. **Desplegar** a Firebase Functions
4. **Monitorear** logs y errores
5. **Verificar** que los 3 flujos funcionan correctamente

---

**Última Actualización:** Diciembre 2024

