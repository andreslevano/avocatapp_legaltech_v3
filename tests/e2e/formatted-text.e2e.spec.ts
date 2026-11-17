import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
});

test('toolbar formats the selection; preview shows the document result', async ({ page }) => {
  await page.goto('/e2e/formatted-text');
  const box = page.getByLabel('Productos Protegidos *');
  const preview = page.locator('.legal-doc');
  // Interactive (hydrated) before using the toolbar: typing must update the state.
  await expect(async () => {
    await box.fill('Plataforma Norte\nPortal de fabricantes ');
    await box.fill('Plataforma Norte\nPortal de fabricantes');
    await expect(page.locator('#raw')).toHaveText('Plataforma Norte\nPortal de fabricantes', { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  // Plain lines → the classic bold bullets in the preview.
  await expect(preview.locator('ul li strong')).toHaveCount(2);

  // Select "Plataforma" and press Negrita.
  await box.evaluate((t: HTMLTextAreaElement) => { t.focus(); t.setSelectionRange(0, 10); });
  await page.getByRole('button', { name: /Negrita/ }).click();
  await expect(page.locator('#raw')).toHaveText('**Plataforma** Norte\nPortal de fabricantes');

  // Ctrl/Cmd+I on "Norte".
  await box.evaluate((t: HTMLTextAreaElement) => { t.focus(); t.setSelectionRange(15, 20); });
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+I' : 'Control+I');
  await expect(page.locator('#raw')).toHaveText('**Plataforma** *Norte*\nPortal de fabricantes');

  // Numbered list on both lines, then Título on the first.
  await box.evaluate((t: HTMLTextAreaElement) => { t.focus(); t.setSelectionRange(0, t.value.length); });
  await page.getByRole('button', { name: 'Lista numerada' }).click();
  await expect(page.locator('#raw')).toHaveText('1. **Plataforma** *Norte*\n2. Portal de fabricantes');
  await expect(preview.locator('ol li')).toHaveCount(2);
  await expect(preview.locator('ol li em')).toHaveText('Norte');

  await box.evaluate((t: HTMLTextAreaElement) => { t.focus(); t.setSelectionRange(0, 0); });
  await page.getByLabel('Tamaño').selectOption('h2');
  await expect(page.locator('#raw')).toHaveText('## **Plataforma** *Norte*\n2. Portal de fabricantes');
  await expect(preview.locator('h2')).toContainText('Plataforma');
  await page.screenshot({ path: 'test-results/formatted-text.png' });
});
