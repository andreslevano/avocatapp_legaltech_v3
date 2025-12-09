import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { downloadsBase, isPDF } from '../utils/fs';

function ensureDir(p: string) { 
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); 
}

test.describe('Reclamación de Cantidades E2E Tests', () => {
  test('Flujo UI completo: Analizar → (Bypass pago) → Generar y descargar PDF', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Panel visible
    await expect(page.getByText('Panel de Reclamación de Cantidades')).toBeVisible();

    // (Modo test) Bypass pago si está disponible
    const bypass = page.getByRole('button', { name: /Bypass pago/i });
    if (await bypass.isVisible()) {
      await bypass.click();
    }

    // Generar PDF
    const gen = page.getByRole('button', { name: /Generar PDF/i });
    await expect(gen).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await gen.click();
    const download = await downloadPromise;

    const downloadsDir = downloadsBase();
    ensureDir(downloadsDir);
    const target = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(target);

    expect(fs.existsSync(target)).toBeTruthy();
    const size = fs.statSync(target).size;
    expect(size).toBeGreaterThan(20_000);

    // Verificar que es un PDF válido
    const buffer = fs.readFileSync(target);
    expect(isPDF(buffer)).toBe(true);

    // Historial actualizado (si la UI lo muestra)
    await expect(page.getByText(/Historial de Compras/i)).toBeVisible();
  });

  test('Navegación a página de reclamación de cantidades', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    
    // Ir a la página principal
    await page.goto(base);
    
    // Navegar a reclamación de cantidades
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);
    
    // Verificar que la página carga correctamente
    await expect(page.getByText('Panel de Reclamación de Cantidades')).toBeVisible();
    
    // Verificar elementos clave de la UI
    await expect(page.getByText('Subir y Analizar')).toBeVisible();
    await expect(page.getByText('Pago')).toBeVisible();
    await expect(page.getByText('Descargar')).toBeVisible();
  });

  test('Formulario de datos básicos funciona', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Llenar datos del acreedor
    await page.fill('input[name="acreedor.nombre"]', 'Juan Pérez');
    await page.fill('input[name="acreedor.nif"]', '12345678A');
    await page.fill('input[name="acreedor.domicilio"]', 'Calle Mayor 1, Madrid');

    // Llenar datos del deudor
    await page.fill('input[name="deudor.nombre"]', 'ACME SL');
    await page.fill('input[name="deudor.nif"]', 'B12345678');
    await page.fill('input[name="deudor.domicilio"]', 'Calle del Sol 5, Madrid');

    // Llenar plaza
    await page.fill('input[name="plaza"]', 'Madrid');

    // Verificar que los campos se llenaron correctamente
    await expect(page.locator('input[name="acreedor.nombre"]')).toHaveValue('Juan Pérez');
    await expect(page.locator('input[name="deudor.nombre"]')).toHaveValue('ACME SL');
  });

  test('Botón bypass pago aparece en modo test', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Verificar que el botón bypass aparece cuando TEST_BYPASS_PAYMENT=1
    if (process.env.TEST_BYPASS_PAYMENT === '1') {
      await expect(page.getByRole('button', { name: /Bypass pago/i })).toBeVisible();
    }
  });

  test('Descarga de PDF se guarda en ubicación correcta', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Bypass pago si está disponible
    const bypass = page.getByRole('button', { name: /Bypass pago/i });
    if (await bypass.isVisible()) {
      await bypass.click();
    }

    // Generar PDF
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Generar PDF/i }).click();
    const download = await downloadPromise;

    // Verificar que el nombre del archivo es correcto
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/reclamacion-cantidad-.*\.pdf/);

    // Guardar en ubicación de descargas
    const downloadsDir = downloadsBase();
    const target = path.join(downloadsDir, filename);
    await download.saveAs(target);

    // Verificar que el archivo existe y tiene el tamaño correcto
    expect(fs.existsSync(target)).toBeTruthy();
    const stats = fs.statSync(target);
    expect(stats.size).toBeGreaterThan(20_000);
    expect(stats.size).toBeLessThan(1_000_000); // Menos de 1MB
  });

  test('Manejo de errores en la UI', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Intentar generar PDF sin datos completos
    const genButton = page.getByRole('button', { name: /Generar PDF/i });
    
    // El botón debería estar deshabilitado o mostrar error
    if (await genButton.isEnabled()) {
      await genButton.click();
      
      // Verificar que aparece un mensaje de error
      await expect(page.getByText(/Error/i)).toBeVisible();
    }
  });

  test('Historial se actualiza después de generar PDF', async ({ page }) => {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${base}/dashboard/reclamacion-cantidades`);

    // Bypass pago si está disponible
    const bypass = page.getByRole('button', { name: /Bypass pago/i });
    if (await bypass.isVisible()) {
      await bypass.click();
    }

    // Generar PDF
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Generar PDF/i }).click();
    const download = await downloadPromise;

    // Guardar el PDF
    const downloadsDir = downloadsBase();
    const target = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(target);

    // Verificar que el historial se actualiza
    await expect(page.getByText(/Historial de Compras/i)).toBeVisible();
    
    // Verificar que aparece una nueva entrada en el historial
    const historialItems = page.locator('[data-testid="historial-item"]');
    await expect(historialItems).toHaveCount(1);
  });
});
