import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'path';

// /precios (Precios v4). Runs against the dev server; Stripe price ids are not set in dev, so Spain
// and Chile both show "Avísame" CTAs unless the env provides ids.
// Screenshots go outside test-results (Playwright empties that folder on every run).
const OUT = resolve(__dirname, '../../screenshots/precios');
const CONSENT = encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 }));

async function open(page: Page, pais: string, width: number) {
  await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
  await page.context().clearCookies();
  // Cookie choice already made (rejected): the banner doesn't cover the page.
  await page.context().addCookies([{ name: 'avocat_consent', value: CONSENT, url: 'http://localhost:3000' }]);
  await page.goto(`/precios?pais=${pais}`);
  await expect(page.getByRole('heading', { level: 1, name: /Precios claros/ })).toBeVisible();
}

for (const width of [375, 768, 1280]) {
  for (const pais of ['es', 'cl']) {
    test(`renders ${pais.toUpperCase()} at ${width}px without horizontal scroll`, async ({ page }) => {
      await open(page, pais, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${OUT}/${pais}-${width}.png`, fullPage: true });
    });
  }
}

test('country switch changes currency and tax line', async ({ page }) => {
  await open(page, 'es', 1280);
  const card = page.locator('#plan-abogado');
  await expect(card).toContainText('69 €');
  await expect(card).toContainText('IVA no incluido');
  await page.getByLabel('País y moneda').selectOption('PE');
  await expect(card).toContainText('S/');
  await expect(card).toContainText('IGV no incluido');
  await expect(page).toHaveURL(/pais=pe/);
  await page.getByLabel('País y moneda').selectOption('CL');
  await expect(page.locator('#plan-particular')).toContainText('$6.990');
  await expect(page.locator('#plan-particular')).toContainText('IVA incluido');
});

test('annual toggle shows 10× price', async ({ page }) => {
  await open(page, 'es', 1280);
  await page.getByRole('radio', { name: /Anual/ }).click();
  await expect(page.locator('#plan-abogado')).toContainText('690 €');
  await expect(page.locator('#plan-abogado')).toContainText('/año');
  await expect(page.locator('#plan-empresa-negocio')).toContainText('4.900 €');
});

test('estimator recommends a plan', async ({ page }) => {
  await open(page, 'es', 1280);
  await page.getByLabel('Consultas al mes').fill('300');
  await page.getByLabel('Documentos generados al mes').fill('60');
  const result = page.getByRole('status').filter({ hasText: 'Te recomendamos' });
  await expect(result).toContainText('Abogado');
  await page.getByLabel('Personas que trabajarán en Avocat').fill('6');
  await expect(result).toContainText('Empresa Negocio');
});

test('Firma rows show Próximamente while SIGNATURE_PROVIDER_LIVE is not true', async ({ page }) => {
  await open(page, 'es', 1280);
  const firma = page.locator('#firma');
  await expect(firma.getByText('Próximamente').first()).toBeVisible();
  await expect(firma).toContainText('5 envíos/mes');
});

test('comparison: accessible table on desktop, two-plan accordions on mobile', async ({ page }) => {
  await open(page, 'es', 1280);
  const table = page.getByRole('table', { name: 'Comparativa de planes de Avocat' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Empresa Negocio' })).toBeVisible();
  await expect(table.getByText('Incluido', { exact: true }).first()).toBeAttached();
  const rowsBefore = await table.locator('tbody tr').count();
  await page.getByLabel('Mostrar solo diferencias').check();
  expect(await table.locator('tbody tr').count()).toBeLessThan(rowsBefore);
  await page.screenshot({ path: `${OUT}/comparar-1280.png`, fullPage: false });

  await open(page, 'es', 375);
  await page.getByLabel('Plan A').selectOption('particular');
  await expect(page.locator('#comparar details').first()).toContainText('Particular');
});

test('profile tabs sync ?perfil and #empresa opens the Empresa block', async ({ page }) => {
  await open(page, 'es', 1280);
  await page.getByRole('tab', { name: 'Empresa' }).click();
  await expect(page).toHaveURL(/perfil=empresa/);
  await expect(page.getByRole('tabpanel')).toContainText('Miembros y externos');
  await page.goto('/precios?pais=es#particular');
  await expect(page.getByRole('tabpanel')).toContainText('no sustituye a un abogado');
});
