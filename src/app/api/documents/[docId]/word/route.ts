import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const docId = params.docId;

    if (!uid || !docId) {
      return NextResponse.json(
        { error: 'uid y docId son requeridos' },
        { status: 400 }
      );
    }

    console.log(`📝 Generando Word para documento: ${docId} para usuario: ${uid}`);

    // Obtener documento de Firestore
    const docRef = db().collection('documents').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const document = docSnap.data();

    // Verificar que el documento pertenece al usuario
    if (document?.userId !== uid) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener contenido generado o datos de entrada
    let content = document?.content?.generatedContent;
    const inputData = document?.content?.inputData;
    
    // Si no hay contenido generado, intentar regenerarlo desde inputData y perfil del usuario
    if (!content && inputData) {
      console.log('⚠️ No hay contenido generado, regenerando desde inputData y perfil del usuario...');
      
      // Obtener perfil del usuario
      let userProfile: any = null;
      try {
        const userDoc = await db().collection('users').doc(uid).get();
        if (userDoc.exists) {
          userProfile = { uid: userDoc.id, ...userDoc.data() };
          console.log(`✅ Perfil del usuario obtenido: ${userProfile.email}`);
        }
      } catch (error: any) {
        console.warn('⚠️ Error obteniendo perfil del usuario:', error.message);
      }
      
      // Regenerar contenido usando el mismo proceso que en /api/reclamacion-cantidades
      try {
        const { buildUserPrompt } = await import('@/lib/prompts/reclamacion_cantidades_co');
        const { SYSTEM_PROMPT } = await import('@/lib/prompts/reclamacion_cantidades_co');
        const { getOpenAIClient } = await import('@/lib/openai-client');
        
        // Preparar contexto OCR si está disponible
        const hasOcrData = inputData.ocrFiles && inputData.ocrFiles.length > 0;
        const ocrContext = hasOcrData ? `
        
DATOS EXTRAÍDOS DE DOCUMENTOS (OCR):
${inputData.ocrFiles.map((file: any, index: number) => `
Documento ${index + 1}: ${file.originalName || `Documento ${index + 1}`}
Categoría: ${file.category || 'No especificada'}
Texto extraído: ${file.extractedText || 'No disponible'}
Confianza: ${file.confidence ? (file.confidence * 100).toFixed(1) + '%' : 'N/A'}
`).join('\n')}
` : '';
        
        const userPrompt = buildUserPrompt(inputData, userProfile) + ocrContext;
        
        const openaiClient = getOpenAIClient();
        const result = await openaiClient.generateContent(userPrompt, {
          systemPrompt: SYSTEM_PROMPT,
          temperature: 0.3,
          maxTokens: 3000
        });
        
        if (result.content) {
          // Parsear JSON
          try {
            content = JSON.parse(result.content);
            console.log('✅ Contenido regenerado exitosamente desde inputData');
          } catch (parseError) {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              content = JSON.parse(jsonMatch[0]);
              console.log('✅ Contenido regenerado (extraído de JSON)');
            } else {
              throw new Error('No se pudo extraer JSON válido');
            }
          }
        }
      } catch (regenerateError: any) {
        console.error('❌ Error regenerando contenido:', regenerateError);
        // Continuar con inputData directamente si falla la regeneración
      }
    }
    
    // Si aún no hay contenido, usar inputData directamente
    if (!content && inputData) {
      console.log('⚠️ Usando inputData directamente para generar Word');
      // Construir contenido básico desde inputData
      content = {
        encabezado: {
          tribunal: `AL TRIBUNAL DE INSTANCIA, SECCIÓN SOCIAL DE ${inputData.localidad || 'MADRID'} QUE POR TURNO CORRESPONDA`,
          localidad: inputData.localidad || 'Madrid'
        },
        demandante: {
          nombre: inputData.nombreTrabajador || 'No especificado',
          dni: inputData.dniTrabajador || 'No especificado',
          domicilio: inputData.domicilioTrabajador || 'No especificado',
          telefono: inputData.telefonoTrabajador || 'No especificado',
          email: inputData.emailTrabajador || ''
        },
        demandada: {
          nombre: inputData.nombreEmpresa || 'No especificado',
          cif: inputData.cifEmpresa || 'No especificado',
          domicilio: inputData.domicilioEmpresa || 'No especificado'
        },
        hechos: {
          primer: {
            tipoContrato: inputData.tipoContrato || 'indefinido',
            jornada: inputData.jornada || 'completa',
            coeficienteParcialidad: '1.0',
            tareas: inputData.tareas || 'No especificadas',
            antiguedad: inputData.antiguedad || 'No especificada',
            duracion: inputData.tipoContrato || 'indefinido',
            salario: inputData.salario || 'No especificado',
            convenio: inputData.convenio || 'No especificado'
          },
          segundo: {
            cantidadesAdeudadas: inputData.cantidadesAdeudadas || [],
            interesDemora: true
          },
          tercer: {
            cargoSindical: false
          },
          cuarto: {
            fechaPapeleta: inputData.fechaPapeleta || 'No especificada',
            fechaConciliacion: inputData.fechaConciliacion || 'No especificada',
            resultado: inputData.resultadoConciliacion || 'SIN ACUERDO'
          }
        },
        fundamentos: {
          primero: 'Artículos 1, 2 a), 6, 10, 66 y 103 a 112 de la Ley 36/2011, de 10 de octubre, reguladora de la jurisdicción social.',
          segundo: 'Artículos 26 a 29 del Real Decreto Legislativo 2/2015, de 23 de octubre, por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores.',
          tercero: 'Convenio Colectivo de aplicación y Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad.',
          cuarto: 'Jurisprudencia del Tribunal Supremo sobre reclamaciones de cantidades.'
        },
        petitorio: {
          cantidadReclamada: inputData.cantidadTotal || 'No especificada',
          intereses: true,
          lugar: inputData.localidad || 'Madrid',
          fecha: new Date().toLocaleDateString('es-ES')
        },
        otrosi: {
          asistenciaLetrada: true,
          mediosPrueba: {
            documental: inputData.ocrFiles?.map((f: any) => f.originalName) || ['Documentos aportados'],
            interrogatorio: 'Interrogatorio de la parte demandada'
          }
        }
      };
    }
    
    if (!content) {
      return NextResponse.json(
        { error: 'Contenido del documento no disponible y no se pudo regenerar' },
        { status: 404 }
      );
    }

    // Construir documento Word desde el contenido
    const paragraphs: Paragraph[] = [];

    // Nota aclaratoria (si existe)
    if (content.notaAclaratoria) {
      paragraphs.push(
        new Paragraph({
          text: content.notaAclaratoria,
          spacing: { after: 200 },
        })
      );
    }

    // Encabezado
    if (content.encabezado?.tribunal || content.encabezado?.juzgado) {
      paragraphs.push(
        new Paragraph({
          text: content.encabezado.tribunal || content.encabezado.juzgado,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Datos del demandante
    if (content.demandante) {
      const demandanteText = `DON/DOÑA ${content.demandante.nombre}, con DNI nº ${content.demandante.dni}, domicilio en ${content.demandante.domicilio}, teléfono ${content.demandante.telefono}${content.demandante.email ? ` y correo electrónico ${content.demandante.email}` : ''}, ante el TRIBUNAL DE INSTANCIA comparezco y como mejor en Derecho proceda, DIGO:`;
      paragraphs.push(
        new Paragraph({
          text: demandanteText,
          spacing: { after: 200 },
        })
      );
    }

    // HECHOS
    if (content.hechos) {
      paragraphs.push(
        new Paragraph({
          text: 'H E C H O S',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      );

      if (content.hechos.primer) {
        paragraphs.push(
          new Paragraph({
            text: `PRIMERO.- Que la trabajadora está contratada a jornada ${content.hechos.primer.jornada} con un coeficiente de parcialidad de ${content.hechos.primer.coeficienteParcialidad} realizando tareas de ${content.hechos.primer.tareas} con una antigüedad de ${content.hechos.primer.antiguedad}, y un contrato ${content.hechos.primer.duracion}.`,
            spacing: { after: 200 },
          })
        );
      }

      if (content.hechos.segundo) {
        paragraphs.push(
          new Paragraph({
            text: 'SEGUNDO.- Que de la citada relación laboral la empresa le adeuda las siguientes cantidades:',
            spacing: { after: 200 },
          })
        );
        if (content.hechos.segundo.cantidadesAdeudadas) {
          content.hechos.segundo.cantidadesAdeudadas.forEach((cantidad: string) => {
            paragraphs.push(
              new Paragraph({
                text: `• ${cantidad}`,
                indent: { left: 400 },
                spacing: { after: 100 },
              })
            );
          });
        }
      }
    }

    // FUNDAMENTOS DE DERECHO
    if (content.fundamentos) {
      paragraphs.push(
        new Paragraph({
          text: 'F U N D A M E N T O S  D E  D E R E C H O',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      );

      if (content.fundamentos.primero) {
        paragraphs.push(
          new Paragraph({
            text: `I.- ${content.fundamentos.primero}`,
            spacing: { after: 200 },
          })
        );
      }
      if (content.fundamentos.segundo) {
        paragraphs.push(
          new Paragraph({
            text: `II.- ${content.fundamentos.segundo}`,
            spacing: { after: 200 },
          })
        );
      }
      if (content.fundamentos.tercero) {
        paragraphs.push(
          new Paragraph({
            text: `III.- ${content.fundamentos.tercero}`,
            spacing: { after: 200 },
          })
        );
      }
      if (content.fundamentos.cuarto) {
        paragraphs.push(
          new Paragraph({
            text: `IV.- ${content.fundamentos.cuarto}`,
            spacing: { after: 200 },
          })
        );
      }
    }

    // PETITORIO
    if (content.petitorio) {
      paragraphs.push(
        new Paragraph({
          text: 'P E T I T O R I O',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `Por todo lo expuesto, al TRIBUNAL DE INSTANCIA, SUPLICO:`,
          spacing: { after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `1. Que tenga por presentado este escrito, con los documentos que se acompañan, y se sirva admitirlo a trámite.`,
          spacing: { after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `2. Que, previos los trámites legales oportunos, dicte sentencia por la que se condene a la empresa demandada al pago de la cantidad de ${content.petitorio.cantidadReclamada}, más los intereses legales correspondientes desde la fecha de interposición de la demanda hasta su completo pago.`,
          spacing: { after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `3. Que se condene en costas a la parte demandada.`,
          spacing: { after: 200 },
        })
      );
    }

    // OTROSÍ
    if (content.otrosi) {
      paragraphs.push(
        new Paragraph({
          text: 'O T R O S Í  D I G O',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `PRIMERO.- Que esta parte comparece asistida de Letrado y representada por Procurador.`,
          spacing: { after: 200 },
        })
      );

      if (content.otrosi.mediosPrueba?.documental) {
        paragraphs.push(
          new Paragraph({
            text: `SEGUNDO.- Que se proponen los siguientes medios de prueba:`,
            spacing: { after: 200 },
          })
        );
        content.otrosi.mediosPrueba.documental.forEach((medio: string) => {
          paragraphs.push(
            new Paragraph({
              text: `• ${medio}`,
              indent: { left: 400 },
              spacing: { after: 100 },
            })
          );
        });
      }
    }

    // Lugar y fecha
    if (content.petitorio?.lugar && content.petitorio?.fecha) {
      paragraphs.push(
        new Paragraph({
          text: `En ${content.petitorio.lugar}, a ${content.petitorio.fecha}.`,
          spacing: { before: 400, after: 200 },
        })
      );
    }

    // Firma
    paragraphs.push(
      new Paragraph({
        text: 'Fdo.: [Firma del Letrado/a]',
        spacing: { after: 100 },
      })
    );
    paragraphs.push(
      new Paragraph({
        text: 'Fdo.: [Firma del Procurador/a]',
      })
    );

    // Crear documento Word
    const wordDoc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    // Generar buffer
    const buffer = await Packer.toBuffer(wordDoc);
    const filename = document?.filename?.replace('.pdf', '.docx') || `documento-${docId}.docx`;

    console.log(`✅ Documento Word generado: ${buffer.length} bytes`);

    // Devolver Word
    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('❌ Error generando Word:', error);
    return NextResponse.json(
      { error: 'Error generando documento Word', details: error.message },
      { status: 500 }
    );
  }
}

