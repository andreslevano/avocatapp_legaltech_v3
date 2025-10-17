import { NextRequest, NextResponse } from 'next/server';
import { TemplateSchema } from '@/lib/validate';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock database - en producción usar Firebase/Prisma
let templates: any[] = [
  {
    id: '1',
    areaLegal: 'Derecho Civil',
    tipoEscrito: 'Demanda de reclamación de cantidad',
    promptSistema: 'Eres un abogado especialista en derecho civil. Redacta demandas de reclamación de cantidad con fundamento en el Código Civil español.',
    promptUsuario: 'Redacta una demanda de reclamación de cantidad incluyendo: 1. Datos de las partes, 2. Hechos fundamentados, 3. Fundamentos de derecho (artículos del Código Civil), 4. Peticiones concretas, 5. Otrosí para costas',
    variables: ['cantidad', 'fechaVencimiento', 'intereses'],
    activo: true,
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
    const template = templates.find(t => t.id === params.id && t.activo);
    
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Plantilla no encontrada',
            hint: 'Verifica el ID de la plantilla'
          }
        },
        { status: 404 }
      );
    }
    
    apiLogger.success(requestId, { templateId: template.id });
    
    return NextResponse.json({
      success: true,
      data: template
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_FAILED',
          message: 'Error obteniendo plantilla',
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
    const validationResult = TemplateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de plantilla inválidos',
            hint: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          }
        },
        { status: 400 }
      );
    }
    
    const templateIndex = templates.findIndex(t => t.id === params.id);
    
    if (templateIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Plantilla no encontrada',
            hint: 'Verifica el ID de la plantilla'
          }
        },
        { status: 404 }
      );
    }
    
    const updatedTemplate = {
      ...templates[templateIndex],
      ...validationResult.data,
      id: params.id, // Mantener el ID original
      updatedAt: new Date().toISOString()
    };
    
    templates[templateIndex] = updatedTemplate;
    
    apiLogger.success(requestId, { templateId: updatedTemplate.id });
    
    return NextResponse.json({
      success: true,
      data: updatedTemplate
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATE_UPDATE_FAILED',
          message: 'Error actualizando plantilla',
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
    const templateIndex = templates.findIndex(t => t.id === params.id);
    
    if (templateIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Plantilla no encontrada',
            hint: 'Verifica el ID de la plantilla'
          }
        },
        { status: 404 }
      );
    }
    
    // Soft delete - marcar como inactivo
    templates[templateIndex].activo = false;
    templates[templateIndex].updatedAt = new Date().toISOString();
    
    apiLogger.success(requestId, { templateId: params.id });
    
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
          code: 'TEMPLATE_DELETE_FAILED',
          message: 'Error eliminando plantilla',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
