# 🔧 Fix: Errores en Endpoints API

## 🚨 Problemas Identificados

### 1. Error 400 "Missing required fields" en `/api/analisis-exito`

**Causa**: La función `reclamacionCantidades` está esperando campos diferentes a los que envía el frontend.

**Frontend envía**:
```json
{
  "datosOCR": {
    "documentos": [...]
  },
  "tipoDocumento": "Reclamación de Cantidades",
  "userId": "..."
}
```

**Función espera**: Probablemente campos como `nombreTrabajador`, `dniTrabajador`, etc.

### 2. Error 400 "No items provided" en `/api/stripe/create-checkout-session`

**Causa**: El código de reclamación no está enviando `items` cuando `documentType === 'reclamacion_cantidades'`, pero la función puede estar validando que existan.

**Código actual** (línea 428-450):
```typescript
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentType: 'reclamacion_cantidades',
    userId: userId || 'demo_user',
    customerEmail: userEmail || 'user@example.com',
    successUrl: `...`,
    cancelUrl: `...`,
    docId,
    reclId
  })
});
```

**Problema**: No incluye `items`, pero la función puede estar validando que existan.

### 3. Error "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

**Causa**: El endpoint está devolviendo HTML (probablemente una página de error) en lugar de JSON. Esto puede ocurrir si:
- La función no existe
- La función está devolviendo un error HTML
- El rewrite no está funcionando correctamente

## ✅ Soluciones

### Solución 1: Actualizar función `reclamacionCantidades`

La función debe detectar si la solicitud es de análisis de éxito:

```typescript
// En reclamacionCantidades function
if (req.path === '/api/analisis-exito' || req.path === '/') {
  const { datosOCR, tipoDocumento, userId } = req.body;
  
  // Si tiene estos campos, es una solicitud de análisis de éxito
  if (datosOCR && tipoDocumento) {
    // Lógica de análisis de éxito
    // ... (usar el código de src/app/api/analisis-exito/route.ts)
    return res.json({ success: true, data: { analisis: ... } });
  }
  
  // Si no, continuar con lógica de reclamación normal
  // ...
}
```

### Solución 2: Actualizar función `createCheckoutSession`

La función debe manejar `reclamacion_cantidades` sin requerir `items`:

```typescript
// En createCheckoutSession function
if (documentType === 'reclamacion_cantidades') {
  // No requiere items, crear directamente
  const amount = process.env.RECLAMACION_PRICE_AMOUNT || 5000;
  
  line_items.push({
    price_data: {
      currency: 'eur',
      product_data: {
        name: 'Reclamación de Cantidades',
        description: 'Generación de documento de reclamación de cantidades',
      },
      unit_amount: amount,
    },
    quantity: 1,
  });
  
  // Continuar con creación de sesión...
}
```

### Solución 3: Verificar que las funciones existan

```bash
firebase functions:list --project avocat-legaltech-v3
```

Si no existen, necesitas crearlas o desplegarlas.

## 📋 Próximos Pasos

1. **Verificar funciones desplegadas**:
   ```bash
   firebase functions:list --project avocat-legaltech-v3
   ```

2. **Ver logs de las funciones**:
   ```bash
   firebase functions:log --only reclamacionCantidades --project avocat-legaltech-v3
   firebase functions:log --only createCheckoutSession --project avocat-legaltech-v3
   ```

3. **Actualizar funciones** para manejar los formatos correctos

4. **Desplegar funciones actualizadas**:
   ```bash
   firebase deploy --only functions --project avocat-legaltech-v3
   ```

---

**Fecha**: 27 de Enero 2025  
**Estado**: ⚠️ Pendiente - Necesita actualizar funciones en Firebase


