# Assessment del Modelo de Firestore - Dashboards
## Análisis de las Páginas: Estudiantes, Reclamación de Cantidades y Acción de Tutela

**Fecha de Assessment:** 2025-01-27  
**Rama:** `dev_reclamacion`  
**Versión del Código:** Post-merge con `dev`

---

## Resumen Ejecutivo

Este documento evalúa el modelo de datos de Firestore utilizado por tres dashboards principales de la plataforma Avocat LegalTech v3:

1. **`/dashboard/estudiantes`** - Dashboard para estudiantes de derecho
2. **`/dashboard/reclamacion-cantidades`** - Dashboard para reclamaciones monetarias
3. **`/dashboard/accion-tutela`** - Dashboard para acciones de tutela (Colombia)

### Hallazgos Principales

- ✅ **Modelo unificado de `purchases`**: Las tres páginas utilizan la misma colección `purchases` con diferenciación por `documentType`
- ⚠️ **Inconsistencias en estructura**: Algunos campos varían según el tipo de documento
- ✅ **Buen uso de tipos TypeScript**: Existe un sistema de tipos unificado en `src/types/purchase.ts`
- ⚠️ **Falta de normalización**: Algunos datos están duplicados entre colecciones

---

## 1. Dashboard de Estudiantes (`/dashboard/estudiantes`)

### 1.1 Colecciones Utilizadas

#### Colección Principal: `purchases`

**Query utilizada:**
```typescript
query(
  collection(db, 'purchases'),
  where('userId', '==', user.uid),
  orderBy('createdAt', 'desc')
)
```

**Filtrado adicional:**
- Filtra por `documentType === 'estudiantes'` (implícito o explícito)
- Filtra compras completadas o con documentos generados

#### Colección Secundaria: `documents`

**Uso:**
- Consulta documentos relacionados mediante `item.documentId`
- Ruta: `doc(db, 'documents', item.documentId)`

### 1.2 Estructura de Datos Esperada

#### Purchase Document (`purchases/{purchaseId}`)

```typescript
{
  // Identificación
  id: string;                          // ID del documento Firestore
  userId: string;                      // UID del usuario
  customerEmail: string;               // Email del cliente
  
  // Tipo de documento
  documentType: 'estudiantes';         // ⭐ Diferenciador clave
  
  // Items de compra
  items: Array<{
    id: string;
    name: string;                      // Nombre del documento legal
    area: string;                      // Área legal (ej: "Derecho Civil")
    country: string;                   // País (default: "España")
    price: number;                     // Precio unitario
    quantity: number;                  // Cantidad
    
    // Estado del item
    status: 'pending' | 'completed' | 'failed';
    
    // Documentos generados (para estudiantes)
    packageFiles?: {
      templateDocx?: GeneratedPackageFile;    // Plantilla Word
      templatePdf?: GeneratedPackageFile;     // Plantilla PDF
      sampleDocx?: GeneratedPackageFile;       // Ejemplo Word
      samplePdf?: GeneratedPackageFile;       // Ejemplo PDF
      studyMaterialPdf?: GeneratedPackageFile; // Dossier académico (≥3 páginas)
    };
    
    // URLs de descarga (legacy)
    downloadUrl?: string | null;
    storagePath?: string | null;
    documentId?: string | null;
  }>;
  
  // Información de pago
  total: number;                       // Total de la compra
  currency: string;                    // Moneda (default: 'EUR')
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  
  // Stripe integration
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  
  // Tracking de generación
  documentsGenerated?: number;         // Contador de documentos generados
  documentsFailed?: number;            // Contador de documentos fallidos
  webhookProcessedAt?: Timestamp | Date;
  
  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  
  // Metadata
  source: 'stripe_webhook' | 'manual' | 'migrated' | 'admin';
  paymentMethod?: string;
  metadata?: Record<string, any>;
}
```

#### GeneratedPackageFile Structure

```typescript
{
  path: string;                        // Ruta en Firebase Storage
  downloadUrl: string;                 // URL de descarga
  contentType: string;                 // MIME type (ej: "application/pdf")
  size: number;                       // Tamaño en bytes
  token?: string;                     // Token de acceso (si aplica)
}
```

### 1.3 Flujo de Datos

1. **Selección de documentos**: Usuario selecciona área legal y tipo de escrito
2. **Carrito**: Items se almacenan en estado local (`cart`)
3. **Checkout**: Se crea sesión de Stripe con `documentType: 'estudiantes'`
4. **Webhook**: Stripe webhook crea/actualiza `purchase` en Firestore
5. **Generación**: Backend genera documentos y actualiza `items[].packageFiles`
6. **Polling**: Frontend consulta `purchases` cada 3 segundos hasta completar
7. **Visualización**: Se muestran documentos desde `packageFiles`

### 1.4 Problemas Identificados

1. **Falta de índice compuesto**: Query requiere índice `userId + createdAt + documentType`
2. **Normalización de URLs**: Múltiples campos para URLs (`downloadUrl`, `previewUrl`, `storagePath`)
3. **Polling agresivo**: Polling cada 3 segundos puede generar costos altos en Firestore
4. **Falta de validación**: No se valida estructura de `packageFiles` antes de mostrar

---

## 2. Dashboard de Reclamación de Cantidades (`/dashboard/reclamacion-cantidades`)

### 2.1 Colecciones Utilizadas

#### Colección Principal: `purchases`

**Query utilizada (desde PurchaseHistoryComponent):**
```typescript
query(
  collection(db, 'purchases'),
  where('userId', '==', userId),
  where('documentType', '==', 'reclamacion_cantidades'),
  orderBy('createdAt', 'desc')
)
```

#### Colección Secundaria: `reclamaciones` (posible)

**Nota:** El código actual no muestra consultas directas a `reclamaciones`, pero según `FIRESTORE_MODEL.md`, existe esta colección.

### 2.2 Estructura de Datos Esperada

#### Purchase Document (`purchases/{purchaseId}`)

```typescript
{
  // Identificación (igual que estudiantes)
  id: string;
  userId: string;
  customerEmail: string;
  
  // Tipo de documento
  documentType: 'reclamacion_cantidades';  // ⭐ Diferenciador clave
  
  // Items de compra
  items: Array<{
    id: string;
    name: string;                           // Nombre del documento
    area: string;                           // Área legal
    country: string;                        // País
    price: number;
    quantity: number;
    status: 'pending' | 'completed' | 'failed';
    
    // Documentos generados (para reclamación)
    downloadUrl?: string | null;            // URL del PDF generado
    storagePath?: string | null;            // Ruta en Storage
    documentId?: string | null;              // ID del documento en `documents`
    
    // Metadata específica de reclamación
    formData?: Record<string, any>;          // Datos del formulario
    amountClaimed?: number;                  // Cantidad reclamada
    accuracy?: number;                       // Precisión del OCR (0-100)
  }>;
  
  // Resto igual que estudiantes
  total: number;
  currency: string;
  status: PurchaseStatus;
  // ... (campos comunes)
}
```

#### Reclamacion Document (`reclamaciones/{reclId}`) - Según FIRESTORE_MODEL.md

```typescript
{
  id: string;
  userId: string;
  titulo: string;
  fechaISO: string;
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
    primer: { /* ... */ };
    segundo: { /* ... */ };
    tercer: { /* ... */ };
    cuarto: { /* ... */ };
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
  
  // Documentos asociados
  documentId?: string;                      // Referencia a documents/{docId}
  storagePath?: string;                     // Ruta del documento
  documentos?: number;                      // Cantidad de documentos
  
  // Métricas
  precision?: number;                       // Precisión de la reclamación
  precio?: number;                          // Precio de generación
  cuantia?: number;                         // Cuantía reclamada
}
```

### 2.3 Flujo de Datos

1. **Formulario**: Usuario completa formulario de reclamación (componente `ReclamacionProcessSimple`)
2. **Subida de documentos**: Usuario sube documentos PDF/imágenes
3. **OCR**: Backend procesa documentos con OCR
4. **Generación**: Backend genera documento legal con IA
5. **Pago**: Usuario procede al pago (Stripe)
6. **Webhook**: Se crea/actualiza `purchase` en Firestore
7. **Almacenamiento**: Documento se guarda en `documents/{docId}` y Storage
8. **Visualización**: Se muestra en historial de compras

### 2.4 Problemas Identificados

1. **Duplicación de datos**: Datos de reclamación pueden estar en `purchases.items[].formData` y `reclamaciones/{reclId}`
2. **Falta de relación explícita**: No hay campo `reclamacionId` en `purchases` que referencie `reclamaciones`
3. **Índice requerido**: Query necesita índice `userId + documentType + createdAt`
4. **Inconsistencia en estructura**: `reclamaciones` tiene estructura diferente a `purchases.items`

---

## 3. Dashboard de Acción de Tutela (`/dashboard/accion-tutela`)

### 3.1 Colecciones Utilizadas

#### Colección Principal: `purchases`

**Query utilizada:**
```typescript
query(
  collection(db, 'purchases'),
  where('userId', '==', user.uid),
  where('documentType', '==', 'accion_tutela'),
  orderBy('createdAt', 'desc')
)
```

#### Colección Secundaria: `tutelas` (posible)

**Nota:** Similar a reclamaciones, existe según `FIRESTORE_MODEL.md` pero no se consulta directamente en el código actual.

#### Colección Secundaria: `payment_metadata`

**Uso en TutelaProcessSimple:**
```typescript
await addDoc(collection(db, 'payment_metadata'), {
  ...paymentMetadata,
  userId: userId,
  customerEmail: userEmail,
  // ...
});
```

### 3.2 Estructura de Datos Esperada

#### Purchase Document (`purchases/{purchaseId}`)

```typescript
{
  // Identificación (igual que otros)
  id: string;
  userId: string;
  customerEmail: string;
  
  // Tipo de documento
  documentType: 'accion_tutela';           // ⭐ Diferenciador clave
  
  // Items de compra
  items: Array<{
    id: string;
    name: string;
    area: string;
    country: string;
    price: number;
    quantity: number;
    status: 'pending' | 'completed' | 'failed';
    
    // Documentos generados (para tutela)
    packageFiles?: {
      tutelaPdf?: GeneratedPackageFile;     // PDF de la acción de tutela
      tutelaDocx?: GeneratedPackageFile;     // Word de la acción de tutela
    };
    
    // URLs legacy
    downloadUrl?: string | null;
    storagePath?: string | null;
    documentId?: string | null;
    
    // Metadata específica de tutela
    tutelaId?: string;                      // ID de la tutela en `tutelas`
    docId?: string;                         // ID del documento
    formData?: Record<string, any>;          // Datos del formulario
  }>;
  
  // Metadata a nivel de purchase
  tutelaId?: string;                        // ID de la tutela
  docId?: string;                           // ID del documento
  formData?: Record<string, any>;           // Datos del formulario
  
  // Resto igual que otros
  total: number;
  currency: string;
  status: PurchaseStatus;
  // ... (campos comunes)
}
```

#### Tutela Document (`tutelas/{tutelaId}`) - Según FIRESTORE_MODEL.md

```typescript
{
  id: string;
  userId: string;
  titulo: string;
  fechaISO: string;
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
  hechos: string;                           // Descripción de los hechos
  peticiones: string;                       // Peticiones específicas
  
  // Documentos asociados
  documentId?: string;                      // Referencia a documents/{docId}
  storagePath?: string;                      // Ruta del documento
  documentos?: number;                      // Cantidad de documentos
  
  // Métricas
  precision?: number;                       // Precisión
  precio?: number;                          // Precio de generación
}
```

#### Payment Metadata Document (`payment_metadata/{metadataId}`)

```typescript
{
  userId: string;
  customerEmail: string;
  // ... otros campos de metadata de pago
}
```

### 3.3 Flujo de Datos

1. **Formulario**: Usuario completa formulario de acción de tutela (componente `TutelaProcessSimple`)
2. **Validación**: Se validan datos del formulario
3. **Pago**: Usuario procede al pago (Stripe)
4. **Metadata**: Se guarda metadata en `payment_metadata`
5. **Webhook**: Se crea/actualiza `purchase` en Firestore
6. **Generación**: Backend genera documento de tutela con IA
7. **Almacenamiento**: Documento se guarda en `documents/{docId}` y Storage
8. **Polling**: Frontend consulta `purchases` cada 3 segundos
9. **Visualización**: Se muestra en historial de compras

### 3.4 Problemas Identificados

1. **Duplicación de datos**: Datos de tutela en `purchases.items[].formData`, `purchases.formData` y posiblemente `tutelas/{tutelaId}`
2. **Falta de relación explícita**: No hay campo `tutelaId` consistente en todos los niveles
3. **Índice requerido**: Query necesita índice `userId + documentType + createdAt`
4. **Colección payment_metadata**: No está documentada en `FIRESTORE_MODEL.md`

---

## 4. Análisis Comparativo

### 4.1 Similitudes

| Aspecto | Estudiantes | Reclamación | Tutela |
|---------|-------------|-------------|--------|
| Colección principal | `purchases` | `purchases` | `purchases` |
| Diferenciación | `documentType` | `documentType` | `documentType` |
| Estructura base | ✅ Unificada | ✅ Unificada | ✅ Unificada |
| Polling | ✅ Sí (3s) | ❓ No visible | ✅ Sí (3s) |
| Package files | ✅ Completo | ❌ No usado | ✅ Parcial |

### 4.2 Diferencias

| Aspecto | Estudiantes | Reclamación | Tutela |
|---------|-------------|-------------|--------|
| Estructura de documentos | `packageFiles` (5 tipos) | `downloadUrl` simple | `packageFiles` (2 tipos) |
| Colección secundaria | `documents` | `reclamaciones` (posible) | `tutelas` (posible) |
| Metadata adicional | ❌ No | `formData`, `amountClaimed` | `formData`, `tutelaId`, `docId` |
| Payment metadata | ❌ No | ❌ No | ✅ Sí (`payment_metadata`) |

### 4.3 Patrones de Consulta

#### Estudiantes
```typescript
// Query principal
where('userId', '==', user.uid)
orderBy('createdAt', 'desc')

// Filtrado client-side
filter(p => p.documentType === 'estudiantes' || !p.documentType)
filter(p => p.status === 'completed' || hasDocuments(p))
```

#### Reclamación
```typescript
// Query con filtro explícito
where('userId', '==', userId)
where('documentType', '==', 'reclamacion_cantidades')
orderBy('createdAt', 'desc')
```

#### Tutela
```typescript
// Query con filtro explícito
where('userId', '==', user.uid)
where('documentType', '==', 'accion_tutela')
orderBy('createdAt', 'desc')
```

---

## 5. Recomendaciones

### 5.1 Normalización de Datos

**Problema:** Datos duplicados entre `purchases` y colecciones específicas (`reclamaciones`, `tutelas`)

**Recomendación:**
- Usar `purchases` como fuente única de verdad para transacciones
- Usar colecciones específicas solo para datos de formulario/entrada
- Agregar campos de referencia explícitos:
  ```typescript
  // En purchases
  {
    reclamacionId?: string;  // Referencia a reclamaciones/{id}
    tutelaId?: string;        // Referencia a tutelas/{id}
  }
  ```

### 5.2 Índices de Firestore

**Problema:** Queries compuestas requieren índices que pueden no existir

**Recomendación:** Crear índices compuestos en `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "purchases",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "documentType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "purchases",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 5.3 Optimización de Polling

**Problema:** Polling cada 3 segundos genera costos altos

**Recomendación:**
- Implementar WebSockets o Firebase Realtime Database para actualizaciones en tiempo real
- Usar Cloud Functions triggers para notificar al cliente
- Implementar backoff exponencial en polling

### 5.4 Validación de Estructura

**Problema:** No hay validación de estructura de `packageFiles` antes de mostrar

**Recomendación:**
- Usar función `validatePurchase()` de `src/types/purchase.ts`
- Validar estructura de `packageFiles` antes de renderizar
- Mostrar mensajes de error claros si falta estructura

### 5.5 Documentación de Colecciones

**Problema:** `payment_metadata` no está documentada en `FIRESTORE_MODEL.md`

**Recomendación:**
- Agregar documentación de `payment_metadata` a `FIRESTORE_MODEL.md`
- Documentar todas las colecciones utilizadas en el código

### 5.6 Unificación de Estructura de Documentos

**Problema:** Diferentes estructuras para documentos generados

**Recomendación:**
- Usar `packageFiles` de forma consistente en los tres tipos
- Mantener `downloadUrl` y `storagePath` solo para compatibilidad legacy
- Migrar datos existentes a estructura unificada

---

## 6. Checklist de Implementación

### 6.1 Índices de Firestore
- [x] Crear índice `userId + documentType + createdAt` para purchases ✅ **COMPLETADO**
- [x] Crear índice `userId + createdAt` para purchases (estudiantes) ✅ **YA EXISTÍA**
- [ ] **PENDIENTE**: Desplegar índices a Firestore con `firebase deploy --only firestore:indexes`

### 6.2 Normalización
- [ ] Agregar campos `reclamacionId` y `tutelaId` a purchases
- [ ] Migrar datos existentes a estructura unificada
- [ ] Actualizar código para usar referencias explícitas

### 6.3 Optimización
- [ ] Implementar backoff exponencial en polling
- [ ] Considerar WebSockets para actualizaciones en tiempo real
- [ ] Optimizar queries para reducir lecturas de Firestore

### 6.4 Validación
- [ ] Implementar validación de estructura de `packageFiles`
- [ ] Agregar validación de `purchase` antes de mostrar
- [ ] Mostrar mensajes de error claros

### 6.5 Documentación
- [ ] Documentar `payment_metadata` en `FIRESTORE_MODEL.md`
- [ ] Actualizar diagramas de relaciones
- [ ] Documentar flujos de datos específicos por tipo

---

## 7. Métricas y Monitoreo

### 7.1 Métricas Recomendadas

1. **Lecturas de Firestore por tipo de dashboard**
   - Estudiantes: ~X lecturas/día
   - Reclamación: ~Y lecturas/día
   - Tutela: ~Z lecturas/día

2. **Tiempo promedio de polling**
   - Estudiantes: ~X segundos hasta completar
   - Tutela: ~Y segundos hasta completar

3. **Tasa de éxito de generación**
   - Por tipo de documento
   - Por área legal

4. **Costo de Firestore por dashboard**
   - Lecturas
   - Escrituras
   - Almacenamiento

### 7.2 Alertas Recomendadas

- Polling timeout (>10 minutos)
- Tasa de error en generación >5%
- Costo diario de Firestore >X€
- Índices faltantes en producción

---

## 8. Conclusión

El modelo de Firestore para los tres dashboards está **bien estructurado** pero tiene **oportunidades de mejora**:

### Fortalezas
- ✅ Modelo unificado de `purchases` con diferenciación por `documentType`
- ✅ Sistema de tipos TypeScript bien definido
- ✅ Estructura flexible que permite diferentes tipos de documentos

### Debilidades
- ⚠️ Duplicación de datos entre colecciones
- ⚠️ Falta de índices optimizados
- ⚠️ Polling agresivo sin optimización
- ⚠️ Inconsistencias en estructura de documentos generados

### Prioridades
1. **Alta**: Crear índices de Firestore necesarios
2. **Media**: Normalizar estructura de documentos generados
3. **Media**: Optimizar polling o implementar WebSockets
4. **Baja**: Documentar colecciones faltantes

---

**Documento generado automáticamente desde el análisis del código en la rama `dev_reclamacion`**

