import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId es requerido'
      }, { status: 400 });
    }
    
    console.log('📋 Obteniendo historial de compras para userId:', userId);
    console.log('🔍 Buscando documentos con:', {
      userId,
      type: 'reclamacion_cantidades',
      collection: 'documents'
    });
    
    // Obtener documentos de reclamación de cantidades del usuario
    // Nota: Si no hay índice para orderBy, lo haremos en memoria
    let documentsSnapshot;
    try {
      documentsSnapshot = await db()
        .collection('documents')
        .where('userId', '==', userId)
        .where('type', '==', 'reclamacion_cantidades')
        .orderBy('createdAt', 'desc')
        .get();
      
      console.log(`✅ Documentos encontrados con orderBy: ${documentsSnapshot.size}`);
    } catch (orderByError: any) {
      // Si falla orderBy (no hay índice), obtener sin ordenar y ordenar en memoria
      console.warn('⚠️ No se pudo ordenar por createdAt, ordenando en memoria:', orderByError.message);
      const unsortedSnapshot = await db()
        .collection('documents')
        .where('userId', '==', userId)
        .where('type', '==', 'reclamacion_cantidades')
        .get();
      
      console.log(`✅ Documentos encontrados sin orderBy: ${unsortedSnapshot.size}`);
      
      // Ordenar en memoria por createdAt
      const sortedDocs = unsortedSnapshot.docs.sort((a, b) => {
        const dateA = a.data().createdAt || a.data().createdAtISO || '';
        const dateB = b.data().createdAt || b.data().createdAtISO || '';
        return dateB.localeCompare(dateA); // Descendente
      });
      
      documentsSnapshot = {
        docs: sortedDocs,
        empty: sortedDocs.length === 0,
        size: sortedDocs.length
      } as any;
    }
    
    console.log(`📄 Total de documentos encontrados: ${documentsSnapshot.size || documentsSnapshot.docs?.length || 0}`);
    
    // Log detallado de documentos encontrados
    if (documentsSnapshot.docs && documentsSnapshot.docs.length > 0) {
      console.log('📋 Documentos encontrados:');
      documentsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. docId: ${doc.id}`, {
          userId: data.userId,
          type: data.type,
          status: data.status,
          paid: data.pricing?.paid,
          createdAt: data.createdAt || data.createdAtISO,
          hasStorage: !!data.storage?.storagePath
        });
      });
    } else {
      console.warn('⚠️ No se encontraron documentos. Verificando consulta...');
      // Intentar una consulta más amplia para debug
      const debugSnapshot = await db()
        .collection('documents')
        .where('userId', '==', userId)
        .get();
      console.log(`🔍 Consulta sin filtro de tipo: ${debugSnapshot.size} documentos encontrados`);
      if (debugSnapshot.size > 0) {
        debugSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`  - docId: ${doc.id}, type: ${data.type}, userId: ${data.userId}`);
        });
      }
    }
    
    // Obtener compras relacionadas
    let purchasesSnapshot;
    try {
      purchasesSnapshot = await db()
        .collection('purchases')
        .where('userId', '==', userId)
        .where('documentType', '==', 'reclamacion_cantidades')
        .orderBy('purchaseDate', 'desc')
        .get();
    } catch (purchaseOrderByError: any) {
      console.warn('⚠️ No se pudo ordenar purchases por purchaseDate, obteniendo sin ordenar:', purchaseOrderByError.message);
      purchasesSnapshot = await db()
        .collection('purchases')
        .where('userId', '==', userId)
        .where('documentType', '==', 'reclamacion_cantidades')
        .get();
    }
    
    // Crear un mapa de compras por docId para facilitar la búsqueda
    const purchasesMap = new Map();
    purchasesSnapshot.docs.forEach(doc => {
      const purchase = doc.data();
      if (purchase.docId) {
        purchasesMap.set(purchase.docId, purchase);
      }
    });
    
    // Combinar documentos y compras
    const historyItems = (documentsSnapshot.docs || []).map(doc => {
      const document = doc.data();
      const purchase = purchasesMap.get(doc.id) || null;
      
      // Determinar si está pagado
      // Un documento está "completado" si:
      // 1. Tiene pricing.paid = true, O
      // 2. Existe una compra relacionada, O
      // 3. El documento tiene status = 'completed' y tiene storage (fue generado exitosamente)
      const isPaid = document.pricing?.paid === true || purchase !== null;
      const isGenerated = document.status === 'completed' && document.storage?.storagePath;
      const status = (isPaid || isGenerated) ? 'completed' : 'pending';
      
      // Extraer cantidad reclamada del contenido generado
      let amountClaimed: number | undefined = undefined;
      try {
        if (document.content?.generatedContent?.petitorio?.cantidadReclamada) {
          const cantidadStr = document.content.generatedContent.petitorio.cantidadReclamada;
          // Limpiar y convertir a número
          const cleaned = cantidadStr.replace(/[^\d,.-]/g, '').replace(',', '.');
          amountClaimed = parseFloat(cleaned);
          if (isNaN(amountClaimed)) amountClaimed = undefined;
        }
      } catch (e) {
        console.warn('⚠️ Error extrayendo cantidad reclamada:', e);
      }
      
      // Helper para convertir fechas de Firestore
      const convertFirestoreDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          return dateValue.toDate();
        }
        if (typeof dateValue === 'string' || typeof dateValue === 'number') {
          return new Date(dateValue);
        }
        return new Date();
      };

      // Extraer contenido del documento para mostrar en el historial
      let documentContent = '';
      let uploadedDocuments: string[] = [];
      
      try {
        // Obtener contenido generado
        if (document.content?.generatedContent) {
          const content = document.content.generatedContent;
          // Construir texto del documento desde el contenido generado
          if (content.demandante && content.demandada) {
            documentContent = `DON/DOÑA ${content.demandante.nombre}, con DNI nº ${content.demandante.dni}, domicilio en ${content.demandante.domicilio}, teléfono ${content.demandante.telefono}${content.demandante.email ? `, correo electrónico ${content.demandante.email}` : ''}, ante el TRIBUNAL DE INSTANCIA comparezco y como mejor en Derecho proceda, DIGO:\n\n`;
            documentContent += `Que mediante el presente escrito y en la representación que ostento, de conformidad con lo dispuesto en los artículos 399 de la Ley de Enjuiciamiento Civil, paso a interponer DEMANDA DE JUICIO DECLARATIVO ORDINARIO en ejercicio de la acción de reclamación de cantidades frente a ${content.demandada.nombre} con CIF ${content.demandada.cif}, a citar en la persona de su representante legal, con sede social a efecto de notificaciones sita en ${content.demandada.domicilio}, a fin de que se avenga a reconocer los siguientes\n\n`;
            
            if (content.hechos) {
              documentContent += 'H E C H O S\n\n';
              if (content.hechos.primer) {
                documentContent += `PRIMERO.- Que la trabajadora está contratada a jornada ${content.hechos.primer.jornada} con un coeficiente de parcialidad de ${content.hechos.primer.coeficienteParcialidad} realizando tareas de ${content.hechos.primer.tareas} con una antigüedad de ${content.hechos.primer.antiguedad}, y un contrato ${content.hechos.primer.duracion}.\n`;
                documentContent += `Su salario es de ${content.hechos.primer.salario} al mes con las pagas extras prorrateadas. El convenio colectivo de aplicación a la relación laboral es de ${content.hechos.primer.convenio}.\n\n`;
              }
              if (content.hechos.segundo && content.hechos.segundo.cantidadesAdeudadas) {
                documentContent += `SEGUNDO.- Que de la citada relación laboral la empresa le adeuda las siguientes cantidades:\n`;
                content.hechos.segundo.cantidadesAdeudadas.forEach((cantidad: string) => {
                  documentContent += `• ${cantidad}\n`;
                });
                if (content.hechos.segundo.interesDemora) {
                  documentContent += `Todos estos importes salariales deberán incrementarse con el 10% del interés demora del artículo 29 del Estatuto de los Trabajadores\n\n`;
                }
              }
            }
          }
        }
        
        // Obtener documentos subidos desde inputData
        if (document.content?.inputData?.ocrFiles) {
          uploadedDocuments = document.content.inputData.ocrFiles.map((file: any) => file.originalName || 'Documento sin nombre');
        }
      } catch (e) {
        console.warn('⚠️ Error extrayendo contenido del documento:', e);
      }

      const item = {
        id: doc.id,
        userId: document.userId || userId,
        documentTitle: document.filename || `Reclamación de Cantidades - ${new Date(document.createdAt || document.createdAtISO || Date.now()).toLocaleDateString('es-ES')}`,
        documentType: 'reclamacion_cantidades' as const,
        purchaseDate: purchase?.purchaseDate 
          ? convertFirestoreDate(purchase.purchaseDate)
          : new Date(document.createdAt || document.createdAtISO || Date.now()),
        price: document.pricing?.cost || (purchase?.price || parseFloat(process.env.STRIPE_RECLAMACION_UNIT_AMOUNT || '1999') / 100),
        currency: document.pricing?.currency || purchase?.currency || 'EUR',
        status: status,
        documentCount: document.metadata?.ocrFiles || document.metadata?.documentCount || 1, // Usar el número real de documentos
        accuracy: document.metadata?.confidence ? Math.round(document.metadata.confidence * 100) : (document.metadata?.ocrFiles ? 85 : 0),
        amountClaimed: amountClaimed,
        files: {
          pdfUrl: document.storage?.downloadUrl || undefined,
          wordUrl: undefined
        },
        emailSent: isPaid && purchase?.emailSent === true,
        emailSentAt: purchase?.emailSentAt ? convertFirestoreDate(purchase.emailSentAt) : undefined,
        // Campos adicionales para identificar si está pagado
        paid: isPaid,
        docId: doc.id,
        // Nuevos campos: contenido del documento y documentos subidos
        documentContent: documentContent,
        uploadedDocuments: uploadedDocuments
      };
      
      console.log(`📋 Item procesado:`, {
        docId: doc.id,
        title: item.documentTitle,
        userId: item.userId,
        status: item.status,
        paid: item.paid,
        isPaid: isPaid,
        isGenerated: isGenerated,
        hasStorage: !!document.storage?.storagePath,
        hasPurchase: !!purchase
      });
      
      return item;
    });
    
    const elapsedMs = Date.now() - startTime;
    
    console.log(`✅ Historial obtenido: ${historyItems.length} documentos`, {
      requestId,
      totalItems: historyItems.length,
      elapsedMs
    });
    
    return NextResponse.json({
      success: true,
      data: historyItems
    });
    
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error('❌ Error obteniendo historial:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Devolver un array vacío en lugar de error para que el frontend no se rompa
    // El frontend puede manejar un array vacío y mostrar un mensaje apropiado
    return NextResponse.json(
      {
        success: true,
        data: [],
        warning: {
          code: 'HISTORY_FAILED',
          message: 'Error obteniendo el historial',
          hint: error.message || 'Intenta de nuevo o contacta soporte'
        }
      },
      { status: 200 } // Devolver 200 para que el frontend pueda manejar el array vacío
    );
  }
}
