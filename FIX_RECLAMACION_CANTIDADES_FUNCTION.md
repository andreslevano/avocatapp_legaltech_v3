# 🔧 Fix: Función Firebase `reclamacionCantidades` para Análisis de Éxito

## 🚨 Problema

La función Firebase `reclamacionCantidades` está devolviendo error 400 "Missing required fields" cuando recibe solicitudes de `/api/analisis-exito` porque espera campos diferentes (`nombreTrabajador`, `dniTrabajador`, etc.) mientras que el frontend envía `{datosOCR, tipoDocumento, userId}`.

## ✅ Solución

Actualizar la función `reclamacionCantidades` para detectar si es una solicitud de análisis de éxito y manejar ambos formatos.

### Código Requerido para la Función Firebase

```typescript
// En functions/src/index.ts (o donde esté definida reclamacionCantidades)
import * as functions from 'firebase-functions';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_ANALISIS, buildAnalisisPrompt } from './prompts/analisis-exito-co';

export const reclamacionCantidades = functions.https.onRequest(async (req, res) => {
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

  // Detectar si es una solicitud de análisis de éxito
  const isAnalisisExito = req.path === '/api/analisis-exito' || 
                          req.path === '/' ||
                          (req.body.datosOCR && req.body.tipoDocumento);

  if (isAnalisisExito) {
    // Manejar como análisis de éxito
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

      console.log('🔍 Iniciando análisis de éxito...', {
        tipoDocumento,
        userId,
        numDocumentos: datosOCR.documentos.length
      });

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
  }

  // Continuar con lógica normal de reclamación de cantidades
  // ... código existente para reclamación de cantidades ...
  
  // Si llegamos aquí y no es análisis de éxito, validar campos requeridos
  const { nombreTrabajador, dniTrabajador, domicilioTrabajador, telefonoTrabajador, 
          nombreEmpresa, cifEmpresa, domicilioEmpresa } = req.body;

  if (!nombreTrabajador || !dniTrabajador || !domicilioTrabajador || !telefonoTrabajador ||
      !nombreEmpresa || !cifEmpresa || !domicilioEmpresa) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  // ... resto de la lógica de reclamación de cantidades ...
});
```

## 📋 Pasos para Aplicar el Fix

1. **Acceder a las funciones Firebase**:
   - Ve a: https://console.firebase.google.com/project/avocat-legaltech-v3/functions
   - O clona el repositorio que contiene las funciones

2. **Actualizar la función `reclamacionCantidades`**:
   - Agregar la detección de solicitudes de análisis de éxito
   - Agregar la lógica para manejar `{datosOCR, tipoDocumento, userId}`

3. **Asegurar que los prompts estén disponibles**:
   - Verificar que `SYSTEM_PROMPT_ANALISIS` y `buildAnalisisPrompt` estén disponibles en las funciones
   - Si no están, copiarlos desde `src/lib/prompts/analisis-exito-co.ts`

4. **Desplegar la función actualizada**:
   ```bash
   firebase deploy --only functions:reclamacionCantidades
   ```

5. **Verificar que funciona**:
   ```bash
   curl -X POST https://avocatapp.com/api/analisis-exito \
     -H "Content-Type: application/json" \
     -d '{
       "datosOCR": {
         "documentos": [{"nombre": "test.pdf", "tipo": "Documento", "contenido": "test"}]
       },
       "tipoDocumento": "Reclamación de Cantidades",
       "userId": "test"
     }'
   ```

## ⚠️ Notas Importantes

- La función debe manejar CORS correctamente
- La función debe verificar el path (`req.path`) porque Firebase Hosting pasa el path completo
- Las variables de entorno deben estar configuradas (`OPENAI_API_KEY`)




