import { createWorker } from 'tesseract.js';
import { DocumentoOCR, DocumentoOCRSchema } from './validate-reclamacion';

export interface OCRResult {
  contenido: string;
  precision: number;
  cantidadDetectada?: number;
  fechaDetectada?: string;
  tipoDocumento?: 'factura' | 'albaran' | 'contrato' | 'presupuesto' | 'otro';
}

export async function analyzeDocumentOCR(fileBuffer: Buffer | Uint8Array, filename: string): Promise<OCRResult> {
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // En servidor, usar pdf-parse para extraer texto de PDFs
    try {
      // Verificar si es un PDF
      const isPDF = filename.toLowerCase().endsWith('.pdf') || 
                    fileBuffer.toString('utf8', 0, 4) === '%PDF';
      
      if (isPDF) {
        console.log(`📄 Extrayendo texto de PDF: ${filename}`);
        
        try {
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const pdfData = await pdfParse(fileBuffer);
          const contenido = pdfData.text.trim();
          const numPages = pdfData.numpages;
          
          // Calcular precisión basada en la cantidad de texto extraído
          // Si hay mucho texto, asumimos alta precisión (PDF con texto)
          // Si hay poco texto, puede ser un PDF escaneado (baja precisión)
          const precision = contenido.length > 100 ? 85 : 30;
          
          console.log(`✅ Texto extraído de PDF: ${contenido.length} caracteres, ${numPages} páginas`);
          
          // Detectar cantidad monetaria
          const cantidadDetectada = detectarCantidad(contenido);
          
          // Detectar fecha
          const fechaDetectada = detectarFecha(contenido);
          
          // Detectar tipo de documento
          const tipoDocumento = detectarTipoDocumento(contenido, filename);
          
          return {
            contenido: contenido || `[Documento PDF: ${filename}]`,
            precision,
            cantidadDetectada,
            fechaDetectada,
            tipoDocumento
          };
        } catch (pdfError: any) {
          console.warn(`⚠️ Error extrayendo texto del PDF ${filename}:`, pdfError.message);
          // Si falla pdf-parse, puede ser un PDF escaneado o corrupto
          // Devolver resultado básico
          return {
            contenido: `[PDF no procesable: ${pdfError.message}]`,
            precision: 0,
            cantidadDetectada: undefined,
            fechaDetectada: undefined,
            tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
          };
        }
      } else {
        // No es un PDF, devolver resultado básico
        console.log(`⚠️ Archivo no es PDF: ${filename}`);
        return {
          contenido: `[Documento: ${filename}]`,
          precision: 0,
          cantidadDetectada: undefined,
          fechaDetectada: undefined,
          tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
        };
      }
    } catch (error: any) {
      console.error(`❌ Error procesando documento en servidor ${filename}:`, error.message);
      return {
        contenido: `[Error procesando: ${error.message}]`,
        precision: 0,
        cantidadDetectada: undefined,
        fechaDetectada: undefined,
        tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
      };
    }
  }
  
  // En cliente, intentar extraer texto del PDF usando pdfjs-dist
  try {
    // Verificar si es un PDF
    const isPDF = filename.toLowerCase().endsWith('.pdf') || 
                  (fileBuffer instanceof Uint8Array && fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46);
    
    if (isPDF) {
      console.log(`📄 Extrayendo texto de PDF en cliente: ${filename}`);
      
      try {
        // Usar pdfjs-dist para extraer texto del PDF en el cliente
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configurar worker con CDN confiable (jsdelivr tiene mejor soporte CORS)
        if (typeof window !== 'undefined') {
          const version = pdfjsLib.version || '3.11.174';
          // Forzar uso de jsdelivr (siempre configurar, incluso si ya está configurado)
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`;
          console.log(`📦 PDF.js worker configurado: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
        }
        
        // Convertir Buffer/Uint8Array a ArrayBuffer
        // Crear una copia nueva para evitar problemas con SharedArrayBuffer
        let arrayBuffer: ArrayBuffer;
        if (fileBuffer instanceof Uint8Array) {
          // Crear un nuevo ArrayBuffer copiando los datos
          const copy = new Uint8Array(fileBuffer);
          arrayBuffer = copy.buffer;
        } else {
          // Para Buffer de Node.js o ArrayBuffer, convertir a Uint8Array primero
          const uint8 = new Uint8Array(fileBuffer as any);
          arrayBuffer = uint8.buffer;
        }
        
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true,
          verbosity: 0 // Reducir logs
        });
        const pdf = await loadingTask.promise;
        
        // Extraer texto de todas las páginas
        let contenido = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          contenido += pageText + ' ';
        }
        
        contenido = contenido.trim();
        const numPages = pdf.numPages;
        
        // Calcular precisión basada en la cantidad de texto extraído
        const precision = contenido.length > 100 ? 85 : contenido.length > 50 ? 50 : 30;
        
        console.log(`✅ Texto extraído de PDF: ${contenido.length} caracteres, ${numPages} páginas`);
        
        // Detectar cantidad monetaria
        const cantidadDetectada = detectarCantidad(contenido);
        
        // Detectar fecha
        const fechaDetectada = detectarFecha(contenido);
        
        // Detectar tipo de documento
        const tipoDocumento = detectarTipoDocumento(contenido, filename);
        
        return {
          contenido: contenido || `[Documento PDF: ${filename}]`,
          precision,
          cantidadDetectada,
          fechaDetectada,
          tipoDocumento
        };
        
      } catch (pdfError: any) {
        console.error(`❌ Error extrayendo texto del PDF ${filename} en cliente:`, pdfError);
        console.error('Detalles del error:', {
          message: pdfError.message,
          stack: pdfError.stack,
          name: pdfError.name
        });
        // Si falla, devolver resultado básico basado en nombre de archivo
        return {
          contenido: `[Error procesando PDF: ${pdfError.message || 'Error desconocido'}]`,
          precision: 0,
          cantidadDetectada: undefined,
          fechaDetectada: undefined,
          tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
        };
      }
    } else {
      // No es un PDF, intentar OCR con Tesseract si es una imagen
      console.log(`📷 Intentando OCR para imagen: ${filename}`);
      let worker: any = null;
      
      try {
        worker = await createWorker('spa', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              // Solo loggear progreso si es necesario
            }
          }
        });
        
        const { data: { text, confidence } } = await worker.recognize(fileBuffer);
        
        // Procesar el texto extraído
        const contenido = text.trim();
        const precision = Math.round(confidence);
        
        // Detectar cantidad monetaria
        const cantidadDetectada = detectarCantidad(contenido);
        
        // Detectar fecha
        const fechaDetectada = detectarFecha(contenido);
        
        // Detectar tipo de documento
        const tipoDocumento = detectarTipoDocumento(contenido, filename);
        
        return {
          contenido,
          precision,
          cantidadDetectada,
          fechaDetectada,
          tipoDocumento
        };
        
      } catch (error: any) {
        // Si el OCR falla, devolver resultado básico
        console.warn(`⚠️ Error en OCR para ${filename}, usando resultado básico:`, error.message);
        
        return {
          contenido: `[Documento: ${filename}]`,
          precision: 0,
          cantidadDetectada: undefined,
          fechaDetectada: undefined,
          tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
        };
      } finally {
        if (worker) {
          try {
            await worker.terminate();
          } catch (terminateError: any) {
            console.warn('⚠️ Error terminando worker OCR:', terminateError.message);
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error procesando documento en cliente ${filename}:`, error);
    return {
      contenido: `[Error procesando: ${error.message}]`,
      precision: 0,
      cantidadDetectada: undefined,
      fechaDetectada: undefined,
      tipoDocumento: detectarTipoDocumento(filename.toLowerCase(), filename)
    };
  }
}

export function detectarCantidad(texto: string): number | undefined {
  // Patrones para detectar cantidades monetarias
  const patrones = [
    /(?:total|importe|cantidad|precio|coste)[\s:]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€?/gi,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€/gi,
    /€\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi
  ];
  
  for (const patron of patrones) {
    const matches = [...texto.matchAll(patron)];
    if (matches.length > 0) {
      // Tomar la cantidad más alta encontrada
      const cantidades = matches.map(match => {
        const cantidad = match[1].replace(/[.,]/g, '');
        return parseFloat(cantidad.replace(/(\d{3})$/, '.$1'));
      });
      
      return Math.max(...cantidades);
    }
  }
  
  return undefined;
}

export function detectarFecha(texto: string): string | undefined {
  // Patrones para detectar fechas
  const patrones = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{2,4})/gi,
    /(\d{1,2})\s+(\w+)\s+(\d{2,4})/gi
  ];
  
  for (const patron of patrones) {
    const match = patron.exec(texto);
    if (match) {
      return match[0];
    }
  }
  
  return undefined;
}

export function detectarTipoDocumento(contenido: string, filename: string): 'factura' | 'albaran' | 'contrato' | 'presupuesto' | 'otro' {
  const texto = (contenido + ' ' + filename).toLowerCase();
  
  // Palabras clave para cada tipo de documento
  const indicadores = {
    factura: ['factura', 'invoice', 'nº', 'número', 'total', 'importe', 'iva', 'base imponible'],
    albaran: ['albarán', 'albaran', 'entrega', 'mercancía', 'pedido', 'referencia'],
    contrato: ['contrato', 'acuerdo', 'cláusula', 'condiciones', 'vigencia', 'firma'],
    presupuesto: ['presupuesto', 'presupuesto', 'oferta', 'cotización', 'válido hasta']
  };
  
  // Contar coincidencias para cada tipo
  const scores = Object.entries(indicadores).map(([tipo, palabras]) => {
    const score = palabras.reduce((acc, palabra) => {
      return acc + (texto.includes(palabra) ? 1 : 0);
    }, 0);
    return { tipo, score };
  });
  
  // Ordenar por score y devolver el tipo con mayor puntuación
  scores.sort((a, b) => b.score - a.score);
  
  return scores[0].score > 0 ? scores[0].tipo as any : 'otro';
}

export async function processMultipleDocuments(files: Array<{ buffer: Buffer; filename: string }>): Promise<DocumentoOCR[]> {
  const resultados: DocumentoOCR[] = [];
  
  for (const file of files) {
    try {
      const resultado = await analyzeDocumentOCR(file.buffer, file.filename);
      
      const documentoOCR: DocumentoOCR = {
        nombre: file.filename,
        contenido: resultado.contenido,
        precision: resultado.precision,
        cantidadDetectada: resultado.cantidadDetectada,
        fechaDetectada: resultado.fechaDetectada,
        tipoDocumento: resultado.tipoDocumento
      };
      
      // Validar con Zod
      const validation = DocumentoOCRSchema.safeParse(documentoOCR);
      if (validation.success) {
        resultados.push(validation.data);
      } else {
        console.warn(`Error validando documento OCR ${file.filename}:`, validation.error);
        // Aún así, agregar un resultado básico para que el flujo continúe
        resultados.push({
          nombre: file.filename,
          contenido: resultado.contenido || `Documento: ${file.filename}`,
          precision: resultado.precision || 0,
          cantidadDetectada: resultado.cantidadDetectada,
          fechaDetectada: resultado.fechaDetectada,
          tipoDocumento: resultado.tipoDocumento || 'otro'
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Error procesando documento ${file.filename}:`, error.message);
      // Agregar resultado básico para que el flujo continúe
      resultados.push({
        nombre: file.filename,
        contenido: `[Error procesando documento: ${error.message}]`,
        precision: 0,
        cantidadDetectada: undefined,
        fechaDetectada: undefined,
        tipoDocumento: 'otro'
      });
    }
  }
  
  return resultados;
}
