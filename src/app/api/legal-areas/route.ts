import { NextRequest, NextResponse } from 'next/server';
import { LegalAreaSchema } from '@/lib/validate';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock database - en producción usar Firebase/Prisma
let legalAreas: any[] = [
  {
    id: '1',
    nombre: 'Derecho Constitucional',
    tipos: [
      { id: '1-1', nombre: 'Recurso de amparo ante el Tribunal Constitucional', precio: 3.00 },
      { id: '1-2', nombre: 'Recurso de inconstitucionalidad (modelo orientativo)', precio: 3.00 },
      { id: '1-3', nombre: 'Escrito de acción de protección de derechos fundamentales', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    nombre: 'Derecho Civil y Procesal Civil',
    tipos: [
      { id: '2-1', nombre: 'Demanda de reclamación de cantidad (juicio ordinario)', precio: 3.00 },
      { id: '2-2', nombre: 'Escrito de oposición a juicio monitorio', precio: 3.00 },
      { id: '2-3', nombre: 'Demanda de desahucio por falta de pago', precio: 3.00 },
      { id: '2-4', nombre: 'Escrito de medidas cautelares', precio: 3.00 },
      { id: '2-5', nombre: 'Recurso de apelación en proceso civil', precio: 3.00 },
      { id: '2-6', nombre: 'Demanda de responsabilidad contractual', precio: 3.00 },
      { id: '2-7', nombre: 'Escrito de ejecución de sentencia', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    nombre: 'Derecho Penal y Procesal Penal',
    tipos: [
      { id: '3-1', nombre: 'Denuncia y querella criminal', precio: 3.00 },
      { id: '3-2', nombre: 'Escrito de acusación particular', precio: 3.00 },
      { id: '3-3', nombre: 'Escrito de defensa', precio: 3.00 },
      { id: '3-4', nombre: 'Solicitud de medidas cautelares', precio: 3.00 },
      { id: '3-5', nombre: 'Recurso de reforma y subsidiario de apelación', precio: 3.00 },
      { id: '3-6', nombre: 'Escrito de personación como acusación particular', precio: 3.00 },
      { id: '3-7', nombre: 'Recurso de casación penal (modelo académico)', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    nombre: 'Derecho Laboral (Jurisdicción Social)',
    tipos: [
      { id: '4-1', nombre: 'Demanda por despido improcedente', precio: 3.00 },
      { id: '4-2', nombre: 'Demanda por reclamación de salarios', precio: 3.00 },
      { id: '4-3', nombre: 'Demanda por modificación sustancial de condiciones', precio: 3.00 },
      { id: '4-4', nombre: 'Escrito de impugnación de sanción disciplinaria', precio: 3.00 },
      { id: '4-5', nombre: 'Escrito de ejecución de sentencia laboral', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    nombre: 'Derecho Administrativo y Contencioso-Administrativo',
    tipos: [
      { id: '5-1', nombre: 'Recurso administrativo de alzada', precio: 3.00 },
      { id: '5-2', nombre: 'Recurso potestativo de reposición', precio: 3.00 },
      { id: '5-3', nombre: 'Demanda contencioso-administrativa', precio: 3.00 },
      { id: '5-4', nombre: 'Medidas cautelares en vía contenciosa', precio: 3.00 },
      { id: '5-5', nombre: 'Escrito de personación en procedimiento contencioso', precio: 3.00 },
      { id: '5-6', nombre: 'Recurso de apelación en lo contencioso-administrativo', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    nombre: 'Derecho Mercantil',
    tipos: [
      { id: '6-1', nombre: 'Demanda de impugnación de acuerdos sociales', precio: 3.00 },
      { id: '6-2', nombre: 'Solicitud de concurso voluntario', precio: 3.00 },
      { id: '6-3', nombre: 'Demanda por competencia desleal', precio: 3.00 },
      { id: '6-4', nombre: 'Demanda por incumplimiento contractual mercantil', precio: 3.00 },
      { id: '6-5', nombre: 'Demanda cambiaria (ejecutiva)', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    nombre: 'Recursos procesales transversales',
    tipos: [
      { id: '7-1', nombre: 'Recurso de reposición', precio: 3.00 },
      { id: '7-2', nombre: 'Recurso de apelación', precio: 3.00 },
      { id: '7-3', nombre: 'Recurso de casación', precio: 3.00 },
      { id: '7-4', nombre: 'Recurso de queja', precio: 3.00 },
      { id: '7-5', nombre: 'Incidente de nulidad de actuaciones', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    nombre: 'Derecho de Familia',
    tipos: [
      { id: '8-1', nombre: 'Demanda de divorcio contencioso', precio: 3.00 },
      { id: '8-2', nombre: 'Demanda de medidas paternofiliales', precio: 3.00 },
      { id: '8-3', nombre: 'Solicitud de modificación de medidas', precio: 3.00 },
      { id: '8-4', nombre: 'Solicitud de guarda y custodia', precio: 3.00 },
      { id: '8-5', nombre: 'Demanda de alimentos', precio: 3.00 },
      { id: '8-6', nombre: 'Escrito de ejecución por impago de pensión alimenticia', precio: 3.00 }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    let filteredAreas = legalAreas;
    
    if (!includeInactive) {
      filteredAreas = legalAreas.filter(area => area.activo);
    }
    
    apiLogger.success(requestId, { count: filteredAreas.length });
    
    return NextResponse.json({
      success: true,
      data: filteredAreas
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LEGAL_AREAS_FETCH_FAILED',
          message: 'Error obteniendo áreas legales',
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
    const validationResult = LegalAreaSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de área legal inválidos',
            hint: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          }
        },
        { status: 400 }
      );
    }
    
    const areaData = validationResult.data;
    const newArea = {
      ...areaData,
      id: uuidv4(),
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    legalAreas.push(newArea);
    
    apiLogger.success(requestId, { areaId: newArea.id });
    
    return NextResponse.json({
      success: true,
      data: newArea
    }, { status: 201 });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LEGAL_AREA_CREATE_FAILED',
          message: 'Error creando área legal',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
