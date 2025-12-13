# 🔧 Fix: Error 400 "Missing required fields" en /api/analisis-exito

## 🚨 Problema

El endpoint `/api/analisis-exito` está devolviendo un error 400 "Missing required fields" porque:

1. **Next.js usa `output: 'export'`** - Las rutas API no funcionan en producción estática
2. **Firebase Hosting redirige a Firebase Function** - Pero la función `reclamacionCantidades` espera un formato diferente
3. **Formato de datos incompatible** - El frontend envía `{datosOCR, tipoDocumento, userId}` pero la función espera campos diferentes

## ✅ Solución Aplicada

1. **Eliminado rewrite en `firebase.json`** - Ya no redirige `/api/analisis-exito` a la función
2. **El endpoint local existe** - `src/app/api/analisis-exito/route.ts` está correctamente implementado

## ⚠️ Problema Pendiente

Con `output: 'export'`, Next.js genera un sitio estático y **las rutas API no funcionan en producción**. Necesitamos:

### Opción 1: Crear una Firebase Function específica (Recomendado)

Crear una función `analisisExito` que maneje el formato correcto:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_ANALISIS, buildAnalisisPrompt } from './prompts/analisis-exito-co';

export const analisisExito = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { datosOCR, tipoDocumento, userId } = req.body;

    // Validar datos requeridos
    if (!datosOCR || !tipoDocumento) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: datosOCR y tipoDocumento son obligatorios.'
      });
    }

    // Validar estructura
    if (!datosOCR.documentos || !Array.isArray(datosOCR.documentos)) {
      return res.status(400).json({
        success: false,
        error: 'datosOCR debe contener un array de documentos.'
      });
    }

    // Llamar a OpenAI
    const openai = new OpenAI({
      apiKey: functions.config().openai?.api_key || process.env.OPENAI_API_KEY
    });

    const userPrompt = buildAnalisisPrompt(datosOCR, tipoDocumento);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ANALISIS },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('OpenAI no devolvió contenido');
    }

    const analisis = JSON.parse(responseContent);

    return res.json({
      success: true,
      data: {
        analisis,
        metadata: {
          tipoDocumento,
          userId,
          timestamp: new Date().toISOString(),
          numDocumentos: datosOCR.documentos.length
        }
      }
    });

  } catch (error: any) {
    console.error('Error en análisis de éxito:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al analizar la probabilidad de éxito'
    });
  }
});
```

### Opción 2: Actualizar función existente

Actualizar `reclamacionCantidades` para que acepte ambos formatos:

```typescript
// En la función reclamacionCantidades
if (req.path === '/api/analisis-exito' || req.path === '/') {
  // Manejar formato de análisis de éxito
  const { datosOCR, tipoDocumento, userId } = req.body;
  
  if (datosOCR && tipoDocumento) {
    // Lógica de análisis de éxito
    // ...
    return res.json({ success: true, data: { analisis: ... } });
  }
  
  // Si no tiene esos campos, intentar formato de reclamación
  // ...
}
```

## 📋 Próximos Pasos

1. **Crear función `analisisExito`** en Firebase Functions
2. **Actualizar `firebase.json`** para redirigir a la nueva función:
   ```json
   {
     "source": "/api/analisis-exito",
     "function": "analisisExito"
   }
   ```
3. **Desplegar la función**:
   ```bash
   firebase deploy --only functions:analisisExito
   ```

## 🔍 Verificación

Después de desplegar, probar:

```bash
curl -X POST https://avocatapp.com/api/analisis-exito \
  -H "Content-Type: application/json" \
  -d '{
    "datosOCR": {
      "documentos": [{"nombre": "test", "tipo": "Documento", "contenido": "test"}]
    },
    "tipoDocumento": "Reclamación de Cantidades",
    "userId": "test"
  }'
```

**Resultado esperado**: JSON con `success: true` y `data.analisis`

---

**Fecha**: 27 de Enero 2025  
**Estado**: ⚠️ Pendiente - Necesita crear función específica


