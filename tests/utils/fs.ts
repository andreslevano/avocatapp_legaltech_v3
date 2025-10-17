import fs from 'fs';
import path from 'path';
import os from 'os';

export function ensureDir(p: string) { 
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); 
}

export function fileSize(p: string) { 
  const s = fs.statSync(p); 
  return s.size; 
}

export function downloadsBase() {
  const home = os.homedir();
  const preferred = process.env.TEST_DOWNLOADS_DIR || (home ? path.join(home, 'Downloads') : '');
  try { 
    if (preferred && fs.existsSync(preferred)) return preferred; 
  } catch {}
  const fallback = path.join(process.cwd(), 'tests', 'downloads');
  ensureDir(fallback);
  return fallback;
}

export function isPDF(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString() === '%PDF';
}

export function readPDFText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Simple PDF text extraction - in real tests you might want to use pdf-parse
      const text = buffer.toString('utf8');
      resolve(text);
    } catch (error) {
      reject(error);
    }
  });
}
