import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { downloadsBase, isPDF } from '../utils/fs';

test.describe('Reclamación de Cantidades API Tests', () => {
  test('POST /api/reclamacion-cantidades devuelve PDF y lo guardo en Descargas', async ({ request }) => {
    const downloadsDir = downloadsBase();
    const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'ocr-sample.json'), 'utf8'));

    // Hacemos la llamada
    const res = await request.post('/api/reclamacion-cantidades', {
      data: payload
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');

    const buf = await res.body();
    const out = path.join(downloadsDir, `reclamacion-api-test.pdf`);
    fs.writeFileSync(out, buf);

    const size = fs.statSync(out).size;
    expect(size).toBeGreaterThan(20_000); // >20KB

    // Comprobación ligera del header PDF
    expect(isPDF(buf)).toBe(true);
  });

  test('GET /api/reclamacion-cantidades/history devuelve items coherentes', async ({ request }) => {
    const res = await request.get('/api/reclamacion-cantidades/history');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBeTruthy();
    if (json.items.length) {
      const it = json.items[0];
      expect(typeof it.precision).toBe('number');
      expect(typeof it.cuantia).toBe('number');
      expect(it.precision).toBeGreaterThanOrEqual(0);
      expect(it.precision).toBeLessThanOrEqual(100);
    }
  });

  test('POST /api/reclamacion-cantidades con datos mínimos', async ({ request }) => {
    const minimalPayload = {
      acreedor: {
        nombre: "Test Acreedor",
        nif: "12345678A"
      },
      deudor: {
        nombre: "Test Deudor",
        nif: "B87654321"
      },
      plaza: "Madrid",
      idioma: "es-ES",
      ocr: {
        files: [],
        summary: { currency: "EUR", totalDetected: 0, confidence: 0.6 }
      },
      hechos: "Hechos de prueba",
      base_negocial: "Base negocial de prueba",
      docs: ["DOC-1: Documento de prueba"],
      viaPreferida: "auto"
    };

    const res = await request.post('/api/reclamacion-cantidades', {
      data: minimalPayload
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');

    const buf = await res.body();
    expect(isPDF(buf)).toBe(true);
  });

  test('POST /api/reclamacion-cantidades con validación de errores', async ({ request }) => {
    const invalidPayload = {
      acreedor: {
        nombre: "" // Nombre vacío debería fallar
      },
      deudor: {
        nombre: "Test Deudor"
      }
      // Faltan campos requeridos
    };

    const res = await request.post('/api/reclamacion-cantidades', {
      data: invalidPayload
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  test('Rate limiting funciona correctamente', async ({ request }) => {
    const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'ocr-sample.json'), 'utf8'));
    
    // Hacer múltiples requests rápidos para probar rate limiting
    const promises = Array(15).fill(null).map(() => 
      request.post('/api/reclamacion-cantidades', { data: payload })
    );

    const responses = await Promise.all(promises);
    
    // Al menos uno debería ser rate limited (429)
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('PDF contiene contenido esperado', async ({ request }) => {
    const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'ocr-sample.json'), 'utf8'));
    
    const res = await request.post('/api/reclamacion-cantidades', {
      data: payload
    });

    expect(res.status()).toBe(200);
    const buf = await res.body();
    
    // Verificar que es un PDF válido
    expect(isPDF(buf)).toBe(true);
    
    // Verificar tamaño mínimo
    expect(buf.length).toBeGreaterThan(20_000);
    
    // Verificar que contiene texto esperado (búsqueda básica en el buffer)
    const text = buf.toString('utf8');
    expect(text).toContain('RECLAMACIÓN'); // Debería contener "RECLAMACIÓN"
  });
});
