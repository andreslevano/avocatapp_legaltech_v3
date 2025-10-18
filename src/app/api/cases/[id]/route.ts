import { NextRequest, NextResponse } from 'next/server';
import { CaseSchema } from '@/lib/validate';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock database - en producción usar Firebase/Prisma
const cases: any[] = [
  {
    id: '1',
    userId: 'user_123',
    titulo: 'Demanda de reclamación de cantidad',
    estado: 'abierto',
    areaLegal: 'Derecho Civil',
    documentos: ['doc_1', 'doc_2'],
    descripcion: 'Caso de reclamación de cantidad por impago de servicios',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = uuidv4();
  
  try {
    const caseItem = cases.find(c => c.id === params.id);
    
    if (!caseItem) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Caso no encontrado',
            hint: 'Verifica el ID del caso'
          }
        },
        { status: 404 }
      );
    }
    
    apiLogger.success(requestId, { caseId: caseItem.id });
    
    return NextResponse.json({
      success: true,
      data: caseItem
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CASE_FETCH_FAILED',
          message: 'Error obteniendo caso',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = uuidv4();
  
  try {
    const body = await request.json();
    const validationResult = CaseSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de caso inválidos',
            hint: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          }
        },
        { status: 400 }
      );
    }
    
    const caseIndex = cases.findIndex(c => c.id === params.id);
    
    if (caseIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Caso no encontrado',
            hint: 'Verifica el ID del caso'
          }
        },
        { status: 404 }
      );
    }
    
    const updatedCase = {
      ...cases[caseIndex],
      ...validationResult.data,
      id: params.id, // Mantener el ID original
      updatedAt: new Date().toISOString()
    };
    
    cases[caseIndex] = updatedCase;
    
    apiLogger.success(requestId, { caseId: updatedCase.id });
    
    return NextResponse.json({
      success: true,
      data: updatedCase
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CASE_UPDATE_FAILED',
          message: 'Error actualizando caso',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = uuidv4();
  
  try {
    const caseIndex = cases.findIndex(c => c.id === params.id);
    
    if (caseIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Caso no encontrado',
            hint: 'Verifica el ID del caso'
          }
        },
        { status: 404 }
      );
    }
    
    cases.splice(caseIndex, 1);
    
    apiLogger.success(requestId, { caseId: params.id });
    
    return NextResponse.json({
      success: true,
      data: { id: params.id, deleted: true }
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CASE_DELETE_FAILED',
          message: 'Error eliminando caso',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
