/**
 * Client-side OCR for PDFs (scanned documents).
 * Uses pdf.js to render pages to canvas, then Tesseract.js for OCR.
 * Call only from browser (typeof window !== 'undefined').
 */

export interface OcrPdfProgress {
  page: number;
  total: number;
  status: 'loading' | 'rendering' | 'recognizing' | 'done';
  percent: number;
}

/**
 * Extract text from a PDF using OCR (for scanned PDFs without embedded text).
 * Renders each page to canvas, runs Tesseract on each image.
 */
export async function extractTextFromPdfWithOcr(
  file: File,
  onProgress?: (p: OcrPdfProgress) => void
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextFromPdfWithOcr must run in the browser');
  }

  const report = (p: Partial<OcrPdfProgress>) => {
    onProgress?.({ page: 0, total: 1, status: 'loading', percent: 0, ...p });
  };

  report({ status: 'loading', percent: 5 });

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.mjs`;
  }
  const { createWorker } = await import('tesseract.js');

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  report({ status: 'rendering', total: numPages, percent: 10 });

  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        const page = (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage ?? 1;
        const base = ((page - 1) / numPages) * 80;
        const prog = base + (m.progress * 80) / numPages;
        report({ status: 'recognizing', page, total: numPages, percent: 10 + prog });
      }
    },
  });

  const texts: string[] = [];

  try {
    for (let i = 1; i <= numPages; i++) {
      (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage = i;
      report({ status: 'rendering', page: i, total: numPages, percent: 10 + ((i - 1) / numPages) * 80 });

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      const renderContext = { canvasContext: ctx, viewport };
      const renderTask = page.render(renderContext as Parameters<typeof page.render>[0]);
      await renderTask.promise;

      report({ status: 'recognizing', page: i, total: numPages });
      const { data } = await worker.recognize(canvas);
      texts.push(data.text || '');
    }
  } finally {
    await worker.terminate();
    delete (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage;
  }

  report({ status: 'done', page: numPages, total: numPages, percent: 100 });

  return texts.join('\n\n').trim();
}
