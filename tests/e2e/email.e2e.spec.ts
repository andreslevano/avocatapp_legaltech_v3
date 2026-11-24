// Revisión de Email — account states and the Outlook search path, against mocked API routes.
import { test, expect, type Page } from '@playwright/test';

const base = { loginEmail: 'andres.levano@mobilityforwork.es', suggested: 'outlook', outlookAvailable: true, gmail: null, outlook: null };
async function setup(page: Page, status: object) {
  await page.context().addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
  await page.route('**/api/email/status', r => r.fulfill({ json: status }));
  await page.setViewportSize({ width: 1100, height: 760 });
}

test('nothing connected: proposes the login email with its provider; other accounts available', async ({ page }) => {
  await setup(page, base);
  let authUrl = '';
  await page.route('**/api/integrations/microsoft/auth**', r => { authUrl = r.request().url(); return r.fulfill({ json: { url: 'http://localhost:3000/e2e-fake/ms' } }); });
  await page.route('**/e2e-fake/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>microsoft</h1>' }));
  await page.goto('/e2e/email');
  await expect(page.getByRole('button', { name: 'Correo' })).toBeVisible();
  const cta = page.getByRole('button', { name: 'Conectar andres.levano@mobilityforwork.es (Outlook)' });
  await expect(cta).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gmail', exact: true })).toBeVisible();
  await page.screenshot({ path: 'screenshots/email-suggest.png' });
  await cta.click();
  await page.waitForURL('**/e2e-fake/ms');
  expect(authUrl).toContain('mail=1');
  expect(authUrl).toContain('account=login');
  expect(decodeURIComponent(authUrl)).toContain('returnTo=/tools/revision-email');
});

test('Microsoft connected for OneDrive only: asks for mail access', async ({ page }) => {
  await setup(page, { ...base, outlook: { email: 'andres.levano@mobilityforwork.es', status: 'connected', mail: false } });
  await page.goto('/e2e/email');
  await expect(page.getByRole('button', { name: 'Dar acceso al correo' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/email-grant.png' });
});

test('Gmail + Outlook connected: switch account, search Outlook, open an email', async ({ page }) => {
  await setup(page, { ...base, gmail: { email: 'andres@gmail.com', status: 'connected' }, outlook: { email: 'andres.levano@mobilityforwork.es', status: 'connected', mail: true } });
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/email/search', r => { bodies.push(r.request().postDataJSON()); return r.fulfill({ json: { messages: [{ id: 'AAMkAGI2THVSAAA=', threadId: 't', subject: 'Requerimiento de pago', from: 'Banco <banco@x.es>', to: '', date: '2026-11-20T10:00:00Z', snippet: 'Le requerimos…', hasAttachments: true }] } }); });
  await page.route('**/api/email/message', r => r.fulfill({ json: { message: { id: 'AAMkAGI2THVSAAA=', threadId: 't', subject: 'Requerimiento de pago', from: 'Banco <banco@x.es>', to: 'yo', date: '2026-11-20T10:00:00Z', snippet: '', hasAttachments: true, bodyText: 'Le requerimos el pago de 82,4 UF.', attachments: [{ name: 'pagare.pdf', mimeType: 'application/pdf', size: 1 }] } } }));
  await page.goto('/e2e/email');
  const sel = page.getByLabel('Cuenta');
  await expect(sel).toBeVisible();
  await sel.selectOption('outlook');
  await page.getByPlaceholder('Ej: contrato, demanda, requerimiento...').fill('requerimiento');
  await page.getByRole('button', { name: 'Buscar emails' }).click();
  await page.getByText('Requerimiento de pago').click();
  await expect(page.getByText('Le requerimos el pago de 82,4 UF.')).toBeVisible();
  expect(bodies[0]).toMatchObject({ provider: 'outlook', keywords: 'requerimiento' });
  await page.screenshot({ path: 'screenshots/email-connected.png' });
  await page.getByRole('button', { name: 'Desconectar' }).click();
  await expect(page.getByText('¿Desconectar Microsoft? También se desconectan OneDrive y SharePoint.')).toBeVisible();
});
