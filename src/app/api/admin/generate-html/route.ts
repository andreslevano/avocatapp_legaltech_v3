import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIClient } from '@/lib/openai-client';
import { generatePersonalizedEmailPrompt, getEmailTypeMetadata } from '@/lib/prompts/email-fidelizacion';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  // const requestId = uuidv4();
  // const startTime = Date.now();

  try {
    const body = await request.json();
    const { userData, userSummary } = body;

    if (!userData || !userSummary) {
      return NextResponse.json(
        { success: false, error: 'Datos de usuario requeridos' },
        { status: 400 }
      );
    }

    console.log(`🤖 Generando email personalizado con ChatGPT para ${userData.email}`);

    // Generar prompts personalizados
    const { systemPrompt, userPrompt } = generatePersonalizedEmailPrompt(userData, userSummary);
    
    // Determinar tipo de email para analytics
    const plan = userData.subscription?.plan || 'free';
    const activity = userSummary.summary.totalDocuments;
    const spending = userSummary.summary.totalSpent;
    // const successRate = userSummary.summary.successRate;
    
    let emailType = 'loyalty';
    if (plan === 'free' && activity > 5) emailType = 'upsell';
    else if (plan === 'premium' && activity < 2) emailType = 'reengagement';
    else if (spending > 100) emailType = 'vip';
    else if (activity < 3) emailType = 'onboarding';

    const emailMetadata = getEmailTypeMetadata(emailType);
    
    console.log(`📊 Tipo de email: ${emailType} (${emailMetadata.category})`);

    // Generar email con ChatGPT
    let htmlContent: string;
    let chatgptUsed = false;

    try {
      const openaiClient = getOpenAIClient();
      const result = await openaiClient.generateContent(userPrompt, {
        systemPrompt,
        temperature: 0.7, // Más creativo para emails
        maxTokens: 2000
      });

      htmlContent = result.content;
      chatgptUsed = true;
      
      console.log(`✅ Email generado por ChatGPT (${result.usage?.totalTokens || 'N/A'} tokens)`);
      
    } catch (chatgptError: any) {
      console.warn('⚠️ ChatGPT falló, usando fallback inteligente:', chatgptError.message);
      
      // Fallback inteligente basado en el tipo de email
      htmlContent = generateIntelligentFallback(userData, userSummary, emailType);
      chatgptUsed = false;
    }

    // Guardar analytics del email generado
    await saveEmailAnalytics(userData, userSummary, emailType, emailMetadata, chatgptUsed);
    
    // Guardar el email completo en Firestore
    await saveEmailToFirestore(userData, userSummary, emailType, htmlContent, emailMetadata, chatgptUsed);

    // const elapsedMs = Date.now() - startTime;
    console.log(`✅ Email generado (ChatGPT: ${chatgptUsed})`);

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'X-Email-Type': emailType,
        'X-ChatGPT-Used': chatgptUsed.toString()
      }
    });

  } catch (error: any) {
    // const elapsedMs = Date.now() - startTime;
    console.error('❌ Error generando email:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        hint: 'Verifica la configuración de OpenAI o usa el modo fallback'
      },
      { status: 500 }
    );
  }
}

/**
 * Genera HTML de fallback inteligente basado en el tipo de email
 */
function generateIntelligentFallback(userData: any, userSummary: any, emailType: string): string {
  const { summary } = userSummary;
  
  // Contenido específico por tipo de email
  const emailContent = getEmailContentByType(emailType, userData, summary);
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email de Fidelización - Avocat LegalTech</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.7; 
            color: #2c3e50; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .email-wrapper { 
            max-width: 900px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
            position: relative;
        }
        .header h1 { 
            font-size: 32px; 
            font-weight: 700; 
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .header p { 
            font-size: 16px; 
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        .email-type-badge { 
            display: inline-block; 
            background: rgba(255,255,255,0.2); 
            color: white; 
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
            margin-left: 10px;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .content { padding: 40px 30px; }
        .section { 
            margin-bottom: 40px; 
            padding: 30px;
            background: #f8f9fa;
            border-radius: 12px;
            border-left: 5px solid #4a90e2;
        }
        .section h2 { 
            color: #2c3e50; 
            font-size: 24px; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section h3 {
            color: #4a90e2;
            font-size: 20px;
            margin-bottom: 15px;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 30px 0; 
        }
        .stat-card { 
            background: white; 
            padding: 25px; 
            border-radius: 12px; 
            text-align: center; 
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4a90e2, #357abd);
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(74, 144, 226, 0.15);
        }
        .stat-number { 
            font-size: 28px; 
            font-weight: 700; 
            color: #4a90e2; 
            margin-bottom: 8px;
        }
        .stat-label {
            color: #6c757d;
            font-size: 14px;
            font-weight: 500;
        }
        .fallback-notice { 
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
            padding: 20px; 
            border-radius: 10px; 
            border-left: 5px solid #f39c12; 
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(243, 156, 18, 0.1);
        }
        .recipient-info { 
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 30px;
            border: 1px solid #90caf9;
        }
        .email-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            margin: 20px 0; 
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
        }
        .footer { 
            background: #2c3e50; 
            color: white; 
            text-align: center; 
            padding: 40px 30px;
            margin-top: 40px;
        }
        .footer p { margin-bottom: 10px; }
        .footer strong { color: #4a90e2; }
        .page-break {
            page-break-before: always;
            margin-top: 40px;
            padding-top: 40px;
            border-top: 2px solid #e9ecef;
        }
        .highlight-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 25px;
            border-radius: 10px;
            border-left: 5px solid #4a90e2;
            margin: 20px 0;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .feature-list li::before {
            content: '✓';
            color: #28a745;
            font-weight: bold;
            font-size: 18px;
        }
        @media print {
            body { background: white; }
            .email-wrapper { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            <h1>📧 ${emailContent.title}</h1>
            <p>Generado por IA - ${new Date().toLocaleString('es-ES')} <span class="email-type-badge">${emailType.toUpperCase()}</span></p>
        </div>

        <div class="content">
            <div class="fallback-notice">
                <strong>⚠️ Modo Fallback Inteligente:</strong> ${emailContent.fallbackMessage}
            </div>

            <div class="recipient-info">
                <h3>📋 Información del Destinatario</h3>
                <p><strong>Para:</strong> ${userData.displayName || 'Cliente'} (${userData.email})</p>
                <p><strong>Plan:</strong> ${userData.subscription?.plan || 'Gratuito'}</p>
                <p><strong>Tipo de Email:</strong> ${emailType.toUpperCase()}</p>
            </div>

            <div class="section">
                <h2>📊 Estadísticas de Uso</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${summary.totalDocuments || 0}</div>
                        <div class="stat-label">Documentos Generados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">€${summary.totalSpent || 0}</div>
                        <div class="stat-label">Inversión Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${((summary.successRate || 0) * 100).toFixed(1)}%</div>
                        <div class="stat-label">Tasa de Éxito</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${summary.averageProcessingTime || 0}ms</div>
                        <div class="stat-label">Tiempo Promedio</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📝 Contenido del Email</h2>
                <div class="email-content">
                    ${emailContent.body}
                </div>
            </div>

            <div class="page-break">
                <div class="section">
                    <h2>🎯 Recomendaciones Personalizadas</h2>
                    <div class="highlight-box">
                        <h3>Basado en tu perfil de usuario:</h3>
                        <ul class="feature-list">
                            <li>Optimización de flujo de trabajo legal</li>
                            <li>Acceso a plantillas especializadas</li>
                            <li>Integración con sistemas de gestión</li>
                            <li>Soporte técnico prioritario</li>
                        </ul>
                    </div>
                </div>

                <div class="section">
                    <h2>📈 Próximos Pasos Sugeridos</h2>
                    <div class="highlight-box">
                        <h3>Para maximizar tu experiencia:</h3>
                        <ul class="feature-list">
                            <li>Explorar nuevas funcionalidades</li>
                            <li>Configurar notificaciones personalizadas</li>
                            <li>Participar en webinars exclusivos</li>
                            <li>Conectar con la comunidad legal</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por confiar en nosotros.</p>
            <p><strong>Atentamente,<br>El equipo de Avocat LegalTech</strong></p>
            <p><em>Este email fue generado automáticamente (modo fallback inteligente).</em></p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Obtiene contenido específico basado en el tipo de email
 */
function getEmailContentByType(emailType: string, userData: any, summary: any) {
  const userName = userData.displayName || 'Cliente';
  // const userEmail = userData.email;
  const plan = userData.subscription?.plan || 'Gratuito';
  const documents = summary.totalDocuments || 0;
  const spent = summary.totalSpent || 0;
  const successRate = (summary.successRate || 0) * 100;

  const contentMap = {
    upsell: {
      title: '🚀 Oportunidad de Mejora',
      fallbackMessage: 'Email de conversión generado con plantilla inteligente para usuarios gratuitos activos.',
      body: `
        <p><strong>Asunto:</strong> Desbloquea todo el potencial de Avocat LegalTech - ${userName}</p>
        <br>
        <p>Estimado/a ${userName},</p>
        <p>¡Felicitaciones por tu actividad excepcional! Has generado <strong>${documents} documentos</strong> en nuestra plataforma, lo que demuestra tu compromiso con la excelencia legal.</p>
        
        <p><strong>🎯 ¿Sabías que con el plan Premium podrías:</strong></p>
        <ul>
          <li>Generar documentos ilimitados sin restricciones</li>
          <li>Acceder a plantillas avanzadas y casos especializados</li>
          <li>Recibir soporte prioritario 24/7</li>
          <li>Exportar en múltiples formatos (PDF, Word, etc.)</li>
        </ul>

        <p>Tu tasa de éxito del <strong>${successRate.toFixed(1)}%</strong> demuestra que aprovecharías al máximo nuestras funcionalidades premium.</p>

        <a href="#" class="cta-button">🚀 Actualizar a Premium - Solo €29/mes</a>
      `
    },
    reengagement: {
      title: '💎 Te Extrañamos',
      fallbackMessage: 'Email de reactivación generado con plantilla inteligente para usuarios premium inactivos.',
      body: `
        <p><strong>Asunto:</strong> Tu cuenta premium te está esperando - ${userName}</p>
        <br>
        <p>Estimado/a ${userName},</p>
        <p>Notamos que no has usado tu cuenta premium últimamente. Como cliente VIP, queremos asegurarnos de que aproveches al máximo tu inversión de <strong>€${spent}</strong>.</p>
        
        <p><strong>🆕 Nuevas funcionalidades disponibles:</strong></p>
        <ul>
          <li>Análisis de IA mejorado con GPT-5</li>
          <li>Plantillas de documentos actualizadas</li>
          <li>Soporte prioritario renovado</li>
          <li>Integración con sistemas legales externos</li>
        </ul>

        <p>Tu historial de <strong>${documents} documentos generados</strong> demuestra el valor que obtienes de nuestra plataforma.</p>

        <a href="#" class="cta-button">🔄 Volver a la Plataforma</a>
      `
    },
    vip: {
      title: '👑 Cliente VIP',
      fallbackMessage: 'Email exclusivo generado con plantilla inteligente para clientes de alto valor.',
      body: `
        <p><strong>Asunto:</strong> Acceso exclusivo a nuevas funcionalidades - ${userName}</p>
        <br>
        <p>Estimado/a ${userName},</p>
        <p>Como uno de nuestros clientes más valiosos (inversión de <strong>€${spent}</strong>), queremos ofrecerte acceso anticipado a nuestras últimas innovaciones.</p>
        
        <p><strong>🎁 Beneficios exclusivos para ti:</strong></p>
        <ul>
          <li>Acceso beta a GPT-5 avanzado</li>
          <li>Consultoría legal personalizada</li>
          <li>Plantillas exclusivas no disponibles públicamente</li>
          <li>Webinars privados con expertos legales</li>
        </ul>

        <p>Tu tasa de éxito del <strong>${successRate.toFixed(1)}%</strong> con <strong>${documents} documentos</strong> nos enorgullece tenerte como cliente.</p>

        <a href="#" class="cta-button">🌟 Acceder a Funcionalidades Exclusivas</a>
      `
    },
    onboarding: {
      title: '🎯 Bienvenido',
      fallbackMessage: 'Email de bienvenida generado con plantilla inteligente para nuevos usuarios.',
      body: `
        <p><strong>Asunto:</strong> Guía de inicio - ${userName}</p>
        <br>
        <p>¡Bienvenido/a ${userName}!</p>
        <p>Esperamos que disfrutes de tu experiencia con Avocat LegalTech. Has comenzado con <strong>${documents} documentos</strong>, ¡excelente comienzo!</p>
        
        <p><strong>📚 Próximos pasos recomendados:</strong></p>
        <ul>
          <li>Explora nuestras plantillas más populares</li>
          <li>Configura tu perfil para recomendaciones personalizadas</li>
          <li>Únete a nuestra comunidad de abogados</li>
          <li>Descarga la app móvil para acceso desde cualquier lugar</li>
        </ul>

        <p>Tu plan <strong>${plan}</strong> te permite generar documentos de calidad profesional.</p>

        <a href="#" class="cta-button">🚀 Comenzar Ahora</a>
      `
    },
    loyalty: {
      title: '💝 Fidelización',
      fallbackMessage: 'Email de fidelización generado con plantilla inteligente para usuarios regulares.',
      body: `
        <p><strong>Asunto:</strong> Actualización de tu cuenta - ${userName}</p>
        <br>
        <p>Estimado/a ${userName},</p>
        <p>Gracias por ser parte de nuestra comunidad. Tu actividad regular con <strong>${documents} documentos generados</strong> y una inversión de <strong>€${spent}</strong> demuestra tu confianza en nosotros.</p>
        
        <p><strong>📈 Tu rendimiento:</strong></p>
        <ul>
          <li>Tasa de éxito: <strong>${successRate.toFixed(1)}%</strong></li>
          <li>Tiempo promedio de procesamiento: <strong>${summary.averageProcessingTime || 0}ms</strong></li>
          <li>Plan actual: <strong>${plan}</strong></li>
        </ul>

        <p>Te recomendamos explorar nuestras nuevas funcionalidades para optimizar aún más tu flujo de trabajo.</p>

        <a href="#" class="cta-button">🔍 Explorar Nuevas Funcionalidades</a>
      `
    }
  };

  return contentMap[emailType as keyof typeof contentMap] || contentMap.loyalty;
}

/**
 * Guarda analytics del email en Firestore
 */
async function saveEmailAnalytics(userData: any, userSummary: any, emailType: string, emailMetadata: any, chatgptUsed: boolean) {
  try {
    const analyticsData = {
      userId: userData.uid,
      emailType,
      category: emailMetadata.category,
      chatgptUsed,
      userPlan: userData.subscription?.plan || 'free',
      userActivity: userSummary.summary.totalDocuments,
      userSpending: userSummary.summary.totalSpent,
      generatedAt: new Date().toISOString()
    };

    // Aquí guardarías en Firestore
    console.log('📊 Analytics del email:', analyticsData);
  } catch (error) {
    console.error('❌ Error guardando analytics:', error);
  }
}

/**
 * Guarda el email completo en Firestore
 */
async function saveEmailToFirestore(userData: any, userSummary: any, emailType: string, htmlContent: string, emailMetadata: any, chatgptUsed: boolean) {
  try {
    const emailId = uuidv4();
    // const now = new Date().toISOString();
    
    // Aquí guardarías el email completo en Firestore
    console.log(`✅ Email preparado para guardar: ${emailId}`);
    console.log(`📧 Tipo: ${emailType}, ChatGPT: ${chatgptUsed}, Usuario: ${userData.email}`);
    
  } catch (error) {
    console.error('❌ Error guardando email en Firestore:', error);
  }
}