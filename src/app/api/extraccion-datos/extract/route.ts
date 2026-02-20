import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentDataWithAI, extractMultiDocumentDataWithAI } from '@/lib/openai';
import { processInvoiceWithDocumentAI } from '@/lib/document-ai';

export const maxDuration = 300;

interface ExtractBody {
  downloadURL?: string;
  fileName: string;
  preExtractedText?: string;
  splitByPage?: boolean;
  excelStructure?: string;
  multiInvoicePerPage?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExtractBody;
    const { downloadURL, fileName, preExtractedText, splitByPage, excelStructure, multiInvoicePerPage } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName es requerido' }, { status: 400 });
    }
    if (!downloadURL && !preExtractedText) {
      return NextResponse.json(
        { error: 'downloadURL o preExtractedText son requeridos' },
        { status: 400 }
      );
    }

    const ext = fileName.toLowerCase().split('.').pop() || '';
    const isPdf = ext === 'pdf';

    let pageTexts: string[] = [];

    if (preExtractedText?.trim()) {
      pageTexts = [preExtractedText.trim()];
    } else if (downloadURL) {
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Phase A: Try Document AI Invoice Parser first for single PDFs (no split, no Pozuelo)
      if (isPdf && !splitByPage && excelStructure !== 'asesoria-pozuelo') {
        const docAiResult = await processInvoiceWithDocumentAI(buffer, fileName, 'application/pdf');
        if (docAiResult && docAiResult.fields.length >= 3) {
          return NextResponse.json(docAiResult);
        }
      }

      if (isPdf && splitByPage) {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        await parser.destroy();
        pageTexts = textResult.pages.map((p) => p.text);
        if (pageTexts.length === 0 && textResult.text) {
          pageTexts = [textResult.text];
        }
      } else if (isPdf) {
        const { default: extractTextFromPDF } = await import('@/lib/pdf-ocr');
        const text = await extractTextFromPDF(buffer);
        pageTexts = [text.trim() || `[Documento sin texto extraíble: ${fileName}]`];
      } else {
        pageTexts = [`[Documento ${fileName} - formato ${ext} no soportado para extracción de texto.]`];
      }
    }

    if (pageTexts.length === 0) {
      pageTexts = [`[Documento sin texto extraíble: ${fileName}]`];
    }

    const MAX_PAGES_SPLIT = 25;
    const pagesToProcess = pageTexts.slice(0, MAX_PAGES_SPLIT);

    if (pagesToProcess.length === 1) {
      const text = pagesToProcess[0];
      if (multiInvoicePerPage && text.trim().length > 100) {
        const multiResults = await extractMultiDocumentDataWithAI(text, fileName, '1', { excelStructure });
        if (multiResults.length > 1) {
          return NextResponse.json({
            split: true,
            totalPages: 1,
            items: multiResults.map((r, idx) => ({ ...r, pageIndex: 1, subIndex: idx + 1 })),
          });
        }
      }
      const result = await extractDocumentDataWithAI(text, fileName, { excelStructure });
      return NextResponse.json(result);
    }

    const results: Array<{
      country: string;
      documentType: string;
      emisor: string;
      receptor: string;
      fields: { key: string; value: string }[];
      pageIndex?: number;
      subIndex?: number;
    }> = [];

    for (let i = 0; i < pagesToProcess.length; i++) {
      const pageText = pagesToProcess[i];
      if (!pageText.trim() || pageText.trim().length < 20) continue;
      if (multiInvoicePerPage && pageText.trim().length > 100) {
        const multiResults = await extractMultiDocumentDataWithAI(pageText, fileName, String(i + 1), { excelStructure });
        multiResults.forEach((r, idx) =>
          results.push({ ...r, pageIndex: i + 1, subIndex: multiResults.length > 1 ? idx + 1 : undefined })
        );
      } else {
        const pageResult = await extractDocumentDataWithAI(pageText, fileName, { excelStructure });
        results.push({ ...pageResult, pageIndex: i + 1 });
      }
    }

    if (results.length === 0 && pagesToProcess.length > 0) {
      const fallback = await extractDocumentDataWithAI(pagesToProcess.join('\n\n'), fileName, { excelStructure });
      return NextResponse.json(fallback);
    }

    return NextResponse.json({
      split: true,
      totalPages: pageTexts.length,
      processedPages: pagesToProcess.length,
      truncated: pageTexts.length > MAX_PAGES_SPLIT,
      items: results,
    });
  } catch (error) {
    console.error('Error en API extraccion-datos/extract:', error);
    const message = error instanceof Error ? error.message : 'Error procesando documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
