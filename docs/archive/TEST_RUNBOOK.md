# 🧪 Test Runbook - Sistema de Reclamación de Cantidades

## 📋 Variables de Entorno para Testing

Crea un archivo `.env.test` o configura estas variables:

```bash
# Test Configuration
BASE_URL=http://localhost:3000
TEST_DOWNLOADS_DIR=
OPENAI_MOCK=1
TEST_BYPASS_PAYMENT=1
NEXT_PUBLIC_TEST_MODE=1

# Firebase Configuration (test values)
NEXT_PUBLIC_FIREBASE_API_KEY=test_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=test_app_id
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# OpenAI Configuration (mocked)
OPENAI_API_KEY=test_openai_key
USE_CHEAPER_MODEL=false

# Stripe Configuration (test values)
STRIPE_SECRET_KEY=sk_test_123456789
STRIPE_PUBLISHABLE_KEY=pk_test_123456789
STRIPE_WEBHOOK_SECRET=whsec_test_123456789

# App Configuration
NEXT_PUBLIC_APP_NAME=Avocat LegalTech Test
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🚀 Instalación y Configuración

```bash
# Instalar dependencias
npm install

# Instalar Playwright
npx playwright install

# Configurar variables de entorno
cp .env.test .env.local
```

## 🧪 Ejecutar Tests

### 1. Tests Unitarios (OCR)
```bash
npm run test:unit
```

### 2. Tests de API
```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal
npm run test:api
```

### 3. Tests E2E (UI completa)
```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal
npm run test:e2e
```

### 4. Tests E2E específicos
```bash
npm run test:ui
```

### 5. Script Manual (Node.js)
```bash
# Con variables de entorno
$env:OPENAI_MOCK="1"
node scripts/test-reclamacion-completa.js
```

## 📁 Ubicaciones de Descarga

Los PDFs se guardan en:
- **Preferido**: `~/Downloads` (carpeta de descargas del usuario)
- **Fallback**: `tests/downloads` (si no existe la carpeta de descargas)

## 🔧 Configuración de Tests

### Playwright Config
- **Timeout**: 120 segundos
- **Base URL**: `http://localhost:3000`
- **Downloads**: Habilitadas
- **Screenshots**: Solo en fallos
- **Videos**: Solo en fallos

### Mock de OpenAI
- **Activado**: `OPENAI_MOCK=1`
- **Devuelve**: JSON válido con estructura MODEL_OUTPUT
- **Citas legales**: Arts. 812, 813, 814.2 LEC, 31.2 LEC, 50-51 LEC, 394 LEC, 1108-1109 CC

## 📊 Casos de Prueba

### Tests Unitarios
- Suma de 3 facturas con distintas confianzas
- Override de usuario prevalece sobre OCR
- Sin amounts ni summary - valores por defecto
- Cálculo con summary existente
- Mezcla de archivos con y sin amounts
- Valores negativos se ignoran

### Tests de API
- POST `/api/reclamacion-cantidades` devuelve PDF
- GET `/api/reclamacion-cantidades/history` devuelve historial
- Validación de errores (400)
- Rate limiting (429)
- Contenido PDF válido

### Tests E2E
- Navegación a página de reclamación
- Formulario de datos básicos
- Botón bypass pago en modo test
- Descarga de PDF en ubicación correcta
- Manejo de errores en UI
- Historial se actualiza después de generar PDF

## 🐛 Debugging

### Ver Traces de Playwright
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Logs del Servidor
```bash
npm run dev
# Revisar logs en consola para errores 500
```

### Verificar PDFs Generados
```bash
# Los PDFs se guardan en:
# - ~/Downloads/reclamacion-*.pdf
# - tests/downloads/reclamacion-*.pdf
```

## ✅ Checklist de Tests

- [ ] Tests unitarios OCR pasan
- [ ] Tests de API pasan (servidor corriendo)
- [ ] Tests E2E pasan (servidor corriendo)
- [ ] PDFs se descargan correctamente
- [ ] Mock de OpenAI funciona
- [ ] Rate limiting funciona
- [ ] Validación de errores funciona
- [ ] Historial se actualiza

## 🚨 Troubleshooting

### Error 500 en API
- Verificar que el servidor esté corriendo
- Revisar logs del servidor
- Verificar variables de entorno

### Tests E2E fallan
- Verificar que la UI tenga los elementos esperados
- Revisar que el botón "Bypass pago" esté visible en modo test
- Verificar que la página `/dashboard/reclamacion-cantidades` existe

### PDFs no se descargan
- Verificar permisos de escritura en carpeta de descargas
- Revisar que `acceptDownloads: true` esté configurado
- Verificar que el endpoint devuelve `application/pdf`

## 📈 Métricas de Éxito

- **Tests unitarios**: 6/6 ✅
- **Tests de API**: 6/6 ✅ (con servidor corriendo)
- **Tests E2E**: 7/7 ✅ (con servidor corriendo)
- **PDFs generados**: >20KB, formato válido
- **Tiempo de ejecución**: <5 minutos total
