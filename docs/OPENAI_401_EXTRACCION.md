# Error 401 en extracción de datos (OpenAI)

## Organización y clave para extracción (Avocat)

- **Organización:** MAD Cloud Solutions  
- **Organization ID (copiar desde OpenAI):** `org-wPZAhpzweDACkTSOcq9LdE9I`  
  (DAC**k** con k minúscula; termina en **9I** con letra I, no 91 con número 1)  
- **Clave a usar:** API key **Avocat** (no Publika). Configurarla en Secret Manager / variables de la función.

---

Si la función `extracciondatosextract` devuelve **500** y en los logs aparece:

```text
Error extraccionDatosExtract: 401 You must be a member of an organization to use the API.
```

el fallo viene de **OpenAI**, no del código de la app.

## Causa

OpenAI exige que el uso de la API se haga bajo una **organización** cuando la clave está asociada a una org (p. ej. MAD Cloud Solutions). Es un requisito de su modelo de facturación y acceso: la petición debe enviar el **Organization ID** correcto que aparece en [Organization settings](https://platform.openai.com/settings/organization). Si el ID es incorrecto (por un typo como TS**0** en vez de TS**O**) o falta, la API responde **401 No such organization** y la extracción falla. El código de la función normaliza el ID de MAD Cloud para evitar estos errores.

## Qué hacer

### 1. Crear o unirte a una organización en OpenAI

1. Entra en [OpenAI Platform](https://platform.openai.com).
2. Ve a **Settings** → **Organization** (o [organization settings](https://platform.openai.com/settings/organization)).
3. Crea una nueva organización o únete a una existente (si te invitan).

### 2. Crear una API key bajo esa organización

1. En [API keys](https://platform.openai.com/api-keys), asegúrate de tener seleccionada la organización correcta (selector arriba).
2. Crea una **nueva API key** (las viejas pueden seguir asociadas a “Personal” y dar 401).
3. Copia la key (empieza por `sk-...`).

### 3. Actualizar la clave en la Cloud Function

- **Firebase / Cloud Functions (Secret Manager):**  
  Actualiza el secreto `OPENAI_API_KEY` con la nueva key y redespliega la función para que tome el nuevo valor.

- **Cloud Run / variables de entorno:**  
  Actualiza la variable de entorno `OPENAI_API_KEY` con la nueva key y guarda/redespliega el servicio.

### 4. Pasar Organization ID (recomendado para MAD Cloud Solutions)

Para que la función use la organización correcta y la key Avocat:

1. En **Google Cloud Console** → **Cloud Functions** (o el servicio que ejecuta `extraccionDatosExtract`).
2. Abre la función **extraccionDatosExtract** → **Edit** → pestaña **Variables and secrets** (o **Runtime environment variables**).
3. Añade una variable de entorno:
   - **Name:** `OPENAI_ORGANIZATION_ID`
   - **Value:** `org-wPZAhpzweDACkTSOcq9LdE9I` (el que muestra OpenAI en Organization settings)
4. Guarda y redeploy (o guarda los cambios y espera el nuevo despliegue).

El código ya usa este valor si está definido.

## Resumen

| Paso | Dónde | Acción |
|------|--------|--------|
| 1 | OpenAI → Settings → Organization | Crear o unirte a una organización |
| 2 | OpenAI → API keys (con esa org seleccionada) | Crear nueva API key |
| 3 | Google Cloud (secreto o env) | Actualizar `OPENAI_API_KEY` con la nueva key |
| 4 | (Opcional) Google Cloud | Añadir `OPENAI_ORGANIZATION_ID` si hace falta |

Después de esto, la extracción de datos debería dejar de devolver 500 por 401 de OpenAI.

---

## Usar la key Avocat (no Publika)

Si actualmente se está consumiendo la key **Publika** y quieres que la extracción use la key **Avocat**:

1. **Seguridad:** Si has pegado la key Avocat en algún chat o archivo, **revócala en OpenAI** (API keys → Avocat → Revoke) y crea una **nueva** key con el mismo nombre. Usa solo la nueva key en la nube.
2. **Actualizar el secreto en Google Cloud:**
   - **Google Cloud Console** → **Secret Manager** (o **Cloud Functions** → tu función → **Variables and secrets**).
   - Localiza el secreto que usa la función para OpenAI (p. ej. `OPENAI_API_KEY`).
   - Crea una nueva versión del secreto con el valor de la **key Avocat** (la nueva, si la regeneraste).
3. **Fijar la organización:** En la misma función, añade la variable de entorno `OPENAI_ORGANIZATION_ID` = `org-wPZAhpzweDACkTSOcq9LdE9I` (cópialo desde OpenAI; ver sección 4 arriba).
4. **Redeploy** de la función o guardar cambios para que cargue la nueva key y la variable.

Así la función usará la key Avocat y la organización MAD Cloud Solutions.
