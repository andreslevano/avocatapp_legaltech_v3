// Yousign path, against mocked API routes (no Firebase, no Yousign): the sheet, the owner's embedded
// signing modal and the counterparty's /firma page. A fake "Yousign" page is served on Yousign's own
// origin and posts the same { type: 'yousign', event } messages the real iframe does.
import { test, expect, type Page } from '@playwright/test';

const FAKE_LINK = 'https://yousign.app/e2e-fake/sign?x=1&disable_domain_validation=true';
const fakeYousign = (event: string) => `<!doctype html><button onclick="parent.postMessage({type:'yousign',event:'${event}'},'*')">Fake ${event}</button>`;

async function base(page: Page, event = 'success') {
  await page.context().addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
  await page.route('https://yousign.app/**', r => r.fulfill({ contentType: 'text/html', body: fakeYousign(event) }));
  await page.route('**/signatures/return**', r => r.fulfill({ contentType: 'text/html', body: '<h1>return page</h1>' }));
  await page.route('**/api/signatures/provider', r => r.fulfill({ json: { provider: 'yousign', docusignAvailable: false } }));
}

test('sheet (Yousign): no DocuSign connection, OTP by email, embedded signing → return page', async ({ page }) => {
  await base(page);
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/signatures', async r => {
    bodies.push(r.request().postDataJSON());
    await r.fulfill({ json: { requestId: 'r1', signingUrl: FAKE_LINK, focused: null, yousign: { embedded: true } } });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/e2e/sign-sheet');
  const dialog = page.getByRole('dialog', { name: 'Firmar y enviar' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('Conectar DocuSign');
  await expect(dialog).toContainText('ana@bufete.es');
  await expect(dialog).toContainText('Recibirá un email de Avocat con su enlace de firma');
  await expect(dialog).toContainText('Firma electrónica simple (SES)');
  await dialog.getByLabel(/Pedir código por email/).check();
  await page.screenshot({ path: 'screenshots/yousign-sheet.png' });
  await dialog.getByRole('button', { name: 'Firmar y enviar →' }).click();
  // The owner signs in Avocat's modal (Yousign iframe), not in a new page.
  const modal = page.getByRole('dialog', { name: 'Firma electrónica' });
  await expect(modal).toBeVisible();
  expect(bodies[0]).toMatchObject({ provider: 'yousign', signers: [{ name: 'Juan García', email: 'juan@nike.com', otp: true }] });
  await page.screenshot({ path: 'screenshots/yousign-owner-modal.png' });
  await modal.frameLocator('iframe').getByRole('button', { name: 'Fake success' }).click();
  await page.waitForURL(/\/signatures\/return\?rid=r1&event=signing_complete/);
});

test('owner declines in the iframe → decline; "Firmar más tarde" → cancel', async ({ page }) => {
  await base(page, 'declined');
  await page.route('**/api/signatures', r => r.fulfill({ json: { requestId: 'r2', signingUrl: FAKE_LINK, yousign: { embedded: true } } }));
  await page.goto('/e2e/sign-sheet');
  await page.getByRole('button', { name: 'Firmar y enviar →' }).click();
  await page.getByRole('dialog', { name: 'Firma electrónica' }).frameLocator('iframe').getByRole('button', { name: 'Fake declined' }).click();
  await page.waitForURL(/event=decline/);

  await page.goto('/e2e/sign-sheet');
  await page.getByRole('button', { name: 'Firmar y enviar →' }).click();
  await page.getByRole('button', { name: /Firmar más tarde/ }).click();
  await page.waitForURL(/rid=r2&event=cancel/);
});

test('/firma page: open → sign in the iframe → thanks; other states show no document', async ({ page }) => {
  await base(page);
  const TOKEN = 'a'.repeat(43);
  await page.route(`**/api/signatures/invite/${TOKEN}`, r => r.fulfill({ json: { state: 'open', ownerName: 'Ana Abogada', title: 'NDA Acme', signerName: 'Juan García', link: FAKE_LINK } }));
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`/firma/${TOKEN}`);
  await expect(page.getByRole('heading', { name: 'Ana Abogada te ha enviado «NDA Acme» para firmar' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/yousign-firma-375.png' });
  await page.frameLocator('iframe').getByRole('button', { name: 'Fake success' }).click();
  await expect(page.getByRole('heading', { name: 'Documento firmado' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  for (const [state, title] of [['voided', 'Solicitud anulada'], ['not_your_turn', 'Todavía no es tu turno'], ['signed', 'Ya está firmado'], ['invalid', 'Enlace no válido']] as const) {
    await page.unroute(`**/api/signatures/invite/${TOKEN}`);
    await page.route(`**/api/signatures/invite/${TOKEN}`, r => r.fulfill({ json: { state, ownerName: 'Ana', title: 'NDA' } }));
    await page.goto(`/firma/${TOKEN}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  }
});

test('messages from other origins are ignored', async ({ page }) => {
  await base(page);
  const TOKEN = 'b'.repeat(43);
  await page.route('https://evil.example/**', r => r.fulfill({ contentType: 'text/html', body: fakeYousign('success') }));
  await page.route(`**/api/signatures/invite/${TOKEN}`, r => r.fulfill({ json: { state: 'open', ownerName: 'Ana', title: 'NDA', signerName: 'Juan', link: 'https://evil.example/x' } }));
  await page.goto(`/firma/${TOKEN}`);
  await page.frameLocator('iframe').getByRole('button', { name: 'Fake success' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Documento firmado' })).toHaveCount(0);
});
