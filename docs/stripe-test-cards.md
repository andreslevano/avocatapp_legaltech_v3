# Tarjetas de Prueba de Stripe

## ⚠️ IMPORTANTE
Las tarjetas de prueba **SOLO funcionan con claves TEST** (`sk_test_...`).
Si estás usando una clave LIVE (`sk_live_...`), necesitarás una tarjeta real.

## 🔑 Cambiar a Modo TEST

1. Ve a tu dashboard de Stripe: https://dashboard.stripe.com/test/apikeys
2. Copia tu clave secreta TEST (empieza con `sk_test_`)
3. Actualiza `env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
   ```
4. Reinicia el servidor: `npm run dev`

## 💳 Tarjetas de Prueba

### Tarjeta de Éxito (Pago Aprobado)
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura (ej: 12/25)
CVC: Cualquier 3 dígitos (ej: 123)
Código Postal: Cualquier código postal válido (ej: 12345)
```

### Tarjeta Rechazada
```
Número: 4000 0000 0000 0002
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código postal válido
```

### Tarjeta que Requiere Autenticación 3D Secure
```
Número: 4000 0027 6000 3184
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código postal válido
```

### Tarjeta con Fondos Insuficientes
```
Número: 4000 0000 0000 9995
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código postal válido
```

### Tarjeta con Código Postal Incorrecto
```
Número: 4000 0000 0000 0010
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: 00000 (cualquier código que cause error)
```

## 🌍 Tarjetas Internacionales

### Tarjeta del Reino Unido
```
Número: 4000 0082 6000 0000
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código postal válido
```

### Tarjeta de Brasil
```
Número: 4000 0076 0000 0002
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código postal válido
```

## 📝 Notas

- **Todas las tarjetas de prueba funcionan con cualquier fecha futura**
- **El CVC puede ser cualquier número de 3 dígitos**
- **El código postal puede ser cualquier código válido** (excepto para tarjetas específicas que requieren un código postal incorrecto)
- **Las tarjetas de prueba NO funcionan con claves LIVE**

## 🔗 Más Información

Documentación oficial de Stripe sobre tarjetas de prueba:
https://stripe.com/docs/testing

