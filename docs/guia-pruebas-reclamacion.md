# Guía de Pruebas: Reclamación de Cantidades con OCR y OpenAI

## 🎯 Objetivo

Probar el flujo completo de reclamación de cantidades con:
- ✅ OCR real de PDFs
- ✅ Extracción de información (cantidades, fechas, deudor)
- ✅ Generación con OpenAI usando prompt específico para España
- ✅ Almacenamiento en Firestore

## 📋 Prerequisitos

1. **Variables de Entorno Configuradas:**
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket.appspot.com

# OpenAI
OPENAI_API_KEY=sk-tu_api_key

# Stripe (opcional para pruebas de pago)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

2. **Dependencias Instaladas:**
```bash
npm install pdf-parse @types/pdf-parse
```

3. **Servidor en Ejecución:**
```bash
npm run dev
```

## 🧪 Casos de Prueba

### Prueba 1: Subida de PDF y OCR

**Objetivo:** Verificar que se extrae texto de PDFs correctamente

**Pasos:**
1. Ir a `/dashboard/reclamacion-cantidades`
2. Subir un PDF de factura (ej: `factura_ejemplo.pdf`)
3. Verificar en consola del navegador:
   ```
   ✅ Archivo guardado en Storage: reclamaciones/{userId}/ocr/{fileId}_factura_ejemplo.pdf
   ```
4. Verificar en Firebase Console → Storage que el archivo está guardado

**Resultado Esperado:**
- ✅ PDF se guarda en Storage
- ✅ Metadatos se guardan en Firestore (`uploaded_files` collection)
- ✅ No hay errores en consola

---

### Prueba 2: Extracción de Información de Factura

**Objetivo:** Verificar que se extraen cantidades, fechas y deudor

**Pasos:**
1. Subir un PDF de factura con:
   - Cantidad: €1,234.56
   - Fecha: 15/03/2024
   - Nombre del cliente/deudor
2. Llamar al endpoint de generación (ver Prueba 3)
3. Verificar en logs del servidor:
   ```
   💰 Información extraída: {
     amounts: [1234.56],
     dates: ['15/03/2024'],
     debtorName: 'Nombre del Cliente',
     totalAmount: 1234.56
   }
   ```

**Resultado Esperado:**
- ✅ Se extraen cantidades correctamente
- ✅ Se extraen fechas
- ✅ Se identifica el deudor (si está en el PDF)

---

### Prueba 3: Generación con OpenAI

**Objetivo:** Verificar que se genera documento legal usando OpenAI

**Pasos:**
1. Subir al menos 2 PDFs:
   - Una factura
   - Un contrato o documento de identidad
2. Hacer clic en "Continuar" hasta llegar al paso de pago
3. **Por ahora, simular el pago** (modificar temporalmente `handlePayment` para saltarse Stripe)
4. Verificar que se llama a `/api/reclamacion-cantidades/generate`
5. Verificar en logs del servidor:
   ```
   🚀 Iniciando generación de reclamación de cantidades
   📄 Documentos a procesar: 2
   📖 Procesando OCR de: factura.pdf
   ✅ Texto extraído (1234 caracteres)
   💰 Información extraída: {...}
   🤖 Enviando prompt a OpenAI...
   ✅ Documento generado exitosamente
   ✅ Reclamación guardada en Firestore: recl_...
   ```

**Resultado Esperado:**
- ✅ Se procesa OCR de todos los PDFs
- ✅ Se envía prompt a OpenAI
- ✅ Se recibe documento generado
- ✅ Se guarda en Firestore

---

### Prueba 4: Verificar Contenido del Documento Generado

**Objetivo:** Verificar que el documento generado es correcto y específico para España

**Pasos:**
1. Generar documento (ver Prueba 3)
2. Descargar el PDF generado
3. Verificar que contiene:
   - ✅ Encabezado con datos del reclamante y reclamado
   - ✅ Exposición de hechos
   - ✅ Fundamentos legales españoles:
     - Artículo 1101 del Código Civil
     - Ley 3/2004 de medidas contra la morosidad
   - ✅ Cantidad reclamada (debe ser la extraída de la factura)
   - ✅ Plazo de pago (15 días según ley española)
   - ✅ Advertencia de acciones legales
   - ✅ Firma y fecha

**Resultado Esperado:**
- ✅ Documento completo y profesional
- ✅ Específico para legislación española
- ✅ Incluye información extraída de los PDFs
- ✅ Formato legal correcto

---

### Prueba 5: Verificar Firestore

**Objetivo:** Verificar que los datos se guardan correctamente en Firestore

**Pasos:**
1. Generar una reclamación completa
2. Ir a Firebase Console → Firestore
3. Verificar colección `reclamaciones`:
   - Debe existir documento con ID `recl_...`
   - Debe contener:
     - `userId`
     - `status: "completed"`
     - `documentos` (array con texto extraído)
     - `documentoGenerado` (con título y contenido)
     - `metadata` (cantidad, deudor, fechas)
     - `createdAt`, `updatedAt`

**Resultado Esperado:**
- ✅ Documento guardado en Firestore
- ✅ Todos los campos presentes
- ✅ Timestamps correctos

---

### Prueba 6: Integración con Stripe (Opcional)

**Objetivo:** Verificar que el pago funciona y genera documento después

**Pasos:**
1. Completar flujo hasta el paso de pago
2. Hacer clic en "Pagar"
3. Debe redirigir a Stripe Checkout
4. Usar tarjeta de prueba: `4242 4242 4242 4242`
5. Completar pago
6. Verificar que se redirige de vuelta
7. Verificar que el documento se genera automáticamente

**Resultado Esperado:**
- ✅ Redirección a Stripe funciona
- ✅ Pago se procesa
- ✅ Webhook recibe el pago
- ✅ Documento se genera después del pago

---

## 🔍 Verificación de Logs

### Logs del Cliente (Navegador)

Abrir DevTools → Console y verificar:

```javascript
✅ Archivo guardado en Storage: reclamaciones/{userId}/ocr/{fileId}_factura.pdf
✅ PDF guardado en Storage: reclamaciones/{userId}/documents/{docId}/reclamacion.pdf
```

### Logs del Servidor

Verificar en terminal donde corre `npm run dev`:

```bash
🚀 Iniciando generación de reclamación de cantidades
📄 Documentos a procesar: 2
📖 Procesando OCR de: factura.pdf
✅ Texto extraído (1234 caracteres)
💰 Información extraída: { amounts: [1234.56], dates: [...], ... }
🤖 Enviando prompt a OpenAI...
✅ Documento generado exitosamente
✅ Reclamación guardada en Firestore: recl_...
```

### Logs de Firebase Console

1. **Storage:**
   - Ir a Firebase Console → Storage
   - Verificar carpetas:
     - `reclamaciones/{userId}/ocr/` - PDFs subidos
     - `reclamaciones/{userId}/documents/` - PDFs generados

2. **Firestore:**
   - Ir a Firebase Console → Firestore
   - Verificar colecciones:
     - `uploaded_files` - Metadatos de archivos subidos
     - `reclamaciones` - Reclamaciones completas
     - `purchases` - Compras (si se usa Stripe)

---

## 🐛 Troubleshooting

### Error: "No se pudo extraer texto del PDF"

**Causa:** PDF corrupto o protegido
**Solución:**
- Verificar que el PDF no esté protegido con contraseña
- Probar con otro PDF
- Verificar que `pdf-parse` esté instalado: `npm list pdf-parse`

### Error: "OPENAI_API_KEY no está configurado"

**Causa:** Variable de entorno faltante
**Solución:**
- Verificar `.env.local` tiene `OPENAI_API_KEY`
- Reiniciar servidor después de agregar variable

### Error: "Firebase Storage no está inicializado"

**Causa:** Configuración de Firebase incorrecta
**Solución:**
- Verificar variables de entorno de Firebase
- Verificar que `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` esté configurado

### Error: "Error al generar el documento" (OpenAI)

**Causa:** API key inválida o límite excedido
**Solución:**
- Verificar que la API key sea válida
- Verificar créditos en OpenAI Dashboard
- Verificar límites de rate

### El documento generado no tiene información de los PDFs

**Causa:** OCR no extrajo texto o prompt incorrecto
**Solución:**
- Verificar logs de OCR (debe mostrar texto extraído)
- Verificar que los PDFs tengan texto (no solo imágenes)
- Si son PDFs escaneados, considerar usar Tesseract.js para OCR de imágenes

---

## ✅ Checklist de Pruebas

- [ ] Prueba 1: Subida de PDF y OCR
- [ ] Prueba 2: Extracción de información
- [ ] Prueba 3: Generación con OpenAI
- [ ] Prueba 4: Verificar contenido del documento
- [ ] Prueba 5: Verificar Firestore
- [ ] Prueba 6: Integración con Stripe (opcional)

---

## 📊 Métricas a Monitorear

1. **Tiempo de OCR:** ¿Cuánto tarda en extraer texto?
2. **Tiempo de Generación:** ¿Cuánto tarda OpenAI?
3. **Precisión de Extracción:** ¿Se extraen correctamente las cantidades?
4. **Calidad del Documento:** ¿El documento generado es útil?

---

## 🚀 Próximos Pasos

Después de verificar que todo funciona:

1. **Optimizar OCR:** Considerar cachear texto extraído
2. **Mejorar Extracción:** Ajustar regex para diferentes formatos de factura
3. **Refinar Prompt:** Ajustar prompt según resultados
4. **Agregar Tests:** Tests automatizados para cada componente

