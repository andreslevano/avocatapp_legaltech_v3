# Guía de Generación y Descarga de Documentos

## 📋 Resumen de Documentos Generados

Para cada compra, se generan **5 documentos**:

1. **Plantilla PDF** (`templatePdf`) - Documento en blanco con placeholders
2. **Plantilla Word** (`templateDocx`) - Versión editable en Word
3. **Ejemplo PDF** (`samplePdf`) - Ejemplo completo rellenado
4. **Ejemplo Word** (`sampleDocx`) - Versión editable del ejemplo
5. **Material de Estudio PDF** (`studyMaterialPdf`) - Guía educativa completa

## 🔍 Cómo Identificar Documentos

Cada documento tiene metadatos únicos para identificación:

### En Firebase Storage:
- **Ruta**: `users/{userId}/documents/{docId}.{extension}`
- **Metadatos**:
  - `documentName`: Nombre del documento legal
  - `documentType`: `template`, `sample`, o `studyMaterial`
  - `documentFormat`: `pdf` o `docx`
  - `purchaseId`: ID de la compra
  - `purchaseDate`: Fecha de la compra
  - `itemId`: ID del item dentro de la compra
  - `displayName`: Nombre legible para mostrar
  - `fileName`: Nombre de archivo sugerido

### En Firestore (Purchase Document):
Los documentos se almacenan en `purchases/{purchaseId}` bajo:
```json
{
  "items": [
    {
      "id": "item-id",
      "name": "Escrito de oposición a juicio monitorio",
      "packageFiles": {
        "templatePdf": { "downloadUrl": "...", "storagePath": "..." },
        "templateDocx": { "downloadUrl": "...", "storagePath": "..." },
        "samplePdf": { "downloadUrl": "...", "storagePath": "..." },
        "sampleDocx": { "downloadUrl": "...", "storagePath": "..." },
        "studyMaterialPdf": { "downloadUrl": "...", "storagePath": "..." }
      }
    }
  ]
}
```

## 📥 Cómo Acceder y Descargar Documentos

### Opción 1: Desde el Dashboard (Recomendado)
1. Ve a `/dashboard/estudiantes`
2. En la sección "Historial de Compras"
3. Cada item tiene botones para:
   - **Ver documento**: Abre el PDF en una nueva pestaña
   - **Descargar**: Descarga el documento principal
   - **Materiales descargables**: Links directos a todos los documentos

### Opción 2: Usando el Script de Listado
```bash
# Listar todos los documentos de una compra
npm run list:documents <purchaseId>

# Descargar todos los documentos
npm run list:documents <purchaseId> --download-all
```

### Opción 3: Desde Firebase Storage Console
1. Ve a Firebase Console > Storage
2. Navega a `users/{userId}/documents/`
3. Los archivos están organizados por fecha de generación
4. Usa los metadatos para identificar cada tipo de documento

### Opción 4: Usando las URLs Directas
Las URLs firmadas están disponibles en el documento de compra:
- Válidas por **7 días** (límite de Firebase Storage)
- Se pueden regenerar ejecutando el script de reprocesamiento

## 🔢 Sobre el Conteo de Documentos

**¿Por qué hay 5 PDFs en Storage pero solo 3 tipos de documentos?**

- **Primera ejecución**: Generó solo 1 documento (Material de Estudio PDF)
- **Segunda ejecución**: Generó 3 documentos (Template PDF, Sample PDF, Study Material PDF)
- **Tercera ejecución**: Generó todos los 5 documentos (incluyendo Word)

**Total esperado por compra**: 5 archivos
- Template PDF + Template Word = 2 archivos
- Sample PDF + Sample Word = 2 archivos  
- Study Material PDF = 1 archivo

Los archivos antiguos permanecen en Storage pero no están vinculados a la compra actual.

## 🛠️ Comandos Útiles

```bash
# Reprocesar una compra específica (genera todos los documentos faltantes)
npm run reprocess:purchase <purchaseId>

# Reprocesar todas las compras sin documentos completos
npm run reprocess:all

# Listar documentos de una compra
npm run list:documents <purchaseId>

# Descargar todos los documentos de una compra
npm run list:documents <purchaseId> --download-all
```

## 📝 Notas Importantes

1. **URLs Temporales**: Las URLs firmadas expiran después de 7 días. Se pueden regenerar ejecutando el script de reprocesamiento.

2. **Identificación**: Cada documento tiene:
   - `purchaseId`: Para identificar a qué compra pertenece
   - `itemId`: Para identificar el item específico dentro de la compra
   - `documentType`: Para saber qué tipo de documento es
   - `displayName`: Nombre legible para mostrar al usuario

3. **Múltiples Compras**: Si un usuario tiene múltiples compras:
   - Cada compra tiene su propio `purchaseId`
   - Cada item dentro de una compra tiene su propio `itemId`
   - Los documentos se organizan por `purchaseId` en Firestore
   - Los archivos se organizan por `userId` en Storage

4. **Dashboard**: El dashboard muestra los documentos agrupados por compra, con botones para ver/descargar cada tipo.




