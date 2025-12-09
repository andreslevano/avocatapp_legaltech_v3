import { NextRequest, NextResponse } from 'next/server';
import { callChat } from '@/lib/ai/provider';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs' as const;

const EMAIL_SYSTEM_PROMPT = `
Eres un experto en marketing de fidelización y comunicación con clientes de servicios legales. 
Tu tarea es generar emails personalizados y profesionales para fidelizar clientes basándote en su historial de uso.

REGLAS IMPORTANTES:
- Usa un tono profesional pero cercano
- Personaliza el contenido basándote en los datos del usuario
- Incluye ofertas específicas basadas en su plan actual
- Menciona sus logros y uso del sistema
- Sugiere próximos pasos relevantes
- Mantén el email conciso pero valioso
- Usa español de España/Colombia según corresponda

ESTRUCTURA DEL EMAIL:
1. Asunto atractivo y personalizado
2. Saludo personalizado
3. Reconocimiento de su actividad
4. Oferta o sugerencia específica
5. Call-to-action claro
6. Despedida profesional

Devuelve SOLO un JSON con esta estructura:
{
  "subject": "Asunto del email",
  "body": "Contenido completo del email en HTML",
  "suggestions": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"],
  "nextActions": ["Acción recomendada 1", "Acción recomendada 2"]
}
`;

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userData, userSummary } = body;

    if (!userData || !userSummary) {
      return NextResponse.json(
        { success: false, error: 'Datos de usuario requeridos' },
        { status: 400 }
      );
    }

    // Construir prompt personalizado
    const userPrompt = `
Genera un email de fidelización para este usuario:

DATOS DEL USUARIO:
- Nombre: ${userData.displayName || 'Cliente'}
- Email: ${userData.email}
- Plan actual: ${userData.subscription?.plan || 'Gratuito'}
- Registrado: ${new Date(userData.createdAt).toLocaleDateString('es-ES')}
- Última actividad: ${new Date(userData.lastLoginAt).toLocaleDateString('es-ES')}

ESTADÍSTICAS DE USO:
- Documentos generados: ${userSummary.summary.totalDocuments}
- Dinero gastado: €${userSummary.summary.totalSpent}
- Tasa de éxito: ${(userSummary.summary.successRate * 100).toFixed(1)}%
- Tiempo promedio de procesamiento: ${userSummary.summary.averageProcessingTime}ms

GENERACIONES RECIENTES:
${userSummary.recentGenerations.slice(0, 3).map((gen: any) => 
  `- ${gen.tipoEscrito} (${gen.areaLegal}) - ${new Date(gen.createdAt).toLocaleDateString('es-ES')}`
).join('\n')}

OBJETIVO: Crear un email que:
1. Reconozca su actividad y logros
2. Ofrezca valor específico basado en su uso
3. Sugiera próximos pasos relevantes
4. Mantenga la relación profesional

STRICT JSON ONLY.
`;

    console.log('Generando email de fidelización', { requestId, userId: userData.uid });

    const result = await callChat({
      model: process.env.USE_CHEAPER_MODEL === 'true' ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06',
      system: EMAIL_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.7,
      top_p: 1
    });

    const { content, timeMs, mock } = result as any;
    
    if (!content) {
      throw new Error('No se recibió contenido del modelo');
    }

    const emailData = JSON.parse(content);

    console.log('Email generado exitosamente', { 
      requestId, 
      elapsedMs: Date.now() - startTime,
      mock: mock || false 
    });

    return NextResponse.json({
      success: true,
      data: {
        emailId: uuidv4(),
        ...emailData,
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: userData.uid,
          model: process.env.USE_CHEAPER_MODEL === 'true' ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06',
          processingTime: timeMs,
          mock: mock || false
        }
      }
    });

  } catch (error: any) {
    console.error('Error generando email', { requestId, error: error.message, elapsedMs: Date.now() - startTime });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


