# Checklist: Configuración Webhook para Acción de Tutela

## ✅ Completado

1. **Webhook configurado en Stripe Dashboard**
   - ✅ Nombre actualizado: `avocat-payments-webhook`
   - ✅ Descripción actualizada
   - ✅ Eventos configurados: `checkout.session.completed` ✓
   - ✅ URL del endpoint: `https://stripewebhook-xph64x4ova-uc.a.run.app`

## ⚠️ Pendiente - Implementación en Código

### 1. Modificar `createCheckoutSession` para pasar `documentType` al metadata

**Archivo**: `functions/src/index.ts` (línea ~1158)

**Problema**: Actualmente solo acepta `items, customerEmail, successUrl, cancelUrl, userId` del body, pero `TutelaProcessSimple` está enviando `documentType`, `docId`, `tutelaId` que no se están usando.

**Solución**: 
- Aceptar `documentType` del body
- Pasarlo al metadata de Stripe (línea ~1231)

### 2. Modificar `processWebhookAsync` para detectar y procesar `accion_tutela`

**Archivo**: `functions/src/index.ts` (línea ~1863)

**Problema**: Actualmente solo procesa `estudiantes` (llama a `generateStudentDocumentPackageCore` en línea 1999). No detecta `documentType` del metadata.

**Solución**:
- Extraer `documentType` del `session.metadata` (línea ~1895)
- Si `documentType === 'accion_tutela'`, procesar de manera diferente
- Si `documentType === 'estudiantes'` o no existe, usar lógica actual

### 3. Implementar lógica de procesamiento para `accion_tutela`

**Opciones**:

**Opción A**: Llamar a la función existente `accionTutela` (si existe)
- Buscar función `accionTutela` en `functions/src/index.ts`
- Llamarla con los datos del formulario desde metadata

**Opción B**: Crear purchase y marcar para procesamiento posterior
- Crear purchase con `documentType: 'accion_tutela'`
- Guardar metadata del formulario (`tutelaId`, `docId`, `formData`)
- El frontend puede llamar a `/api/accion-tutela` después del pago

**Opción C**: Generar documento directamente en el webhook
- Similar a `estudiantes`, pero usando lógica de `accion-tutela`

### 4. Verificar Webhook Secret en Firebase

**Acción requerida**:
1. En Stripe Dashboard, copiar el **Signing Secret** (`whsec_...`)
2. Verificar que esté configurado en Firebase Secrets:
   ```bash
   firebase functions:secrets:access STRIPE_WEBHOOK_SECRET
   ```
3. Si no existe, configurarlo:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   # Pegar el valor whsec_...
   ```

### 5. Investigar fallos del webhook (5 de 7 fallaron)

**Problema**: En Stripe Dashboard muestra "Fallidos 5" de 7 entregas.

**Acciones**:
1. Revisar logs de Firebase Cloud Functions:
   ```bash
   firebase functions:log --only stripeWebhook
   ```
2. Verificar errores comunes:
   - Timeout (máximo 11 segundos según dashboard)
   - Errores de validación
   - Problemas con raw body
3. Verificar que el webhook secret sea correcto

## 📋 Pasos de Implementación Recomendados

### Paso 1: Actualizar `createCheckoutSession`

```typescript
// En functions/src/index.ts, línea ~1158
const { items, customerEmail, successUrl, cancelUrl, userId, documentType, docId, tutelaId } = req.body;

// ... código existente ...

// En línea ~1231, agregar documentType al metadata
metadata: {
  items: JSON.stringify(items),
  totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  orderId,
  userId,
  documentType: documentType || 'estudiantes', // ⭐ NUEVO
  docId: docId || null, // ⭐ NUEVO (para tutela)
  tutelaId: tutelaId || null, // ⭐ NUEVO (para tutela)
},
```

### Paso 2: Actualizar `processWebhookAsync`

```typescript
// En functions/src/index.ts, línea ~1895
const items = JSON.parse(itemsJson);
const documentType = session.metadata?.documentType || 'estudiantes'; // ⭐ NUEVO

// ... código existente para crear purchaseData ...

// Agregar documentType al purchase
purchaseData.documentType = documentType; // ⭐ NUEVO

// ... guardar purchase ...

// En línea ~1980, modificar processItemDocuments para detectar tipo
const processItemDocuments = async (item: any, itemIndex: number): Promise<any> => {
  try {
    console.log(`📄 [Item ${itemIndex + 1}] Generando documento: ${item.name} (x${item.quantity})`);
    
    if (documentType === 'accion_tutela') {
      // ⭐ NUEVO: Lógica para accion_tutela
      // Opción: Llamar a función existente o crear purchase para procesamiento posterior
      return await processTutelaDocument(item, itemIndex, session, purchaseRef);
    } else {
      // Lógica existente para estudiantes
      return await processEstudiantesDocument(item, itemIndex, userId, customerEmail, openai);
    }
  } catch (error) {
    // ... manejo de errores ...
  }
};
```

### Paso 3: Implementar función para procesar tutela

```typescript
async function processTutelaDocument(
  item: any,
  itemIndex: number,
  session: Stripe.Checkout.Session,
  purchaseRef: admin.firestore.DocumentReference
) {
  // Opción A: Llamar a función existente accionTutela
  // Opción B: Guardar metadata y procesar después
  // Opción C: Generar documento directamente
  
  // Por ahora, marcar como pendiente y actualizar purchase
  const tutelaId = session.metadata?.tutelaId;
  const docId = session.metadata?.docId;
  
  return {
    ...item,
    status: 'pending',
    documentType: 'accion_tutela',
    tutelaId,
    docId,
    // El frontend puede llamar a /api/accion-tutela después del pago
  };
}
```

## 🔍 Verificación Post-Implementación

1. **Probar checkout de tutela**:
   - Ir a `/dashboard/accion-tutela`
   - Completar formulario
   - Procesar pago
   - Verificar que se crea purchase con `documentType: 'accion_tutela'`

2. **Verificar logs**:
   ```bash
   firebase functions:log --only stripeWebhook --limit 50
   ```

3. **Verificar en Stripe Dashboard**:
   - Ir a Webhooks → `avocat-payments-webhook`
   - Verificar que nuevas entregas sean exitosas
   - Revisar que no haya más fallos

4. **Verificar en Firestore**:
   - Ir a colección `purchases`
   - Buscar purchase reciente
   - Verificar que tenga `documentType: 'accion_tutela'`

## ⚠️ Nota sobre los 5 Fallos

Los 5 fallos anteriores pueden ser de:
- Configuraciones antiguas
- Tests anteriores
- Errores de timeout

**Recomendación**: Después de implementar los cambios, monitorear las nuevas entregas. Si siguen fallando, revisar logs específicos.


