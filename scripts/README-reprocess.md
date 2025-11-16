# Reprocess Purchase Script

Script para reprocesar compras existentes y generar los documentos que faltan.

## Requisitos

- Variables de entorno configuradas en `.env.local`:
  - `OPENAI_API_KEY` - Clave de API de OpenAI
  - `FIREBASE_PROJECT_ID` - ID del proyecto Firebase
  - `FIREBASE_CLIENT_EMAIL` - Email del service account
  - `FIREBASE_PRIVATE_KEY` - Clave privada del service account
  - `FIREBASE_STORAGE_BUCKET` - Bucket de Storage

## Uso

### Procesar una compra específica

```bash
npm run reprocess:purchase <purchaseId>
```

Ejemplo:
```bash
npm run reprocess:purchase DdGX5HYhDDvrhvs42jXA
```

### Procesar todas las compras sin documentos

```bash
npm run reprocess:all
```

Este comando busca todas las compras con status `completed` que tienen items sin documentos generados y los procesa.

### Procesar compras por status

```bash
npm run reprocess:purchase -- --status pending
```

## Qué hace el script

1. **Busca compras**: Según los parámetros proporcionados
2. **Verifica items**: Comprueba si cada item ya tiene documentos generados
3. **Genera documentos**: Para cada item sin documento:
   - Genera contenido usando OpenAI
   - Crea un PDF del material de estudio
   - Guarda el PDF en Firebase Storage
   - Genera una URL firmada válida por 1 año
4. **Actualiza la compra**: Actualiza el documento de compra en Firestore con:
   - URLs de descarga
   - Rutas de almacenamiento
   - Estado de cada item
   - Contadores de documentos generados/fallidos

## Ejemplo de salida

```
🔍 Buscando compra: DdGX5HYhDDvrhvs42jXA...

📦 Procesando compra: DdGX5HYhDDvrhvs42jXA
   Usuario: jdwWMhOqVCggIRjLVBtxbvh0wPq1
   Email: andresmlevanofm@gmail.com
   Items: 1
  📄 Generando documento: Escrito de oposición a juicio monitorio (x1)
    🤖 Generando material de estudio: Escrito de oposición a juicio monitorio
    ✅ PDF guardado: users/jdwWMhOqVCggIRjLVBtxbvh0wPq1/documents/abc123.pdf
  ✅ Documento generado exitosamente para: Escrito de oposición a juicio monitorio

✅ Compra procesada: DdGX5HYhDDvrhvs42jXA
   Documentos generados: 1
   Documentos fallidos: 0
```

## Notas

- El script omite items que ya tienen documentos generados
- Si un documento falla, el item se marca como `failed` con el error
- Los PDFs se guardan en `users/{userId}/documents/{docId}.pdf`
- Las URLs firmadas son válidas por 1 año


