# Resumen de Implementación: Acción de Tutela con Payment Link

## Cambios Implementados

### 1. ✅ Stripe Payment Link Integrado
- **URL**: `https://buy.stripe.com/cNi4gzcRUfxF1J08nl8g005`
- **Precio**: 50,000 COP por documento
- **Cantidad ajustable**: 0-99 documentos (configurado en Stripe Dashboard)

### 2. ✅ Selector de Cantidad Agregado
- Input numérico con botones +/- para seleccionar cantidad (1-99)
- Muestra precio unitario y total calculado
- Similar a la funcionalidad de estudiantes

### 3. ✅ Botón "Analizar Probabilidad de Éxito" Removido
- Eliminado del paso 1
- Función `analizarExito` y modal relacionados aún existen pero no se muestran

### 4. ✅ Metadata Guardada en Firestore
- Antes del pago, se guarda metadata en colección `payment_metadata`
- Incluye: `documentType`, `docId`, `tutelaId`, `formData`, `quantity`, `items`
- Permite que el webhook asocie el pago con los datos del formulario

### 5. ✅ Webhook Actualizado para Payment Links
- Detecta cuando no hay metadata en `session.metadata` (Payment Links)
- Busca metadata en Firestore usando `customerEmail`
- Construye items desde `line_items` si es necesario
- Procesa `accion_tutela` correctamente con metadata recuperada

### 6. ✅ Consistencia con Estudiantes Verificada
- `documentType` se guarda correctamente en purchases (default: 'estudiantes')
- Items incluyen `documentType` en la normalización
- Purchase incluye `documentType` a nivel de documento y purchase

## Estructura de Datos

### Payment Metadata (Firestore: `payment_metadata`)
```typescript
{
  documentType: 'accion_tutela',
  docId: string,
  tutelaId: string,
  userId: string,
  customerEmail: string,
  formData: {
    vulnerador: string,
    hechos: string,
    derecho: string,
    peticiones: string,
    medidasProvisionales: boolean,
    ciudad: string
  },
  quantity: number,
  items: Array<{
    name: string,
    area: string,
    country: string,
    price: number,
    quantity: number
  }>,
  status: 'pending_payment' | 'processed',
  createdAt: Timestamp,
  processedAt?: Timestamp,
  sessionId?: string
}
```

### Purchase (Firestore: `purchases`)
```typescript
{
  id: string,
  userId: string,
  customerEmail: string,
  documentType: 'estudiantes' | 'accion_tutela' | 'reclamacion_cantidades',
  items: Array<{
    documentType: string,
    quantity: number,
    // ... otros campos
  }>,
  tutelaId?: string, // Para accion_tutela
  docId?: string, // Para accion_tutela
  formData?: Record<string, any>, // Para accion_tutela
  // ... otros campos
}
```

## Flujo de Pago

1. **Usuario completa formulario** → Paso 1
2. **Usuario selecciona cantidad** → Paso 2
3. **Usuario hace clic en "Procesar Pago"**:
   - Se genera `docId` y `tutelaId`
   - Se guarda metadata en Firestore (`payment_metadata`)
   - Se guarda backup en localStorage
   - Se redirige a Stripe Payment Link
4. **Usuario completa pago en Stripe**
5. **Webhook recibe evento `checkout.session.completed`**:
   - Busca metadata en Firestore por `customerEmail`
   - Crea purchase con `documentType: 'accion_tutela'`
   - Procesa documentos según cantidad
6. **Usuario regresa a la app** → Paso 3 (descarga)

## Verificaciones de Consistencia

### ✅ Estudiantes
- `documentType` se guarda como `'estudiantes'` (default)
- Items incluyen `documentType` en normalización
- Purchase incluye `documentType` a nivel de documento

### ✅ Acción de Tutela
- `documentType` se guarda como `'accion_tutela'`
- Items incluyen `documentType: 'accion_tutela'`
- Purchase incluye `documentType`, `tutelaId`, `docId`, `formData`

## Notas Importantes

1. **Payment Links no pasan metadata directamente**: Por eso se guarda en Firestore antes del pago
2. **Cantidad se maneja en Stripe**: El Payment Link permite 0-99, el usuario ajusta en Stripe
3. **Metadata se busca por email**: El webhook busca metadata pendiente usando `customerEmail`
4. **Backup en localStorage**: Si Firestore falla, localStorage tiene backup (no usado por webhook)

## Cambios Adicionales Implementados

### ✅ Estudiantes - documentType Explícito
- `handleProceedToPayment` ahora pasa `documentType: 'estudiantes'` explícitamente
- Mantiene consistencia con accion_tutela

### ✅ Webhook Mejorado para Payment Links
- Expande sesión de Stripe para obtener `line_items` si no hay metadata
- Detecta `documentType` desde el nombre del producto
- Maneja casos donde no hay metadata ni line_items disponibles

## Pendientes / Mejoras Futuras

1. ⚠️ **Limpiar metadata antigua**: Implementar limpieza de metadata pendiente > 24 horas
2. ⚠️ **Manejar casos edge**: ¿Qué pasa si hay múltiples metadata pendientes para el mismo email?
3. ⚠️ **Testing**: Probar flujo completo con Payment Link real
4. ⚠️ **Verificar índices Firestore**: Asegurar que existe índice para `payment_metadata` query (customerEmail + status)

## Comandos para Desplegar

```bash
# Desplegar funciones
firebase deploy --only functions

# Verificar logs
firebase functions:log --only stripeWebhook --limit 50
```
