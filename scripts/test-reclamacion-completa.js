// Ejecuta: OPENAI_MOCK=1 node scripts/test-reclamacion-completa.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'ocr-sample.json'), 'utf8'));

function downloadsBase() {
  const pref = process.env.TEST_DOWNLOADS_DIR || (os.homedir() ? path.join(os.homedir(), 'Downloads') : '');
  if (pref && fs.existsSync(pref)) return pref;
  const fb = path.join(process.cwd(), 'tests', 'downloads');
  if (!fs.existsSync(fb)) fs.mkdirSync(fb, { recursive: true });
  return fb;
}

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  console.log('🔍 Probando endpoint de reclamación de cantidades...');
  console.log('📤 Enviando petición a /api/reclamacion-cantidades...');
  
  const res = await postJson(`${BASE}/api/reclamacion-cantidades`, payload);
  
  if (res.status !== 200) {
    console.error('❌ Error', res.status, res.body.toString());
    process.exit(1);
  }
  
  const out = path.join(downloadsBase(), 'reclamacion-completa.pdf');
  fs.writeFileSync(out, res.body);
  console.log('✔ PDF guardado en', out, 'tamaño', res.body.length, 'bytes');
  
  // Verificar que es un PDF válido
  const header = res.body.subarray(0, 4).toString();
  if (header === '%PDF') {
    console.log('✅ PDF válido generado correctamente');
  } else {
    console.log('❌ El archivo no parece ser un PDF válido');
  }
})();
