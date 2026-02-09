# 💳 Habilitar Billing para Cloud Run

## ❌ Error Actual

```
This API method requires billing to be enabled. Please enable billing on project #avocat-legaltech-v3
```

## ✅ Solución

### Opción 1: Enlace Directo

Abre este enlace en tu navegador:
```
https://console.developers.google.com/billing/enable?project=avocat-legaltech-v3
```

### Opción 2: Manualmente

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Asegúrate de que el proyecto `avocat-legaltech-v3` esté seleccionado
3. Ve a **Billing** (en el menú lateral)
4. Haz clic en **"Link a billing account"** o **"Vincular cuenta de facturación"**
5. Selecciona tu cuenta de facturación existente o crea una nueva
6. Confirma la vinculación

## ⏱️ Tiempo de Propagación

Después de habilitar billing:
- **Espera 2-3 minutos** para que los cambios se propaguen
- Puedes verificar el estado en la consola de Billing

## 💰 Nivel Gratuito de Cloud Run

Cloud Run tiene un nivel gratuito generoso que cubre la mayoría de casos de uso:

- ✅ **180,000 unidades de CPU virtuales segundo/mes**
- ✅ **360,000 GiB segundo/mes**
- ✅ **2 millones de solicitudes/mes**

Solo pagas si excedes estos límites.

## 📋 Después de Habilitar Billing

1. **Espera 2-3 minutos** para la propagación
2. **Vuelve a la interfaz de Cloud Run**
3. **Intenta crear el servicio nuevamente**
4. **Asegúrate de que los archivos estén en el repositorio**:
   - `Dockerfile`
   - `server.js`
   - `package.json` (actualizado)
   - `next.config.js` (actualizado)

## ⚠️ Nota Importante

Aunque Cloud Run tiene nivel gratuito, **necesitas una cuenta de facturación vinculada** para:
- Habilitar las APIs necesarias
- Usar servicios que excedan el nivel gratuito
- Acceder a características avanzadas

**No se te cobrará nada** mientras estés dentro del nivel gratuito.

## 🔗 Enlaces Útiles

- [Habilitar Billing](https://console.developers.google.com/billing/enable?project=avocat-legaltech-v3)
- [Precios de Cloud Run](https://cloud.google.com/run/pricing)
- [Nivel Gratuito de Cloud Run](https://cloud.google.com/run/docs/pricing#free-tier)





