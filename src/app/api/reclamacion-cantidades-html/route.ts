import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Reclamación de Cantidades - Endpoint HTML');
    
    const body = await request.json();
    console.log('📝 Datos recibidos:', body);
    
    // Validación básica
    if (!body.nombreTrabajador || !body.nombreEmpresa) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan datos obligatorios'
        },
        { status: 400 }
      );
    }
    
    // Generar HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reclamación de Cantidades</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 40px;
            color: #000;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 30px;
            text-decoration: underline;
        }
        .content {
            white-space: pre-line;
            font-size: 12px;
        }
        .signature {
            margin-top: 50px;
            text-align: right;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RECLAMACIÓN DE CANTIDADES</h1>
    </div>
    
    <div class="content">
Estimado/a Sr./Sra.,

Por medio del presente, me dirijo a ustedes para reclamar las cantidades adeudadas por la empresa en concepto de salarios, horas extras y otros conceptos laborales.

DETALLES DE LA RECLAMACIÓN:
- Trabajador: ${body.nombreTrabajador}
- Empresa: ${body.nombreEmpresa}
- Período: [PERÍODO]
- Conceptos adeudados: [CONCEPTOS]
- Importe total: [IMPORTE] €
- Intereses de demora: [INTERESES] €

FUNDAMENTOS LEGALES:
- Artículo 26 del Estatuto de los Trabajadores
- Convenio Colectivo aplicable
- Jurisprudencia del Tribunal Supremo

SOLICITUD:
Se solicita el pago íntegro de las cantidades adeudadas más los intereses de demora correspondientes, en un plazo máximo de 15 días naturales.

En caso de no recibir respuesta satisfactoria, se procederá a interponer la correspondiente demanda judicial.

A la espera de su respuesta,
    </div>
    
    <div class="signature">
        <p>_________________________</p>
        <p>Firma</p>
    </div>
</body>
</html>`;

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="reclamacion-cantidades-${body.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.html"`,
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('❌ Error generando Reclamación de Cantidades:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error generando el documento'
      },
      { status: 500 }
    );
  }
}


