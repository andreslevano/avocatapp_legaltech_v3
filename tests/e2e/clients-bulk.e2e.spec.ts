import { test, expect } from '@playwright/test';

// Clientes bulk actions (harness: src/app/e2e/clients-bulk, dev only). /api/data-requests is mocked.
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
});

test('Solicitar datos: only clients that qualify, reasons for the rest, one request each', async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route('**/api/data-requests', async r => {
    bodies.push(r.request().postDataJSON());
    await r.fulfill({ json: { id: `req-${bodies.length}`, status: 'enviada', link: 'https://x', emailed: true, emailConfigured: true } });
  });
  await page.goto('/e2e/clients-bulk');
  await expect(page.getByText('4 seleccionados')).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar datos' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Jorge López, Eva Ruiz');
  await dialog.getByText('Se omiten 2').click();
  await expect(dialog).toContainText('Juan Pérez: Ya envió sus datos');
  await expect(dialog).toContainText('Sin Email: Sin email válido');
  await dialog.getByRole('button', { name: 'Solicitar datos a 2 clientes' }).click();
  await expect(dialog).toContainText('Hecho en 2 clientes');
  expect(bodies).toEqual([{ clientId: 'c1', documents: ['nda_generico'] }, { clientId: 'c4', documents: ['nda_generico'] }]);
  await expect(page.locator('#log')).toContainText('request c1 enviada');
});

test('Anular: only pending requests; Eliminar keeps clients with cases', async ({ page }) => {
  await page.route('**/api/data-requests/r1/revoke', r => r.fulfill({ json: { id: 'r1', status: 'revocada' } }));
  await page.goto('/e2e/clients-bulk');
  await page.getByRole('button', { name: 'Anular solicitud' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anular 1 solicitud' }).click();
  await expect(page.locator('#log')).toContainText('request c1 revocada');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('button', { name: 'Eliminar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Eliminar 3 clientes' })).toBeVisible();
  await dialog.getByText('Se omiten 1').click();
  await expect(dialog).toContainText('Juan Pérez: Tiene 1 caso');
  await expect(dialog).toContainText('no se puede deshacer');
});

test('Exportar a Excel downloads the selected clients', async ({ page }) => {
  await page.goto('/e2e/clients-bulk');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^Clientes_Avocat_\d{4}-\d{2}-\d{2}\.xlsx$/);
});
