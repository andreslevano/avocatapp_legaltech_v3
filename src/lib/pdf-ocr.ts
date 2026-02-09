/**
 * Extrae texto de un archivo PDF usando pdf-parse
 * @param fileBuffer - Buffer del archivo PDF
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPDF(fileBuffer: Buffer | Uint8Array): Promise<string> {
  try {
    // Importación dinámica para evitar problemas con SSR
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    
    // Convertir Uint8Array a Buffer si es necesario
    const buffer = Buffer.isBuffer(fileBuffer) 
      ? fileBuffer 
      : Buffer.from(fileBuffer);
    
    // Extraer texto del PDF
    const data = await pdfParse(buffer);
    
    return data.text || '';
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error('No se pudo extraer texto del PDF. Asegúrate de que el archivo sea un PDF válido.');
  }
}

/**
 * Extrae información específica de facturas (cantidades, fechas, deudor)
 * @param pdfText - Texto extraído del PDF
 * @returns Información estructurada
 */
export function extractInvoiceInfo(pdfText: string): {
  amounts: number[];
  dates: string[];
  debtorName?: string;
  totalAmount?: number;
} {
  const amounts: number[] = [];
  const dates: string[] = [];
  let debtorName: string | undefined;
  
  // Extraer cantidades (euros)
  const amountRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€|€\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)|(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*EUR/gi;
  const amountMatches = pdfText.match(amountRegex);
  if (amountMatches) {
    amountMatches.forEach(match => {
      const cleanAmount = match
        .replace(/[€EUR\s]/gi, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
      }
    });
  }
  
  // Extraer fechas (formato español: DD/MM/YYYY o DD-MM-YYYY)
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dateMatches = pdfText.match(dateRegex);
  if (dateMatches) {
    dates.push(...dateMatches);
  }
  
  // Intentar extraer nombre del deudor (buscar después de palabras clave)
  const debtorKeywords = ['cliente', 'deudor', 'destinatario', 'facturado a', 'a:', 'para:'];
  for (const keyword of debtorKeywords) {
    const regex = new RegExp(`${keyword}[\\s:]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)`, 'i');
    const match = pdfText.match(regex);
    if (match && match[1]) {
      debtorName = match[1].trim();
      break;
    }
  }
  
  // Calcular total (la cantidad más grande o suma de todas)
  const totalAmount = amounts.length > 0 
    ? Math.max(...amounts) // Usar la cantidad más grande como total
    : undefined;
  
  return {
    amounts: [...new Set(amounts)], // Eliminar duplicados
    dates: [...new Set(dates)], // Eliminar duplicados
    debtorName,
    totalAmount,
  };
}



