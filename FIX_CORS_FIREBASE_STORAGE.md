# 🔧 Fix: Error CORS en Firebase Storage

## 🚨 Problema

Al intentar subir PDFs a Firebase Storage desde `https://avocatapp.com`, se produce el siguiente error:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/avocat-legaltech-v3.appspot.com/o?name=...' 
from origin 'https://avocatapp.com' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

## ✅ Solución

Firebase Storage necesita tener configuradas las reglas CORS para permitir solicitudes desde tu dominio.

### Opción 1: Usando gsutil (Recomendado)

1. **Instalar Google Cloud SDK** (si no lo tienes):
   ```bash
   # Windows (PowerShell)
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

2. **Autenticarse con Google Cloud**:
   ```bash
   gcloud auth login
   gcloud config set project avocat-legaltech-v3
   ```

3. **Aplicar configuración CORS**:
   ```bash
   gsutil cors set cors.json gs://avocat-legaltech-v3.appspot.com
   ```

4. **Verificar configuración**:
   ```bash
   gsutil cors get gs://avocat-legaltech-v3.appspot.com
   ```

### Opción 2: Desde Google Cloud Console

1. Ve a [Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3)
2. Selecciona el bucket: `avocat-legaltech-v3.appspot.com`
3. Haz clic en la pestaña **"Configuration"** o **"Configuración"**
4. Desplázate hasta **"CORS configuration"**
5. Haz clic en **"Edit CORS configuration"**
6. Pega el siguiente JSON:
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
7. Haz clic en **"Save"**

### Opción 3: Usando Firebase CLI (si está disponible)

```bash
firebase storage:rules:deploy
```

**Nota**: Esta opción requiere que tengas reglas de Storage configuradas, pero CORS se configura desde Google Cloud Console o gsutil.

---

## 📋 Configuración CORS Aplicada

El archivo `cors.json` contiene la configuración necesaria:

```json
[
  {
    "origin": [
      "https://avocatapp.com",
      "https://www.avocatapp.com", 
      "https://avocat-legaltech-v3.web.app"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": [
      "Content-Type",
      "Authorization", 
      "x-goog-resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### Explicación de los campos:

- **`origin`**: Dominios permitidos para hacer solicitudes
- **`method`**: Métodos HTTP permitidos
- **`responseHeader`**: Headers que el cliente puede leer
- **`maxAgeSeconds`**: Tiempo de caché para la respuesta preflight (1 hora)

---

## ✅ Verificación Post-Configuración

Después de aplicar la configuración CORS:

1. **Espera 1-2 minutos** para que los cambios se propaguen
2. **Intenta subir un archivo** desde `https://avocatapp.com/dashboard/reclamacion-cantidades`
3. **Verifica en la consola del navegador** que no haya errores CORS

### Test Manual

Puedes probar la configuración CORS con curl:

```bash
curl -X OPTIONS \
  -H "Origin: https://avocatapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://firebasestorage.googleapis.com/v0/b/avocat-legaltech-v3.appspot.com/o
```

**Resultado esperado**: Debe incluir headers `Access-Control-Allow-Origin` en la respuesta.

---

## 🔍 Troubleshooting

### Si el error persiste:

1. **Verifica que el dominio esté en la lista de origins**:
   ```bash
   gsutil cors get gs://avocat-legaltech-v3.appspot.com
   ```

2. **Verifica que el bucket sea correcto**:
   - Bucket: `avocat-legaltech-v3.appspot.com`
   - Proyecto: `avocat-legaltech-v3`

3. **Limpia la caché del navegador** y vuelve a intentar

4. **Verifica que no haya reglas de Storage bloqueando**:
   - Ve a [Firebase Console - Storage Rules](https://console.firebase.google.com/project/avocat-legaltech-v3/storage/rules)
   - Asegúrate de que las reglas permitan subir archivos

5. **Revisa los logs de Firebase Storage** en Google Cloud Console

---

## 📝 Notas Importantes

1. **Los cambios CORS pueden tardar 1-2 minutos** en propagarse
2. **Asegúrate de incluir todos los dominios** desde los que se accederá a Storage
3. **El archivo `cors.json` está en la raíz del proyecto** para facilitar su uso
4. **Si agregas nuevos dominios**, actualiza `cors.json` y vuelve a aplicar la configuración

---

## 🔗 Enlaces Útiles

- [Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser?project=avocat-legaltech-v3)
- [Firebase Console - Storage](https://console.firebase.google.com/project/avocat-legaltech-v3/storage)
- [Documentación de CORS en Google Cloud Storage](https://cloud.google.com/storage/docs/configuring-cors)

---

**Fecha de creación**: 27 de Enero 2025  
**Proyecto**: avocat-legaltech-v3




