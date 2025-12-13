# Fix: Error de Índice de Firestore Requerido

## Problema

Error en `/dashboard/reclamacion-cantidades`:
```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## Solución Implementada

Se ha agregado el índice faltante al archivo `firestore.indexes.json`:

```json
{
  "collectionGroup": "purchases",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "documentType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Este índice es necesario para la query:
```typescript
query(
  collection(db, 'purchases'),
  where('userId', '==', userId),
  where('documentType', '==', 'reclamacion_cantidades'),
  orderBy('createdAt', 'desc')
)
```

## Opciones para Desplegar el Índice

### Opción 1: Usar el Enlace del Error (Más Rápido)

1. Abre el enlace que aparece en el error del navegador
2. Firebase Console abrirá automáticamente la página de creación del índice
3. Haz clic en "Create Index"
4. Espera a que el índice se cree (puede tardar unos minutos)

### Opción 2: Desde Firebase Console Manualmente

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `avocat-legaltech-v3`
3. Ve a **Firestore Database** → **Indexes**
4. Busca el índice pendiente o crea uno nuevo con:
   - Collection ID: `purchases`
   - Fields:
     - `userId` (Ascending)
     - `documentType` (Ascending)
     - `createdAt` (Descending)
5. Haz clic en "Create Index"

### Opción 3: Usar Firebase CLI

```bash
# Asegúrate de estar en el directorio del proyecto
cd C:\Cursor\avocatapp_legaltech_v3

# Desplegar solo los índices
firebase deploy --only firestore:indexes
```

**Nota:** Si el comando falla, verifica que:
- Firebase CLI esté instalado: `firebase --version`
- Estés autenticado: `firebase login`
- El proyecto esté configurado: `firebase use avocat-legaltech-v3`

## Verificación

Una vez desplegado el índice:

1. El error debería desaparecer en `/dashboard/reclamacion-cantidades`
2. Puedes verificar en Firebase Console que el índice esté en estado "Enabled"
3. La query debería funcionar correctamente

## Índices Actuales en firestore.indexes.json

El archivo ahora contiene:

1. **Índice para purchases (sin documentType)**
   - `userId` (ASC) + `createdAt` (DESC)
   - Usado por: Dashboard de Estudiantes

2. **Índice para purchases (con documentType)** ⭐ **NUEVO**
   - `userId` (ASC) + `documentType` (ASC) + `createdAt` (DESC)
   - Usado por: Dashboard de Reclamación y Dashboard de Tutela

3. **Índice para payment_metadata**
   - `customerEmail` (ASC) + `status` (ASC) + `createdAt` (DESC)
   - Usado por: Sistema de pagos

## Tiempo de Creación

Los índices de Firestore pueden tardar:
- **Pocos minutos** si hay pocos datos
- **Varias horas** si hay millones de documentos

Puedes verificar el progreso en Firebase Console → Firestore → Indexes

## Notas Adicionales

- El código ya tiene manejo de errores que intenta la query sin `orderBy` si falla
- Sin embargo, es mejor tener el índice para obtener resultados ordenados correctamente
- Este mismo índice también beneficiará al dashboard de Acción de Tutela que usa la misma query

---

**Fecha de Fix:** 2025-01-27  
**Rama:** `dev_reclamacion`



