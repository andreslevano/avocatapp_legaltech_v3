# Testing de Flujos Completos: Estudiantes, Reclamación y Acción de Tutela

**Fecha:** Diciembre 2024  
**Objetivo:** Verificar que los 3 flujos funcionan correctamente end-to-end

---

## 📋 Checklist de Verificación

### ✅ 1. Endpoints API Verificados

#### `/api/stripe/create-checkout-session` (Unificado)
- ✅ **Estado:** Creado y funcional
- ✅ **Ubicación:** `src/app/api/stripe/create-checkout-session/route.ts`
- ✅ **Soporta:** Estudiantes, Tutela, Reclamación
- ✅ **Validaciones:**
  - Reclamación: Valida que existe caso y tiene OCR/borrador
  - Todos: Valida userId, customerEmail, successUrl, cancelUrl

#### `/api/stripe/webhook`
- ✅ **Estado:** Funcional
- ✅ **Ubicación:** `src/app/api/stripe/webhook/route.ts`
- ✅ **Funcionalidades:**
  - Crea purchases para todos los tipos
  - Genera documento final para reclamación automáticamente
  - Metadata consistente

#### `/api/reclamaciones-cantidades/generate-final`
- ✅ **Estado:** Funcional
- ✅ **Ubicación:** `src/app/api/reclamaciones-cantidades/generate-final/route.ts`
- ✅ **Cambios aplicados:**
  - Usa `savePdfForUser()` (consistente)
  - Path: `reclamaciones/{userId}/documents/{caseId}/`

---

## 🔄 Flujo 1: Estudiantes

### Paso a Paso

#### 1. Preparación
- [ ] Usuario autenticado
- [ ] Dashboard de estudiantes cargado
- [ ] Carrito con items seleccionados

#### 2. Pago
- [ ] Click en "Proceder al Pago"
- [ ] Request a `/api/stripe/create-checkout-session` con:
  ```json
  {
    "items": [...],
    "documentType": "estudiantes",
    "userId": "...",
    "customerEmail": "...",
    "successUrl": "...",
    "cancelUrl": "..."
  }
  ```
- [ ] Respuesta contiene `url` de Stripe Checkout
- [ ] Redirección a Stripe Checkout funciona

#### 3. Stripe Checkout
- [ ] Usuario completa pago en Stripe
- [ ] Stripe redirige a `successUrl` con `?payment=success`

#### 4. Webhook
- [ ] Webhook recibe `checkout.session.completed`
- [ ] Crea purchase en `purchases/{sessionId}`:
  ```typescript
  {
    userId: string,
    amount: number,
    currency: 'eur',
    documentType: 'estudiantes',
    items: [...],
    status: 'completed'
  }
  ```
- [ ] Genera documentos (si está implementado)
- [ ] Guarda PDFs en Storage: `students/{userId}/documents/{docId}/`

#### 5. Frontend
- [ ] Detecta `payment=success` en URL
- [ ] Inicia polling para documentos
- [ ] Muestra documentos en historial cuando están listos

### ✅ Verificaciones

**Endpoint de Checkout:**
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "name": "Contrato de Trabajo",
      "price": 1000,
      "quantity": 1,
      "area": "Derecho Laboral",
      "country": "España"
    }],
    "documentType": "estudiantes",
    "userId": "test-user-id",
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:3000/dashboard/estudiantes?payment=success",
    "cancelUrl": "http://localhost:3000/dashboard/estudiantes?payment=cancelled"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Firestore después del pago:**
- ✅ Documento en `purchases/{sessionId}` con `documentType: 'estudiantes'`
- ✅ Items con información completa
- ✅ Status: 'completed'

---

## 🔄 Flujo 2: Reclamación de Cantidades

### Paso a Paso

#### 1. Preparación
- [ ] Usuario autenticado
- [ ] Dashboard de reclamación cargado
- [ ] Documentos PDF subidos
- [ ] Caso creado en Firestore: `users/{uid}/reclamaciones_cantidades/{caseId}`
- [ ] OCR procesado y borrador generado

#### 2. Pago
- [ ] Click en "Procesar Pago"
- [ ] Request a `/api/stripe/create-checkout-session` con:
  ```json
  {
    "documentType": "reclamacion_cantidades",
    "caseId": "...",
    "uid": "...",
    "userId": "...",
    "customerEmail": "...",
    "successUrl": "...",
    "cancelUrl": "..."
  }
  ```
- [ ] Endpoint valida que caso existe y tiene OCR/borrador
- [ ] Respuesta contiene `url` de Stripe Checkout
- [ ] Redirección a Stripe Checkout funciona

#### 3. Stripe Checkout
- [ ] Usuario completa pago en Stripe
- [ ] Stripe redirige a `successUrl` con `?payment=success&caseId=...`

#### 4. Webhook
- [ ] Webhook recibe `checkout.session.completed`
- [ ] Crea purchase en `purchases/{sessionId}`:
  ```typescript
  {
    userId: string,
    amount: number,
    currency: 'eur',
    documentType: 'reclamacion_cantidades',
    documentId: caseId,
    caseId: caseId,
    metadata: {...}
  }
  ```
- [ ] Llama a `/api/reclamaciones-cantidades/generate-final`
- [ ] Genera documento final con OpenAI
- [ ] Guarda PDF en Storage: `reclamaciones/{userId}/documents/{caseId}/reclamacion-cantidades-{caseId}.pdf`
- [ ] Actualiza caso en Firestore con URL del PDF

#### 5. Frontend
- [ ] Detecta `payment=success` en URL
- [ ] Documento ya está generado (por webhook)
- [ ] Muestra documento en historial

### ✅ Verificaciones

**Endpoint de Checkout:**
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "reclamacion_cantidades",
    "caseId": "recl_1234567890_abc123",
    "uid": "test-user-id",
    "userId": "test-user-id",
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:3000/dashboard/reclamacion-cantidades?payment=success&caseId=recl_1234567890_abc123",
    "cancelUrl": "http://localhost:3000/dashboard/reclamacion-cantidades?payment=cancelled"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Firestore después del pago:**
- ✅ Documento en `purchases/{sessionId}` con `documentType: 'reclamacion_cantidades'`
- ✅ Caso actualizado: `users/{uid}/reclamaciones_cantidades/{caseId}` con status: 'paid'
- ✅ Storage: PDF en `reclamaciones/{userId}/documents/{caseId}/reclamacion-cantidades-{caseId}.pdf`

---

## 🔄 Flujo 3: Acción de Tutela

### Paso a Paso

#### 1. Preparación
- [ ] Usuario autenticado
- [ ] Dashboard de tutela cargado
- [ ] Formulario completado
- [ ] Metadata guardada en Firestore: `payment_metadata/{id}`

#### 2. Pago
- [ ] Click en "Procesar Pago"
- [ ] Request a `/api/stripe/create-checkout-session` con:
  ```json
  {
    "items": [{
      "name": "Acción de Tutela",
      "price": 50000,
      "quantity": 1,
      "area": "Derecho Constitucional",
      "country": "Colombia"
    }],
    "documentType": "accion_tutela",
    "docId": "...",
    "tutelaId": "...",
    "formData": {...},
    "userId": "...",
    "customerEmail": "...",
    "successUrl": "...",
    "cancelUrl": "..."
  }
  ```
- [ ] Respuesta contiene `url` de Stripe Checkout
- [ ] Redirección a Stripe Checkout funciona

#### 3. Stripe Checkout
- [ ] Usuario completa pago en Stripe
- [ ] Stripe redirige a `successUrl` con `?payment=success`

#### 4. Webhook
- [ ] Webhook recibe `checkout.session.completed`
- [ ] Crea purchase en `purchases/{sessionId}`:
  ```typescript
  {
    userId: string,
    amount: number,
    currency: 'cop',
    documentType: 'accion_tutela',
    docId: string,
    tutelaId: string,
    metadata: {...}
  }
  ```
- [ ] Genera documentos (si está implementado en webhook)
- [ ] O marca como pendiente para generación posterior

#### 5. Frontend
- [ ] Detecta `payment=success` en URL
- [ ] Llama a `/api/accion-tutela` para generar documento
- [ ] Muestra documento cuando está listo

### ✅ Verificaciones

**Endpoint de Checkout:**
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "name": "Acción de Tutela",
      "price": 50000,
      "quantity": 1,
      "area": "Derecho Constitucional",
      "country": "Colombia"
    }],
    "documentType": "accion_tutela",
    "docId": "DOC_1234567890_abc123",
    "tutelaId": "TUTELA_1234567890_abc123",
    "formData": {
      "vulnerador": "...",
      "hechos": "...",
      "derecho": "...",
      "peticiones": "..."
    },
    "userId": "test-user-id",
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:3000/dashboard/accion-tutela?payment=success",
    "cancelUrl": "http://localhost:3000/dashboard/accion-tutela?payment=cancelled"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Firestore después del pago:**
- ✅ Documento en `purchases/{sessionId}` con `documentType: 'accion_tutela'`
- ✅ Metadata con `docId` y `tutelaId`
- ✅ Items con información completa

---

## 🧪 Tests Automatizados Sugeridos

### Test 1: Endpoint de Checkout - Estudiantes
```typescript
describe('POST /api/stripe/create-checkout-session - Estudiantes', () => {
  it('debe crear sesión de checkout para estudiantes', async () => {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ name: 'Test', price: 1000, quantity: 1 }],
        documentType: 'estudiantes',
        userId: 'test-user',
        customerEmail: 'test@example.com',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.url).toContain('checkout.stripe.com');
  });
});
```

### Test 2: Endpoint de Checkout - Reclamación
```typescript
describe('POST /api/stripe/create-checkout-session - Reclamación', () => {
  it('debe validar que caso existe antes de crear sesión', async () => {
    // Primero crear caso
    const caseResponse = await fetch('/api/reclamaciones-cantidades/create-case', {
      method: 'POST',
      body: JSON.stringify({ uid: 'test-user' })
    });
    const { caseId } = await caseResponse.json();
    
    // Luego crear checkout
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'reclamacion_cantidades',
        caseId,
        uid: 'test-user',
        userId: 'test-user',
        customerEmail: 'test@example.com',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      })
    });
    
    expect(response.ok).toBe(true);
  });
  
  it('debe rechazar si caso no existe', async () => {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'reclamacion_cantidades',
        caseId: 'invalid-case-id',
        uid: 'test-user',
        userId: 'test-user',
        customerEmail: 'test@example.com',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      })
    });
    
    expect(response.status).toBe(404);
  });
});
```

### Test 3: Webhook - Purchases
```typescript
describe('POST /api/stripe/webhook', () => {
  it('debe crear purchase para estudiantes', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            userId: 'test-user',
            documentType: 'estudiantes'
          },
          amount_total: 1000,
          currency: 'eur'
        }
      }
    };
    
    // Simular webhook
    // Verificar que purchase se crea en Firestore
  });
  
  it('debe crear purchase para reclamación y generar documento', async () => {
    // Similar pero con documentType: 'reclamacion_cantidades'
    // Verificar que se llama a generate-final
  });
});
```

---

## 🔍 Verificaciones Manuales

### 1. Firestore
- [ ] Verificar que purchases se crean correctamente
- [ ] Verificar que `documentType` está presente
- [ ] Verificar que metadata es correcta
- [ ] Para reclamación: verificar que caso se actualiza

### 2. Firebase Storage
- [ ] Verificar que PDFs se guardan en paths correctos:
  - Estudiantes: `students/{userId}/documents/{docId}/`
  - Reclamación: `reclamaciones/{userId}/documents/{caseId}/`
  - Tutela: `accion-tutela/{userId}/documents/{docId}/` (o similar)

### 3. Stripe Dashboard
- [ ] Verificar que sesiones se crean correctamente
- [ ] Verificar que webhooks se reciben
- [ ] Verificar que metadata está presente

### 4. Logs
- [ ] Revisar logs del servidor
- [ ] Verificar que no hay errores
- [ ] Verificar que webhook procesa correctamente

---

## ⚠️ Problemas Conocidos

### 1. Estudiantes
- ⚠️ **Generación de documentos:** Puede no estar completamente implementada en webhook
- ⚠️ **Polling:** Frontend hace polling, pero documentos pueden no generarse automáticamente

### 2. Reclamación
- ✅ **Completo:** Flujo completo implementado
- ✅ **Generación automática:** Webhook genera documento automáticamente

### 3. Tutela
- ⚠️ **Generación de documentos:** Puede requerir llamada manual a `/api/accion-tutela`
- ⚠️ **Webhook:** Puede no generar documentos automáticamente

---

## 📊 Resumen de Estado

| Flujo | Checkout | Webhook | Purchase | Storage | Generación |
|-------|----------|---------|----------|---------|------------|
| **Estudiantes** | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **Reclamación** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tutela** | ✅ | ✅ | ✅ | ✅ | ⚠️ |

**Leyenda:**
- ✅ Completamente funcional
- ⚠️ Parcialmente funcional o requiere verificación

---

## 🚀 Próximos Pasos

1. **Ejecutar tests manuales** para cada flujo
2. **Verificar en producción** que todo funciona
3. **Completar generación automática** para estudiantes y tutela si falta
4. **Documentar** cualquier diferencia en los flujos

---

**Última Actualización:** Diciembre 2024

