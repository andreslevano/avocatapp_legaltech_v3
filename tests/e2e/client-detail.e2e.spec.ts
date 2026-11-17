import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
  await page.route('**/e2e-files/sample.pdf', r => r.fulfill({ contentType: 'application/pdf', body: readFileSync(resolve(__dirname, '../fixtures/sample.pdf')) }));
});

test('client panel: data, cases, signature documents first, all documents, filtered link, viewer', async ({ page }) => {
  await page.goto('/e2e/client-detail');
  const panel = page.getByRole('dialog', { name: 'Juan Pérez' });
  await expect(panel).toContainText('DNI 12345678Z');
  await expect(panel).toContainText('Calle Mayor 1, Madrid');
  await expect(panel.getByRole('link', { name: /Reclamación ACME/ })).toHaveAttribute('href', '/cases/k1');
  await expect(panel.getByRole('tab', { name: 'De firma (3)' })).toHaveAttribute('aria-selected', 'true');
  // Only the document still waiting for the other party's copy offers "Subir copia firmada".
  await expect(panel.getByRole('button', { name: 'Subir copia firmada' })).toHaveCount(1);
  await expect(panel.locator('li', { hasText: 'Contrato_Juan.pdf' }).getByRole('button', { name: 'Subir copia firmada' })).toBeVisible();
  await expect(panel.locator('li', { hasText: 'NDA_devuelto.pdf' })).toContainText('Firmado · Firma manuscrita');
  await expect(panel).toContainText('Firmado · DocuSign');
  await expect(panel).toContainText('Enviado para firma manuscrita');
  await expect(panel).not.toContainText('Notas.pdf');
  await panel.getByRole('tab', { name: 'Todos (4)' }).click();
  await expect(panel).toContainText('Notas.pdf');
  await expect(panel).not.toContainText('Otro_cliente.pdf');
  await expect(panel.getByRole('link', { name: /Ver en Documentos/ })).toHaveAttribute('href', '/documents?cliente=c1');
  await panel.getByRole('button', { name: /NDA_Juan.pdf/ }).click();
  await expect(page.locator('[aria-labelledby="viewer-title"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[aria-labelledby="viewer-title"]')).toHaveCount(0);
  await expect(panel).toBeVisible();          // Esc closed only the viewer
  await page.keyboard.press('Escape');
  await expect(page.locator('#closed')).toBeVisible();
});
