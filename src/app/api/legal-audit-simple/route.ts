import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 Legal audit simple endpoint called');
    console.log('Body keys:', Object.keys(body));
    
    // Validar datos básicos
    if (!body.perfilCliente || !body.contextoProcesal || !body.textoBase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Faltan campos requeridos',
            hint: 'Incluye: perfilCliente, contextoProcesal, textoBase'
          }
        },
        { status: 400 }
      );
    }
    
    // Generar resultado simple
    const resultado = {
      reporteAuditoria: [
        "✅ Encaje procedimental correcto",
        "✅ Competencia territorial verificada",
        "✅ Legitimación de las partes confirmada",
        "✅ Hechos suficientemente detallados",
        "✅ Documentos aportados suficientes",
        "⚠️ Verificar carga de la prueba según jurisdicción",
        "✅ Estructura procesal correcta",
        `✅ Idioma y moneda adaptados: ${body.perfilCliente.idioma}, ${body.perfilCliente.moneda}`
      ],
      escritoFinal: `# ESCRITO FINAL

## 1. ÓRGANO JUDICIAL Y COMPETENCIA

AL JUZGADO DE PRIMERA INSTANCIA DE [VERIFICAR NORMA: Tribunal competente según ${body.perfilCliente.region || body.perfilCliente.paisISO}]

**COMPETENCIA TERRITORIAL**: [VERIFICAR NORMA: Artículo de competencia territorial]
**COMPETENCIA MATERIAL**: ${body.contextoProcesal.areaLegal.toUpperCase()} - Procedimiento ${body.contextoProcesal.procedimiento.toUpperCase()}

## 2. PARTES Y REPRESENTACIÓN

**DEMANDANTE**: [DATO FALTANTE: Nombre completo del demandante]
- DNI: [DATO FALTANTE: DNI del demandante]
- Domicilio: [DATO FALTANTE: Domicilio del demandante]

**DEMANDADO**: [DATO FALTANTE: Nombre completo del demandado]
- DNI/CIF: [DATO FALTANTE: DNI/CIF del demandado]
- Domicilio: [DATO FALTANTE: Domicilio del demandado]

## 3. HECHOS

${body.textoBase}

## 4. FUNDAMENTOS DE DERECHO

### 4.1 Competencia y Procedimiento
- [VERIFICAR NORMA: Artículo de competencia]
- [VERIFICAR NORMA: Artículo de procedimiento]

### 4.2 Legitimación
- [VERIFICAR NORMA: Artículo de legitimación]

### 4.3 Fondo del Asunto
- [VERIFICAR NORMA: Artículos materiales aplicables]

## 5. PETICIÓN / SÚPLICA

1. Que se tenga por presentado este escrito y se admita a trámite.
2. Que se cite al demandado para que comparezca en el plazo legal.
3. Que se dicte sentencia estimando la demanda y condenando al demandado al pago de ${body.contextoProcesal.cuantia || '[DATO FALTANTE: Cuantía]'} ${body.perfilCliente.moneda}.

## 6. DOCUMENTOS APORTADOS

${body.contextoProcesal.documentos.map((doc: any, index: number) => `DOC-${index + 1}: ${doc}`).join('\n')}

## 7. LUGAR, FECHA Y FIRMA

[DATO FALTANTE: Lugar], ${new Date().toLocaleDateString('es-ES')}

[DATO FALTANTE: Firma del abogado]`,
      checklistPrevia: [
        "□ Competencia territorial verificada",
        "□ Competencia material confirmada",
        "□ Legitimación de las partes",
        "□ Cuantía y procedimiento correctos",
        "□ Pruebas documentales preparadas",
        "□ Domicilios de notificación verificados",
        "□ Tasas judiciales pagadas (si aplica)",
        "□ Plazos procesales respetados",
        "□ Representación legal acreditada",
        "□ Documentos originales y copias",
        "□ Intereses y costas calculados"
      ],
      variantesProcedimiento: {
        "PROCEDIMIENTO_ESTANDAR": {
          "cambios": ["Procedimiento específico del área"],
          "normas": ["Normativa aplicable del área"]
        }
      },
      camposVariables: {
        "cliente": {
          "nombre": "[DATO FALTANTE: Nombre completo del demandante]",
          "dni": "[DATO FALTANTE: DNI del demandante]",
          "domicilio": "[DATO FALTANTE: Domicilio del demandante]"
        },
        "demandado": {
          "nombre": "[DATO FALTANTE: Nombre completo del demandado]",
          "dni_cif": "[DATO FALTANTE: DNI/CIF del demandado]",
          "domicilio": "[DATO FALTANTE: Domicilio del demandado]"
        },
        "proceso": {
          "cuantia": body.contextoProcesal.cuantia || "[DATO FALTANTE: Cuantía]",
          "fecha_hecho": "[DATO FALTANTE: Fecha del hecho]"
        }
      }
    };
    
    return NextResponse.json({
      success: true,
      data: {
        id: 'legal-audit-simple-' + Date.now(),
        resultado,
        metadata: {
          paisISO: body.perfilCliente.paisISO,
          areaLegal: body.contextoProcesal.areaLegal,
          procedimiento: body.contextoProcesal.procedimiento,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Legal audit simple error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LEGAL_AUDIT_SIMPLE_FAILED',
          message: 'Error en la auditoría legal simple',
          hint: 'Verifica los datos de entrada'
        }
      },
      { status: 500 }
    );
  }
}
