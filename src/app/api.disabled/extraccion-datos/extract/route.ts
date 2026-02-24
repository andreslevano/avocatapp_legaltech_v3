import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentDataWithAI, extractMultiDocumentDataWithAI } from '@/lib/openai';
import { processInvoiceWithDocumentAI } from '@/lib/document-ai';

export const maxDuration = 300;

interface ExtractBody {
  downloadURL?: string;
  fileName: string;
  preExtractedText?: string;
  preExtractedTextPerPage?: string[];
  splitByPage?: boolean;
  excelStructure?: string;
  multiInvoicePerPage?: boolean;
  pageOffset?: number;
  pageLimit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExtractBody;
    const { downloadURL, fileName, preExtractedText, preExtractedTextPerPage, splitByPage, excelStructure, multiInvoicePerPage, pageOffset = 0, pageLimit = 25 } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName es requerido' }, { status: 400 });
    }
    const hasInput = downloadURL || preExtractedText?.trim() || (preExtractedTextPerPage && preExtractedTextPerPage.length > 0);
    if (!hasInput) {
      return NextResponse.json(
        { error: 'downloadURL, preExtractedText o preExtractedTextPerPage son requeridos' },
        { status: 400 }
      );
    }

    const ext = fileName.toLowerCase().split('.').pop() || '';
    const isPdf = ext === 'pdf';

    let pageTexts: string[] = [];

    if (preExtractedTextPerPage?.length) {
      pageTexts = preExtractedTextPerPage.map((t) => String(t || '').trim()).filter((t) => t.length > 0);
    }
    if (pageTexts.length === 0 && preExtractedText?.trim()) {
      pageTexts = [preExtractedText.trim()];
    }
    if (pageTexts.length === 0 && downloadURL) {
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Phase A: Try Document AI Invoice Parser first for single PDFs (no split)
      if (isPdf && !splitByPage) {
        const docAiResult = await processInvoiceWithDocumentAI(buffer, fileName, 'application/pdf', excelStructure);
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

    const offset = Math.max(0, Number(pageOffset) || 0);
    const limit = Math.min(25, Math.max(1, Number(pageLimit) || 25));
    const pagesToProcess = pageTexts.slice(offset, offset + limit);

    if (pagesToProcess.length === 1) {
      const text = pagesToProcess[0];
      if (multiInvoicePerPage && text.trim().length > 100) {
        const multiResults = await extractMultiDocumentDataWithAI(text, fileName, '1', { excelStructure });
        if (multiResults.length >= 1) {
          return NextResponse.json({
            split: true,
            totalPages: 1,
            batchComplete: true,
            items: multiResults.map((r, idx) => ({ ...r, pageIndex: 1, subIndex: multiResults.length > 1 ? idx + 1 : undefined })),
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
      const pageNum = offset + i + 1;
      if (!pageText.trim() || pageText.trim().length < 20) continue;
      if (multiInvoicePerPage && pageText.trim().length > 100) {
        const multiResults = await extractMultiDocumentDataWithAI(pageText, fileName, String(pageNum), { excelStructure });
        multiResults.forEach((r, idx) =>
          results.push({ ...r, pageIndex: pageNum, subIndex: multiResults.length > 1 ? idx + 1 : undefined })
        );
      } else {
        const pageResult = await extractDocumentDataWithAI(pageText, fileName, { excelStructure });
        results.push({ ...pageResult, pageIndex: pageNum });
      }
    }

    if (results.length === 0 && pagesToProcess.length > 0) {
      const fallback = await extractDocumentDataWithAI(pagesToProcess.join('\n\n'), fileName, { excelStructure });
      return NextResponse.json(fallback);
    }

    const batchComplete = offset + results.length >= pageTexts.length;
    return NextResponse.json({
      split: true,
      totalPages: pageTexts.length,
      processedPages: results.length,
      pageOffset: offset,
      nextPageOffset: batchComplete ? null : offset + limit,
      batchComplete,
      truncated: !batchComplete,
      items: results,
    });
  } catch (error) {
    console.error('Error en API extraccion-datos/extract:', error);
    const message = error instanceof Error ? error.message : 'Error procesando documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
