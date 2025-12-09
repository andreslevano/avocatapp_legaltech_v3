import { NextRequest, NextResponse } from 'next/server';
import { auditarEscritoLegalSimple } from '@/lib/legal-auditor-simple';
import type { PerfilCliente, ContextoProcesal, NormasAdicionales } from '@/lib/legal-auditor-simple';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const { perfilCliente, contextoProcesal, textoBase, normasAdicionales } = body;
    
    if (!perfilCliente || !contextoProcesal || !textoBase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Faltan campos requeridos: perfilCliente, contextoProcesal, textoBase',
            hint: 'Asegúrate de incluir todos los campos obligatorios'
          }
        },
        { status: 400 }
      );
    }
    
    // Validar perfil del cliente
    if (!perfilCliente.paisISO || !perfilCliente.idioma || !perfilCliente.moneda || !perfilCliente.rol) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CLIENT_PROFILE',
            message: 'Perfil del cliente incompleto',
            hint: 'Incluye: paisISO, idioma, moneda, rol'
          }
        },
        { status: 400 }
      );
    }
    
    // Validar contexto procesal
    if (!contextoProcesal.areaLegal || !contextoProcesal.procedimiento) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PROCEDURAL_CONTEXT',
            message: 'Contexto procesal incompleto',
            hint: 'Incluye: areaLegal, procedimiento'
          }
        },
        { status: 400 }
      );
    }
    
    console.log('Legal audit request', {
      paisISO: perfilCliente.paisISO,
      areaLegal: contextoProcesal.areaLegal,
      procedimiento: contextoProcesal.procedimiento
    });
    
    // Realizar auditoría legal
    console.log('Starting legal audit');
    const resultado = await auditarEscritoLegalSimple(
      perfilCliente as PerfilCliente,
      contextoProcesal as ContextoProcesal,
      textoBase,
      normasAdicionales as NormasAdicionales
    );
    console.log('Legal audit completed');
    
    const elapsedMs = Date.now() - startTime;
    
    apiLogger.success(requestId, {
      elapsedMs,
      reporteItems: resultado.reporteAuditoria.length,
      checklistItems: resultado.checklistPrevia.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        resultado,
        metadata: {
          paisISO: perfilCliente.paisISO,
          areaLegal: contextoProcesal.areaLegal,
          procedimiento: contextoProcesal.procedimiento,
          elapsedMs
        }
      }
    });
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    apiLogger.error(requestId, error, { elapsedMs });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUDIT_FAILED',
          message: 'Error realizando la auditoría legal',
          hint: 'Verifica los datos de entrada y intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
