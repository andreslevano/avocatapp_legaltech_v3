# 🔧 Fix: Función Firebase para Análisis de Éxito

## 🚨 Problema

El endpoint `/api/analisis-exito` está siendo redirigido a la función Firebase `reclamacionCantidades`, pero esta función espera campos diferentes (`nombreTrabajador`, `dniTrabajador`, etc.) mientras que el frontend envía `{datosOCR, tipoDocumento, userId}`.

## ✅ Solución

Se ha eliminado temporalmente el rewrite en `firebase.json` para que el endpoint local funcione en desarrollo. Sin embargo, con `output: 'export'` en Next.js, las rutas API no funcionan en producción.

### Opción 1: Crear función Firebase específica (Recomendado)

Crear una función Firebase `analisisExito` que maneje el formato correcto:

```typescript
// functions/src/index.ts (o donde estén tus funciones)
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

Luego actualizar `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/analisis-exito",
        "function": "analisisExito"
      }
    ]
  }
}
```

### Opción 2: Actualizar función existente

Actualizar `reclamacionCantidades` para detectar si es una solicitud de análisis de éxito:

```typescript
// En reclamacionCantidades function
if (req.path === '/api/analisis-exito' || (req.body.datosOCR && req.body.tipoDocumento)) {
  // Manejar como análisis de éxito
  const { datosOCR, tipoDocumento, userId } = req.body;
  // ... lógica de análisis de éxito ...
  return res.json({ success: true, data: { analisis } });
}

// Continuar con lógica normal de reclamación
// ...
```

## 📋 Próximos Pasos

1. Crear o actualizar la función Firebase
2. Desplegar la función: `firebase deploy --only functions`
3. Actualizar `firebase.json` con el rewrite correcto
4. Desplegar hosting: `firebase deploy --only hosting`




