import { NextRequest, NextResponse } from 'next/server';
import { CaseSchema } from '@/lib/validate';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock database - en producción usar Firebase/Prisma
let cases: any[] = [
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

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const estado = searchParams.get('estado');
    const areaLegal = searchParams.get('areaLegal');
    
    let filteredCases = cases;
    
    if (userId) {
      filteredCases = filteredCases.filter(c => c.userId === userId);
    }
    
    if (estado) {
      filteredCases = filteredCases.filter(c => c.estado === estado);
    }
    
    if (areaLegal) {
      filteredCases = filteredCases.filter(c => c.areaLegal === areaLegal);
    }
    
    apiLogger.success(requestId, { count: filteredCases.length });
    
    return NextResponse.json({
      success: true,
      data: filteredCases
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CASES_FETCH_FAILED',
          message: 'Error obteniendo casos',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    const caseData = validationResult.data;
    const newCase = {
      id: uuidv4(),
      ...caseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    cases.push(newCase);
    
    apiLogger.success(requestId, { caseId: newCase.id });
    
    return NextResponse.json({
      success: true,
      data: newCase
    }, { status: 201 });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CASE_CREATE_FAILED',
          message: 'Error creando caso',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
