# 🔧 Fix: Error en /api/analyze-documents

## 🚨 Problema

El endpoint `/api/analyze-documents` está devolviendo HTML en lugar de JSON porque:

1. **Next.js usa `output: 'export'`** - Las rutas API no funcionan en producción estática
2. **No hay rewrite en `firebase.json`** - El endpoint se redirige a `/index.html` (HTML)
3. **El endpoint necesita ejecutarse en servidor** - El OCR usa `pdf-parse` que requiere Node.js

## ✅ Solución: Crear Firebase Function

Necesitamos crear una Firebase Function `analyzeDocuments` que:
- Procese OCR de archivos PDF
- Guarde archivos en Firebase Storage
- Retorne información de OCR procesada

### Pasos:

1. **Crear directorio `functions`** (si no existe)
2. **Crear función `analyzeDocuments`**
3. **Agregar rewrite en `firebase.json`**
4. **Desplegar función**

---

**Estado**: ⚠️ Pendiente - Necesita crear función Firebase




