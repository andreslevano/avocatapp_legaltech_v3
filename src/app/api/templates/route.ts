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

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const { searchParams } = new URL(request.url);
    const areaLegal = searchParams.get('areaLegal');
    const tipoEscrito = searchParams.get('tipoEscrito');
    
    let filteredTemplates = templates.filter(t => t.activo);
    
    if (areaLegal) {
      filteredTemplates = filteredTemplates.filter(t => t.areaLegal === areaLegal);
    }
    
    if (tipoEscrito) {
      filteredTemplates = filteredTemplates.filter(t => t.tipoEscrito === tipoEscrito);
    }
    
    apiLogger.success(requestId, { count: filteredTemplates.length });
    
    return NextResponse.json({
      success: true,
      data: filteredTemplates
    });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATES_FETCH_FAILED',
          message: 'Error obteniendo plantillas',
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
    
    const templateData = validationResult.data;
    const newTemplate = {
      id: uuidv4(),
      ...templateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    
    apiLogger.success(requestId, { templateId: newTemplate.id });
    
    return NextResponse.json({
      success: true,
      data: newTemplate
    }, { status: 201 });
    
  } catch (error) {
    apiLogger.error(requestId, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEMPLATE_CREATE_FAILED',
          message: 'Error creando plantilla',
          hint: 'Intenta de nuevo'
        }
      },
      { status: 500 }
    );
  }
}
