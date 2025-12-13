# ✅ CORS Configurado en Firebase Storage

**Fecha**: 27 de Enero 2025  
**Bucket**: `avocat-legaltech-v3.firebasestorage.app`

## ⚠️ Nota Importante

El comando `gcloud storage buckets update` se ejecutó, pero Firebase Storage puede requerir configuración adicional desde la consola web.

## ✅ Configuración que Debe Aplicarse

Se debe configurar CORS en el bucket de Firebase Storage con los siguientes dominios permitidos:

- `https://avocatapp.com`
- `https://www.avocatapp.com`
- `https://avocat-legaltech-v3.web.app`

### Métodos HTTP Permitidos

- GET
- HEAD
- PUT
- POST
- DELETE

### Headers Permitidos

- Content-Type
- Authorization
- x-goog-resumable

### Tiempo de Caché

- maxAgeSeconds: 3600 (1 hora)

## 🔍 Verificación

Para verificar que la configuración se aplicó correctamente:

```bash
gcloud storage buckets describe gs://avocat-legaltech-v3.firebasestorage.app --format=json
```

## ⏱️ Tiempo de Propagación

Los cambios CORS pueden tardar **1-2 minutos** en propagarse completamente.

## ✅ Próximos Pasos (IMPORTANTE)

### Si el error CORS persiste, configura desde la consola web:

1. **Ve a Google Cloud Console**:
   - https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3

2. **Selecciona el bucket**: `avocat-legaltech-v3.firebasestorage.app`

3. **Ve a la pestaña "Configuration"** (Configuración)

4. **Busca "CORS configuration"** y haz clic en "Edit"

5. **Pega este JSON**:
   ```json
   [
     {
       "origin": ["https://avocatapp.com", "https://www.avocatapp.com", "https://avocat-legaltech-v3.web.app"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

6. **Guarda** y espera 1-2 minutos

7. **Prueba subir un archivo** desde `https://avocatapp.com/dashboard/reclamacion-cantidades`

## 🔗 Enlaces Útiles

- [Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3)
- [Firebase Console - Storage](https://console.firebase.google.com/project/avocat-legaltech-v3/storage)

---

**Estado**: ⚠️ Comando ejecutado, pero puede requerir configuración adicional desde la consola web

