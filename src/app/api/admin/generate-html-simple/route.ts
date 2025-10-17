import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs' as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userData, userSummary } = body;

    if (!userData || !userSummary) {
      return NextResponse.json(
        { success: false, error: 'Datos de usuario requeridos' },
        { status: 400 }
      );
    }

    console.log(`📧 Generando email de fidelización para ${userData.email}`);

    // Generar HTML del email
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email de Fidelización</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .email-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4a90e2;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4a90e2;
            margin: 0;
            font-size: 28px;
        }
        .recipient-info {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #4a90e2;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #4a90e2;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #4a90e2;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📧 Email de Fidelización</h1>
            <p>Generado por IA - ${new Date().toLocaleString('es-ES')}</p>
        </div>

        <div class="recipient-info">
            <h3>📋 Información del Destinatario</h3>
            <p><strong>Para:</strong> ${userData.displayName || 'Cliente'} (${userData.email})</p>
            <p><strong>Plan:</strong> ${userData.subscription?.plan || 'Gratuito'}</p>
            <p><strong>Registrado:</strong> ${new Date(userData.createdAt || Date.now()).toLocaleDateString('es-ES')}</p>
        </div>

        <div class="section">
            <h2>📊 Estadísticas de Uso</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${userSummary.summary.totalDocuments || 0}</div>
                    <div>Documentos Generados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">€${userSummary.summary.totalSpent || 0}</div>
                    <div>Inversión Total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${((userSummary.summary.successRate || 0) * 100).toFixed(1)}%</div>
                    <div>Tasa de Éxito</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${userSummary.summary.averageProcessingTime || 0}ms</div>
                    <div>Tiempo Promedio</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📝 Contenido del Email</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #4a90e2;">
                <p><strong>Asunto:</strong> Actualización de tu cuenta - ${userData.displayName || 'Cliente'}</p>
                <br>
                <p>Estimado/a ${userData.displayName || 'Cliente'},</p>
                <p>Esperamos que se encuentre bien. Nos complace informarle sobre el estado actual de su cuenta en nuestra plataforma legal.</p>
                
                <p>Su dedicación a la plataforma es evidente con <strong>${userSummary.summary.totalDocuments || 0} documentos generados</strong> y una inversión de <strong>€${userSummary.summary.totalSpent || 0}</strong>.</p>

                <p>Su tasa de éxito del <strong>${((userSummary.summary.successRate || 0) * 100).toFixed(1)}%</strong> demuestra un uso eficiente de nuestras herramientas.</p>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por confiar en nosotros.</p>
            <p><strong>Atentamente,<br>El equipo de Avocat LegalTech</strong></p>
            <p><em>Este email fue generado automáticamente por IA basándose en su historial de uso.</em></p>
        </div>
    </div>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('❌ Error generando HTML:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


