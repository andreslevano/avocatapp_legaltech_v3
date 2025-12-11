# Implementación: Firestore para Acción de Tutela

## Objetivo
Implementar un flujo similar al de estudiantes para acción de tutela, añadiendo atributos que diferencien documentos de "estudiantes" vs "accion_tutela" en todas las colecciones de Firestore relevantes.

## Análisis del Estado Actual

### Flujo de Estudiantes (Referencia)
1. **Pago**: Usuario procede al pago → Stripe Checkout
2. **Webhook**: Stripe webhook crea documento en `purchases` collection
3. **Generación**: Backend genera documentos y actualiza `purchases`
4. **Almacenamiento**: 
   - `purchases/{purchaseId}` - Documento principal
   - `student_document_packages/{packageId}` - Paquetes de documentos (opcional)
   - `documents/{docId}` - Documentos globales (opcional)
   - Firebase Storage: `students/{userId}/documents/{docId}.pdf`

### Flujo Actual de Acción de Tutela
1. **Pago**: Usuario procede al pago → Stripe Checkout (línea 463 en TutelaProcessSimple.tsx)
2. **Generación**: Llama a `/api/accion-tutela` después del pago
3. **Problema**: No se crea documento en `purchases` collection de forma consistente
4. **Problema**: No hay diferenciación clara entre estudiantes y tutela

## Atributos de Diferenciación Propuestos

### 1. Campo `documentType` en Purchase
```typescript
interface Purchase {
  // ... campos existentes
  documentType?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades' | 'general';
  // O alternativamente:
  category?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades' | 'general';
}
```

### 2. Campo `documentType` en PurchaseItem
```typescript
interface PurchaseItem {
  // ... campos existentes
  documentType?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades';
}
```

### 3. Campo `documentType` en Documents Collection
```typescript
interface Document {
  // ... campos existentes
  documentType?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades';
  category?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades';
}
```

## Implementación Detallada

### Fase 1: Actualizar Tipos TypeScript

#### 1.1 Actualizar `src/types/purchase.ts`
- Añadir campo `documentType` opcional a `Purchase` interface
- Añadir campo `documentType` opcional a `PurchaseItem` interface
- Actualizar función `normalizePurchase` para incluir `documentType`

**Archivo**: `src/types/purchase.ts`

```typescript
export interface Purchase {
  // ... campos existentes
  documentType?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades' | 'general';
  // ...
}

export interface PurchaseItem {
  // ... campos existentes
  documentType?: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades';
  // ...
}
```

### Fase 2: Actualizar Webhook/API de Stripe

#### 2.1 Crear/Actualizar API Route para Crear Purchase en Acción de Tutela
**Ubicación**: Necesitamos encontrar o crear el webhook handler de Stripe

**Funcionalidad**:
- Cuando Stripe confirma el pago, crear documento en `purchases` collection
- Incluir `documentType: 'accion_tutela'` en el documento
- Incluir `documentType: 'accion_tutela'` en cada item
- Guardar `tutelaId` y `docId` en metadata

**Estructura del Purchase para Acción de Tutela**:
```typescript
{
  id: string,
  userId: string,
  customerEmail: string,
  documentType: 'accion_tutela', // ⭐ NUEVO
  items: [{
    id: string,
    name: 'Acción de Tutela',
    area: 'Derecho Constitucional',
    country: 'Colombia',
    price: 15.00,
    quantity: 1,
    documentType: 'accion_tutela', // ⭐ NUEVO
    status: 'pending'
  }],
  total: 15.00,
  currency: 'EUR',
  status: 'pending',
  source: 'stripe_webhook',
  stripeSessionId: string,
  metadata: {
    tutelaId: string,
    docId: string,
    documentType: 'accion_tutela' // ⭐ NUEVO
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Fase 3: Actualizar Componente TutelaProcessSimple

#### 3.1 Actualizar `handlePayment` para incluir documentType
**Archivo**: `src/components/TutelaProcessSimple.tsx` (línea ~452)

**Cambios**:
- Añadir `documentType: 'accion_tutela'` en el body del request a `/api/stripe/create-checkout-session`

```typescript
body: JSON.stringify({
  documentType: 'accion_tutela', // ⭐ NUEVO - ya existe pero asegurar que se use
  docId: docId,
  tutelaId: tutelaId,
  userId: userId || 'demo_user',
  customerEmail: userEmail || 'user@example.com',
  // ... resto
})
```

#### 3.2 Actualizar `generateDocument` para actualizar Purchase
**Archivo**: `src/components/TutelaProcessSimple.tsx` (línea ~498)

**Cambios**:
- Después de generar el documento, actualizar el purchase en Firestore
- Añadir `documentType: 'accion_tutela'` si no existe
- Actualizar status del item a 'completed'
- Guardar downloadUrl y storagePath

### Fase 4: Crear/Actualizar API Route `/api/accion-tutela`

#### 4.1 Asegurar que se crea/actualiza Purchase
**Funcionalidad**:
- Si el purchase no existe, crearlo con `documentType: 'accion_tutela'`
- Si existe, actualizarlo con los documentos generados
- Guardar documentos en Firebase Storage con path: `accion-tutela/{userId}/{docId}.pdf`

**Estructura del Document para Acción de Tutela**:
```typescript
{
  id: string,
  userId: string,
  docId: string,
  type: 'accion_tutela',
  documentType: 'accion_tutela', // ⭐ NUEVO
  areaLegal: string,
  tipoEscrito: 'Acción de Tutela',
  // ... resto de campos
}
```

### Fase 5: Actualizar Colección `tutelas` (si existe)

#### 5.1 Añadir referencia al Purchase
**Archivo**: Si existe colección `tutelas/{tutelaId}`

**Cambios**:
- Añadir campo `purchaseId` que referencia a `purchases/{purchaseId}`
- Añadir campo `documentType: 'accion_tutela'`

### Fase 6: Actualizar Queries y Filtros

#### 6.1 Actualizar carga de Purchase History
**Archivo**: `src/app/dashboard/accion-tutela/page.tsx` o componente de historial

**Funcionalidad**:
- Filtrar purchases por `documentType === 'accion_tutela'`
- Mostrar solo compras de acción de tutela

#### 6.2 Actualizar carga en Estudiantes
**Archivo**: `src/app/dashboard/estudiantes/page.tsx` (línea ~654)

**Funcionalidad**:
- Filtrar purchases por `documentType === 'estudiantes'` o `documentType === undefined` (backward compatibility)

### Fase 7: Actualizar Scripts de Procesamiento

#### 7.1 Actualizar `scripts/reprocess-purchase.ts`
**Cambios**:
- Añadir lógica para procesar purchases de tipo `accion_tutela`
- Generar documentos apropiados según el `documentType`
- Guardar en rutas de Storage apropiadas

### Fase 8: Actualizar Firebase Storage Paths

#### 8.1 Estructura de Paths
- **Estudiantes**: `students/{userId}/documents/{docId}.pdf`
- **Acción de Tutela**: `accion-tutela/{userId}/{docId}.pdf` ⭐ NUEVO
- **Reclamación**: `reclamacion-cantidades/{userId}/{docId}.pdf` (si aplica)

## Colecciones de Firestore Impactadas

### 1. `purchases/{purchaseId}` ⭐ PRINCIPAL
- **Acción**: CREATE/UPDATE
- **Campos nuevos**: `documentType: 'accion_tutela'`
- **Cuándo**: 
  - CREATE: Cuando Stripe webhook confirma pago
  - UPDATE: Cuando se generan documentos

### 2. `documents/{docId}` (opcional)
- **Acción**: CREATE
- **Campos nuevos**: `documentType: 'accion_tutela'`
- **Cuándo**: Si se guardan documentos globalmente

### 3. `tutelas/{tutelaId}` (si existe)
- **Acción**: UPDATE
- **Campos nuevos**: `purchaseId`, `documentType: 'accion_tutela'`
- **Cuándo**: Cuando se completa la generación

### 4. `users/{uid}` (opcional)
- **Acción**: UPDATE (stats)
- **Cuándo**: Si se actualizan estadísticas del usuario

## Flujo Completo Propuesto

```
1. Usuario completa formulario de Acción de Tutela
   ↓
2. Usuario procede al pago (TutelaProcessSimple.handlePayment)
   - Llama a /api/stripe/create-checkout-session
   - Incluye documentType: 'accion_tutela'
   ↓
3. Stripe procesa pago
   ↓
4. Stripe Webhook → Backend
   - ✅ CREA: purchases/{purchaseId}
     - documentType: 'accion_tutela'
     - items[].documentType: 'accion_tutela'
     - status: 'pending'
   ↓
5. Usuario regresa con payment=success
   ↓
6. Frontend llama a /api/accion-tutela
   ↓
7. Backend genera documento
   - ✅ ACTUALIZA: purchases/{purchaseId}
     - items[].status: 'completed'
     - items[].downloadUrl
     - items[].storagePath
     - documentsGenerated: 1
     - status: 'completed'
   - ✅ CREA: documents/{docId} (opcional)
     - documentType: 'accion_tutela'
   - ✅ GUARDA: Firebase Storage
     - Path: accion-tutela/{userId}/{docId}.pdf
   - ✅ ACTUALIZA: tutelas/{tutelaId} (si existe)
     - purchaseId
     - documentType: 'accion_tutela'
```

## Consideraciones de Backward Compatibility

1. **Purchases existentes sin documentType**:
   - Tratar como `'general'` o inferir del contexto
   - Script de migración opcional

2. **Queries**:
   - Incluir purchases sin `documentType` en resultados si aplica
   - O filtrar explícitamente por `documentType`

## Testing

1. **Test de creación de Purchase**:
   - Verificar que se crea con `documentType: 'accion_tutela'`
   - Verificar que items tienen `documentType: 'accion_tutela'`

2. **Test de generación de documento**:
   - Verificar que se actualiza purchase correctamente
   - Verificar que se guarda en Storage con path correcto

3. **Test de queries**:
   - Verificar que se filtran correctamente por `documentType`
   - Verificar backward compatibility

## Orden de Implementación Recomendado

1. ✅ Fase 1: Actualizar tipos TypeScript
2. ✅ Fase 2: Actualizar webhook/API de Stripe
3. ✅ Fase 3: Actualizar TutelaProcessSimple
4. ✅ Fase 4: Actualizar API route accion-tutela
5. ✅ Fase 5: Actualizar colección tutelas (si existe)
6. ✅ Fase 6: Actualizar queries
7. ✅ Fase 7: Actualizar scripts
8. ✅ Fase 8: Actualizar Storage paths

## Notas Adicionales

- El campo `documentType` debe ser consistente en todas las colecciones
- Considerar índices compuestos en Firestore: `userId + documentType + createdAt`
- Asegurar que el webhook de Stripe maneja correctamente el `documentType`
- Documentar el nuevo campo en FIRESTORE_MODEL.md

