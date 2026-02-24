/**
 * Client-side OCR for PDFs (scanned documents).
 * Uses pdf.js to render pages to canvas, then Tesseract.js for OCR.
 * Handles rotated/vertical text by trying multiple orientations.
 * Call only from browser (typeof window !== 'undefined').
 */

const MIN_TEXT_FOR_VALID_OCR = 30;

/** Run OCR on canvas; if little text, try rotated orientations (90, 180, 270°) and return best. */
async function recognizeWithRotationFallback(
  canvas: HTMLCanvasElement,
  worker: { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }> }
): Promise<string> {
  const runOcr = async (c: HTMLCanvasElement) => {
    const { data } = await worker.recognize(c);
    return (data.text || '').trim();
  };

  let best = await runOcr(canvas);
  let bestLen = best.replace(/\s/g, '').length;
  if (bestLen >= MIN_TEXT_FOR_VALID_OCR) return best;

  const rotations = [90, 180, 270];
  for (const deg of rotations) {
    const rotated = document.createElement('canvas');
    const ctx = rotated.getContext('2d');
    if (!ctx) continue;
    if (deg === 90 || deg === 270) {
      rotated.width = canvas.height;
      rotated.height = canvas.width;
    } else {
      rotated.width = canvas.width;
      rotated.height = canvas.height;
    }
    ctx.save();
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    const text = await runOcr(rotated);
    const len = text.replace(/\s/g, '').length;
    if (len > bestLen) {
      best = text;
      bestLen = len;
    }
  }
  return best;
}

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
      const text = await recognizeWithRotationFallback(canvas, worker);
      texts.push(text);
    }
  } finally {
    await worker.terminate();
    delete (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage;
  }

  report({ status: 'done', page: numPages, total: numPages, percent: 100 });

  return texts.join('\n\n').trim();
}

/** Extract text per page for split-by-page processing (returns array of page texts) */
export async function extractTextFromPdfWithOcrPerPage(
  file: File,
  onProgress?: (p: OcrPdfProgress) => void
): Promise<string[]> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextFromPdfWithOcrPerPage must run in the browser');
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
      if (!ctx) {
        texts.push('');
        continue;
      }
      const renderContext = { canvasContext: ctx, viewport };
      const renderTask = page.render(renderContext as Parameters<typeof page.render>[0]);
      await renderTask.promise;

      report({ status: 'recognizing', page: i, total: numPages });
      const text = await recognizeWithRotationFallback(canvas, worker);
      texts.push(text);
    }
  } finally {
    await worker.terminate();
    delete (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage;
  }

  report({ status: 'done', page: numPages, total: numPages, percent: 100 });

  return texts;
}

/** Extract text via OCR for specific page indices only (1-based). Use for selective OCR on image-only pages. */
export async function extractTextFromPdfWithOcrForPageIndices(
  file: File,
  pageIndices: number[],
  onProgress?: (p: OcrPdfProgress) => void
): Promise<Map<number, string>> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextFromPdfWithOcrForPageIndices must run in the browser');
  }
  if (pageIndices.length === 0) return new Map();

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

  const sortedIndices = [...pageIndices].filter((p) => p >= 1 && p <= numPages).sort((a, b) => a - b);
  const total = sortedIndices.length;
  report({ status: 'rendering', total, percent: 10 });

  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        const page = (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage ?? sortedIndices[0];
        const idx = sortedIndices.indexOf(page);
        const base = (idx / total) * 80;
        const prog = base + (m.progress * 80) / total;
        report({ status: 'recognizing', page, total, percent: 10 + prog });
      }
    },
  });

  const result = new Map<number, string>();

  try {
    for (let i = 0; i < sortedIndices.length; i++) {
      const pageNum = sortedIndices[i];
      (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage = pageNum;
      report({ status: 'rendering', page: pageNum, total, percent: 10 + (i / total) * 80 });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        result.set(pageNum, '');
        continue;
      }
      const renderContext = { canvasContext: ctx, viewport };
      const renderTask = page.render(renderContext as Parameters<typeof page.render>[0]);
      await renderTask.promise;

      report({ status: 'recognizing', page: pageNum, total });
      const text = await recognizeWithRotationFallback(canvas, worker);
      result.set(pageNum, text);
    }
  } finally {
    await worker.terminate();
    delete (window as unknown as { __ocrCurrentPage?: number }).__ocrCurrentPage;
  }

  report({ status: 'done', page: sortedIndices[sortedIndices.length - 1] ?? 1, total, percent: 100 });

  return result;
}

/** Extract text from an image file (photo, scan) via OCR. Handles rotated text. */
export async function extractTextFromImageWithOcr(
  file: File,
  onProgress?: (p: OcrPdfProgress) => void
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextFromImageWithOcr must run in the browser');
  }

  const report = (p: Partial<OcrPdfProgress>) => {
    onProgress?.({ page: 0, total: 1, status: 'loading', percent: 0, ...p });
  };

  report({ status: 'loading', percent: 10 });

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        report({ status: 'recognizing', percent: 20 + m.progress * 70 });
      }
    },
  });

  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(img.src);
      const { data } = await worker.recognize(file);
      return (data.text || '').trim();
    }
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);

    report({ status: 'recognizing', percent: 30 });
    const text = await recognizeWithRotationFallback(canvas, worker);
    report({ status: 'done', percent: 100 });
    return text;
  } finally {
    await worker.terminate();
  }
}
