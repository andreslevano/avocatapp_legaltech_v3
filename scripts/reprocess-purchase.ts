#!/usr/bin/env ts-node

/**
 * Script to reprocess existing purchases and generate missing documents
 * 
 * Usage:
 *   ts-node scripts/reprocess-purchase.ts [purchaseId]
 *   ts-node scripts/reprocess-purchase.ts --all
 *   ts-node scripts/reprocess-purchase.ts --status pending
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { db, storage } from '../src/lib/firebase-admin';
import { getOpenAIClient } from '../src/lib/openai-client';
import { renderStudyMaterialPDF } from '../src/lib/pdf/study-material';
import { renderWordDocument } from '../src/lib/pdf/word-generator';
import { v4 as uuidv4 } from 'uuid';

interface GeneratedPackageFile {
  path?: string;
  downloadUrl: string;
  storagePath?: string;
  contentType?: string;
  size?: number;
  token?: string;
}

interface PurchaseItem {
  id: string;
  name: string;
  area: string;
  country: string;
  price: number;
  quantity: number;
  status?: string;
  downloadUrl?: string;
  storagePath?: string;
  documentId?: string;
  packageFiles?: {
    templateDocx?: GeneratedPackageFile;
    templatePdf?: GeneratedPackageFile;
    sampleDocx?: GeneratedPackageFile;
    samplePdf?: GeneratedPackageFile;
    studyMaterialPdf?: GeneratedPackageFile;
  };
  documents?: Array<{
    documentId: string;
    storagePath: string;
    downloadUrl: string;
    generatedAt: Date;
  }>;
  error?: string;
}

interface Purchase {
  id: string;
  userId: string;
  customerEmail: string;
  items: PurchaseItem[];
  status: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Generates a template document (blank with placeholders)
 */
async function generateTemplate(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear plantillas legales profesionales. 
Genera plantillas vacías con marcadores de posición [PLACEHOLDER] que los estudiantes puedan completar.
Las plantillas deben ser documentos oficiales completos con estructura profesional, capítulos, párrafos y referencias legales.`;

  const userPrompt = `Genera una plantilla completa y profesional para "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.) y párrafos
3. Incluir secciones de:
   - Encabezado con datos del solicitante (con placeholders [NOMBRE], [DNI], [DIRECCIÓN], etc.)
   - Fundamentos jurídicos con referencias a leyes específicas (usar [LEY X/YYYY] como placeholder)
   - Hechos y antecedentes estructurados
   - Justificaciones legales con citas a artículos (usar [ART. X] como placeholder)
   - Peticiones concretas numeradas
   - Referencias normativas completas al final

4. Usar marcadores de posición claros: [NOMBRE], [DNI], [DIRECCIÓN], [FECHA], [CIUDAD], [ART. X], [LEY X/YYYY], etc.
5. Incluir instrucciones breves entre paréntesis cuando sea necesario
6. Mantener formato legal profesional con estructura de documento oficial
7. Incluir referencias a normativas aplicables (Código Civil, Ley de Enjuiciamiento Civil, etc.) con placeholders
8. Estructurar con párrafos numerados y subsecciones cuando corresponda

FORMATO: Documento legal oficial estructurado con capítulos, párrafos y placeholders. Mínimo 4 páginas de contenido completo.`;

  console.log(`  📝 Generando plantilla: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 6000
  });

  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Plantilla`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Generates a sample document (filled example)
 */
async function generateSample(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear ejemplos prácticos de documentos legales. 
Genera documentos completos con datos de ejemplo realistas pero ficticios, incluyendo contenido legal completo, justificaciones y referencias normativas.`;

  const userPrompt = `Genera un ejemplo completo y práctico de "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo y detallado
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.) y párrafos estructurados
3. Contenido legal completo que incluya:
   - Encabezado completo con datos ficticios pero realistas (ej: "Juan Pérez García", DNI, dirección)
   - Fundamentos jurídicos DETALLADOS con referencias específicas a leyes reales (ej: Ley 1/2000, Código Civil art. 1902, etc.)
   - Hechos y antecedentes NARRADOS de forma completa y coherente
   - Justificaciones legales EXTENSAS con citas a artículos específicos y jurisprudencia relevante
   - Peticiones concretas y detalladas numeradas
   - Referencias normativas completas al final con leyes, artículos y disposiciones aplicables

4. Usar nombres ficticios realistas: "Juan Pérez García", "María López Martínez", "Empresa ABC S.L.", etc.
5. Incluir datos coherentes y realistas (DNIs, direcciones, fechas, cantidades)
6. Referencias a normativas ESPECÍFICAS y REALES del ordenamiento jurídico español
7. Justificaciones legales COMPLETAS que expliquen por qué cada petición es procedente
8. Estructura profesional con párrafos numerados, subsecciones y formato de documento oficial

FORMATO: Documento legal oficial completo con capítulos, párrafos, referencias legales y justificaciones. Mínimo 4 páginas de contenido completo y profesional.`;

  console.log(`  📋 Generando ejemplo: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 6000
  });

  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Ejemplo`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Generates a study material document for a purchased item
 */
async function generateStudyMaterial(
  documentName: string,
  area: string,
  country: string
): Promise<{ content: string; pdfBuffer: Buffer }> {
  const openaiClient = getOpenAIClient();
  
  const systemPrompt = `Eres un experto en derecho español especializado en crear materiales de estudio para estudiantes de derecho. 
Genera documentos educativos completos, bien estructurados y profesionales que sirvan como guías de estudio exhaustivas.`;

  const userPrompt = `Genera un material de estudio completo y exhaustivo sobre "${documentName}" en el área de "${area}" para la jurisdicción de "${country}".

REQUISITOS OBLIGATORIOS:
1. MÍNIMO 4 PÁGINAS de contenido completo y detallado
2. Estructura oficial con CAPÍTULOS numerados (I., II., III., etc.), párrafos y TABLAS cuando corresponda

ESTRUCTURA OBLIGATORIA:

CAPÍTULO I. INTRODUCCIÓN Y CONTEXTO LEGAL
- Introducción al documento y su importancia en el ordenamiento jurídico
- Contexto histórico y evolución normativa
- Ámbito de aplicación

CAPÍTULO II. MARCO NORMATIVO APLICABLE
- Leyes principales aplicables (con referencias específicas a artículos)
- Reglamentos y disposiciones complementarias
- Jurisprudencia relevante del Tribunal Supremo y tribunales superiores
- Referencias a normativas europeas si aplica

CAPÍTULO III. ESTRUCTURA Y ELEMENTOS DEL DOCUMENTO
- Estructura oficial del documento con explicación de cada sección
- Elementos obligatorios y opcionales
- Formato y presentación requerida

CAPÍTULO IV. PROCEDIMIENTO Y ADMINISTRACIONES COMPETENTES
- TABLA OBLIGATORIA con:
  * Órganos/Administraciones públicas competentes para tramitar el procedimiento
  * Tipo de profesionales que participan (jueces, secretarios, procuradores, abogados, etc.)
  * Plazos y deadlines específicos del procedimiento
  * Tipo de respuesta estándar desde la perspectiva del abogado
  * Instancias y recursos disponibles

CAPÍTULO V. RECURSOS Y REFERENCIAS ADICIONALES
- Referencias a sitios web públicos oficiales relevantes (BOE, páginas de ministerios, tribunales, colegios profesionales)
- Enlaces a bases de datos jurídicas públicas
- Recursos de formación y actualización normativa
- Bibliografía recomendada

CAPÍTULO VI. EJEMPLO PRÁCTICO Y CASOS
- Ejemplo práctico completo con explicación paso a paso
- Casos comunes y cómo resolverlos
- Errores frecuentes a evitar

CAPÍTULO VII. PUNTOS CLAVE Y CHECKLIST
- Puntos clave a recordar
- Checklist para verificar que el documento está completo
- Consejos prácticos para estudiantes

FORMATO: Documento estructurado profesionalmente con capítulos, párrafos numerados, tablas formateadas y referencias. Mínimo 4 páginas de contenido completo. Las tablas deben estar claramente formateadas y ser legibles.`;

  console.log(`  📚 Generando material de estudio: ${documentName}`);
  
  const result = await openaiClient.generateContent(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 8000
  });

  // Generate PDF from content
  const pdfBuffer = await renderStudyMaterialPDF({
    title: `${documentName} - Material de Estudio`,
    area,
    country,
    content: result.content
  });

  return { content: result.content, pdfBuffer };
}

/**
 * Processes a single purchase
 */
async function processPurchase(purchase: Purchase): Promise<void> {
  console.log(`\n📦 Procesando compra: ${purchase.id}`);
  console.log(`   Usuario: ${purchase.userId}`);
  console.log(`   Email: ${purchase.customerEmail}`);
  console.log(`   Items: ${purchase.items.length}`);
  
  const purchaseRef = db().collection('purchases').doc(purchase.id);
  const updatedItems: PurchaseItem[] = [];
  
  for (const item of purchase.items) {
    // Check if all required documents are already generated (including Word versions)
    const hasAllDocuments = item.packageFiles?.templatePdf?.downloadUrl && 
                            item.packageFiles?.templateDocx?.downloadUrl &&
                            item.packageFiles?.samplePdf?.downloadUrl && 
                            item.packageFiles?.sampleDocx?.downloadUrl &&
                            item.packageFiles?.studyMaterialPdf?.downloadUrl;
    
    if (hasAllDocuments && item.status === 'completed') {
      console.log(`  ⏭️  Item "${item.name}" ya tiene todos los documentos generados (incluyendo Word), omitiendo...`);
      updatedItems.push(item);
      continue;
    }
    
    // If missing some documents (especially Word versions), regenerate all to ensure consistency
    if (item.status === 'completed' && !hasAllDocuments) {
      const missing = [];
      if (!item.packageFiles?.templatePdf?.downloadUrl) missing.push('Template PDF');
      if (!item.packageFiles?.templateDocx?.downloadUrl) missing.push('Template Word');
      if (!item.packageFiles?.samplePdf?.downloadUrl) missing.push('Sample PDF');
      if (!item.packageFiles?.sampleDocx?.downloadUrl) missing.push('Sample Word');
      if (!item.packageFiles?.studyMaterialPdf?.downloadUrl) missing.push('Study Material PDF');
      console.log(`  🔄 Item "${item.name}" tiene documentos incompletos (faltan: ${missing.join(', ')}), regenerando todos...`);
    }
    
    try {
      console.log(`  📄 Generando documento: ${item.name} (x${item.quantity})`);
      
      const generatedDocuments = [];
      
      // Generate all 3 document types for each quantity
      for (let i = 0; i < item.quantity; i++) {
        const packageFiles: any = {};
        
        // Helper function to save file and get URL
        const saveFile = async (
          buffer: Buffer, 
          docType: string, 
          extension: 'pdf' | 'docx',
          content: string
        ): Promise<{ docId: string; storagePath: string; downloadUrl: string }> => {
          const docId = uuidv4();
          const storagePath = `users/${purchase.userId}/documents/${docId}.${extension}`;
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';
          const bucket = storage().bucket(bucketName);
          const file = bucket.file(storagePath);
        
          const contentType = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          
          // Create a clean filename for identification
          const cleanName = item.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
          
          await file.save(buffer, {
            contentType,
            metadata: {
              userId: purchase.userId,
              documentName: item.name,
              documentType: docType,
              documentFormat: extension,
              area: item.area || 'Derecho General',
              country: item.country || 'España',
              purchaseId: purchase.id,
              purchaseDate: purchase.createdAt?.toDate?.()?.toISOString() || 
                           (purchase.createdAt instanceof Date ? purchase.createdAt.toISOString() : new Date().toISOString()),
              itemId: item.id,
              generatedAt: new Date().toISOString(),
              displayName: `${item.name} - ${docType === 'template' ? 'Plantilla' : docType === 'sample' ? 'Ejemplo' : 'Material de Estudio'}`,
              fileName: `${cleanName}-${docType}.${extension}`
            }
          });

          console.log(`    ✅ ${docType} (${extension.toUpperCase()}) guardado: ${storagePath}`);

          // Generate signed URL (valid for 7 days - max allowed)
          const [downloadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days (max allowed)
          });

          return { docId, storagePath, downloadUrl };
        };

        // Generate Template (PDF + Word)
        try {
          const { content: templateContent, pdfBuffer: templatePdfBuffer } = await generateTemplate(
            item.name,
            item.area || 'Derecho General',
            item.country || 'España'
          );
          
          // Save PDF
          const templatePdfFile = await saveFile(templatePdfBuffer, 'template', 'pdf', templateContent);
          packageFiles.templatePdf = {
            downloadUrl: templatePdfFile.downloadUrl,
            storagePath: templatePdfFile.storagePath
          };
          
          // Generate and save Word
          const templateWordBuffer = await renderWordDocument({
            title: item.name,
            area: item.area || 'Derecho General',
            country: item.country || 'España',
            content: templateContent,
            type: 'template'
          });
          const templateWordFile = await saveFile(templateWordBuffer, 'template', 'docx', templateContent);
          packageFiles.templateDocx = {
            downloadUrl: templateWordFile.downloadUrl,
            storagePath: templateWordFile.storagePath
          };
        } catch (error) {
          console.error(`    ❌ Error generando plantilla:`, error);
        }

        // Generate Sample (PDF + Word)
        try {
          const { content: sampleContent, pdfBuffer: samplePdfBuffer } = await generateSample(
            item.name,
            item.area || 'Derecho General',
            item.country || 'España'
          );
          
          // Save PDF
          const samplePdfFile = await saveFile(samplePdfBuffer, 'sample', 'pdf', sampleContent);
          packageFiles.samplePdf = {
            downloadUrl: samplePdfFile.downloadUrl,
            storagePath: samplePdfFile.storagePath
          };
          
          // Generate and save Word
          const sampleWordBuffer = await renderWordDocument({
            title: item.name,
            area: item.area || 'Derecho General',
            country: item.country || 'España',
            content: sampleContent,
            type: 'sample'
          });
          const sampleWordFile = await saveFile(sampleWordBuffer, 'sample', 'docx', sampleContent);
          packageFiles.sampleDocx = {
            downloadUrl: sampleWordFile.downloadUrl,
            storagePath: sampleWordFile.storagePath
          };
        } catch (error) {
          console.error(`    ❌ Error generando ejemplo:`, error);
        }

        // Generate Study Material (PDF only - no Word needed)
        try {
          const { content: studyContent, pdfBuffer: studyBuffer } = await generateStudyMaterial(
            item.name,
            item.area || 'Derecho General',
            item.country || 'España'
          );
          const studyFile = await saveFile(studyBuffer, 'studyMaterial', 'pdf', studyContent);
          packageFiles.studyMaterialPdf = {
            downloadUrl: studyFile.downloadUrl,
            storagePath: studyFile.storagePath
          };
        } catch (error) {
          console.error(`    ❌ Error generando material de estudio:`, error);
        }

        // Use study material as the main document (for backward compatibility)
        const mainDoc = packageFiles.studyMaterialPdf || packageFiles.samplePdf || packageFiles.templatePdf;
        
        generatedDocuments.push({
          documentId: mainDoc?.storagePath.split('/').pop()?.replace('.pdf', '') || uuidv4(),
          storagePath: mainDoc?.storagePath || '',
          downloadUrl: mainDoc?.downloadUrl || '',
          generatedAt: new Date(),
          packageFiles // Store packageFiles in the document
        });
      }

      // Get packageFiles from first document
      const firstDocPackageFiles = generatedDocuments.length > 0 && (generatedDocuments[0] as any).packageFiles 
        ? (generatedDocuments[0] as any).packageFiles 
        : {};

      updatedItems.push({
        ...item,
        packageFiles: firstDocPackageFiles,
        documentId: generatedDocuments[0]?.documentId,
        storagePath: generatedDocuments[0]?.storagePath,
        downloadUrl: generatedDocuments[0]?.downloadUrl,
        status: 'completed',
        documents: generatedDocuments
      });
      
      console.log(`  ✅ Documento generado exitosamente para: ${item.name}`);
    } catch (error) {
      console.error(`  ❌ Error generando documento ${item.name}:`, error);
      updatedItems.push({
        ...item,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update purchase with generated documents
  const documentsGenerated = updatedItems.filter(item => item.status === 'completed').length;
  const documentsFailed = updatedItems.filter(item => item.status === 'failed').length;
  
  await purchaseRef.update({
    items: updatedItems,
    updatedAt: new Date(),
    documentsGenerated,
    documentsFailed,
    reprocessedAt: new Date()
  });

  console.log(`\n✅ Compra procesada: ${purchase.id}`);
  console.log(`   Documentos generados: ${documentsGenerated}`);
  console.log(`   Documentos fallidos: ${documentsFailed}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      console.log('📋 Uso:');
      console.log('  ts-node scripts/reprocess-purchase.ts <purchaseId>  - Procesar una compra específica');
      console.log('  ts-node scripts/reprocess-purchase.ts --all        - Procesar todas las compras sin documentos');
      console.log('  ts-node scripts/reprocess-purchase.ts --status <status> - Procesar compras con un status específico');
      process.exit(1);
    }

    if (args[0] === '--all') {
      // Find all purchases without generated documents
      console.log('🔍 Buscando compras sin documentos generados...');
      const snapshot = await db().collection('purchases')
        .where('status', '==', 'completed')
        .get();
      
      const purchasesToProcess: Purchase[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Purchase;
        const hasMissingDocuments = data.items?.some(
          (item: PurchaseItem) => !item.downloadUrl || !item.storagePath || item.status !== 'completed'
        );
        
        if (hasMissingDocuments) {
          purchasesToProcess.push({ ...data, id: doc.id });
        }
      });
      
      console.log(`📊 Encontradas ${purchasesToProcess.length} compras para procesar\n`);
      
      for (const purchase of purchasesToProcess) {
        await processPurchase(purchase);
      }
      
      console.log(`\n✅ Procesamiento completado. Total: ${purchasesToProcess.length} compras`);
      
    } else if (args[0] === '--status') {
      const status = args[1] || 'completed';
      console.log(`🔍 Buscando compras con status: ${status}...`);
      
      const snapshot = await db().collection('purchases')
        .where('status', '==', status)
        .get();
      
      const purchases: Purchase[] = [];
      snapshot.forEach((doc) => {
        purchases.push({ ...doc.data() as Purchase, id: doc.id });
      });
      
      console.log(`📊 Encontradas ${purchases.length} compras\n`);
      
      for (const purchase of purchases) {
        await processPurchase(purchase);
      }
      
      console.log(`\n✅ Procesamiento completado. Total: ${purchases.length} compras`);
      
    } else {
      // Process specific purchase
      const purchaseId = args[0];
      console.log(`🔍 Buscando compra: ${purchaseId}...`);
      
      const purchaseDoc = await db().collection('purchases').doc(purchaseId).get();
      
      if (!purchaseDoc.exists) {
        console.error(`❌ Compra no encontrada: ${purchaseId}`);
        process.exit(1);
      }
      
      const purchase = { ...purchaseDoc.data() as Purchase, id: purchaseDoc.id };
      await processPurchase(purchase);
    }
    
  } catch (error) {
    console.error('❌ Error procesando compras:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

