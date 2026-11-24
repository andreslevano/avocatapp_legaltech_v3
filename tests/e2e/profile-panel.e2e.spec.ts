// User menu: opens on the same side as the avatar (desktop rail, bottom-left); above the bottom bar on mobile.
import { test, expect } from '@playwright/test';

async function open(page: import('@playwright/test').Page, width: number) {
  await page.context().addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
  await page.setViewportSize({ width, height: 760 });
  await page.goto('/e2e/profile-panel');
  await page.getByRole('button', { name: 'Perfil' }).click();
  const panel = page.getByText('Cerrar sesión').locator('xpath=ancestor::*[contains(@style,"position: fixed")][1]');
  await expect(panel).toBeVisible();
  return panel.boundingBox();
}

test('desktop: the menu opens to the right of the avatar, on the left side of the screen', async ({ page }) => {
  const box = (await open(page, 1280))!;
  const avatar = (await page.getByRole('button', { name: 'Perfil' }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(avatar.x + avatar.width);
  expect(box.x).toBeLessThan(200);
  expect(box.y + box.height).toBeLessThanOrEqual(760);
  await page.screenshot({ path: 'screenshots/profile-panel-desktop.png' });
});

test('mobile: the menu floats above the bottom bar, inside the screen', async ({ page }) => {
  const box = (await open(page, 375))!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});
