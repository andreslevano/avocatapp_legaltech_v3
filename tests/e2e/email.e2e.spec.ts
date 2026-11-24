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

test('Gmail + Outlook connected: switch account, assistant search with purpose, open an email', async ({ page }) => {
  await setup(page, { ...base, gmail: { email: 'andres@gmail.com', status: 'connected' }, outlook: { email: 'andres.levano@mobilityforwork.es', status: 'connected', mail: true } });
  const bodies: Record<string, unknown>[] = [];
  const e1 = { id: 'AAMkAGI2THVSAAA=', threadId: 't1', subject: 'Requerimiento de pago', from: 'Banco <banco@x.es>', to: 'yo', date: '2026-11-20T10:00:00Z', snippet: 'Le requerimos…', hasAttachments: true, score: 92, reason: 'El banco exige el pago en 10 días' };
  const e2 = { id: 'AAMkB=', threadId: 't2', subject: 'Newsletter', from: 'News <n@x.es>', to: 'yo', date: '2026-11-21T10:00:00Z', snippet: 'Novedades', hasAttachments: false, score: 10, reason: 'No trata del requerimiento' };
  await page.route('**/api/email/assist/search', r => { bodies.push(r.request().postDataJSON()); return r.fulfill({ json: {
    plan: { people: [{ name: 'Banco' }], topics: ['requerimiento'], intent: 'x' }, usedPlan: true, results: [e1, e2],
    threads: [{ threadId: 't1', subject: 'Requerimiento de pago', emails: [e1], score: 92, last: e1.date }, { threadId: 't2', subject: 'Newsletter', emails: [e2], score: 10, last: e2.date }] } }); });
  await page.route('**/api/email/message', r => r.fulfill({ json: { message: { ...e1, bodyText: 'Le requerimos el pago de 82,4 UF.', attachments: [{ id: 'att1', name: 'pagare.pdf', mimeType: 'application/pdf', size: 2048 }] } } }));
  await page.goto('/e2e/email');
  const sel = page.getByLabel('Cuenta');
  await expect(sel).toBeVisible();
  await sel.selectOption('outlook');
  await page.getByLabel('¿Qué necesitas saber?').fill('Qué exige el banco y en qué plazo');
  await page.getByLabel('Palabras clave').fill('requerimiento');
  await page.getByRole('button', { name: 'Buscar emails' }).click();
  await expect(page.getByText('El banco exige el pago en 10 días')).toBeVisible();
  expect(bodies[0]).toMatchObject({ provider: 'outlook', purpose: 'Qué exige el banco y en qué plazo', keywords: 'requerimiento' });
  // Relevant one preselected, the newsletter not.
  await expect(page.getByLabel('Incluir en el análisis: Requerimiento de pago, de Banco <banco@x.es>')).toBeChecked();
  await expect(page.getByLabel('Incluir en el análisis: Newsletter, de News <n@x.es>')).not.toBeChecked();
  await expect(page.getByText('1 de 25 emails seleccionados')).toBeVisible();
  // Attachment ticked for the analysis.
  await page.getByRole('button', { name: 'Elegir adjuntos para el análisis' }).click();
  await page.getByLabel(/pagare\.pdf/).check();
  await expect(page.getByText('1 de 25 emails seleccionados · 1 adjunto')).toBeVisible();
  await page.screenshot({ path: 'screenshots/email-assistant-results.png', fullPage: true });

  // Analysis → digest with sources and relations.
  let digestBody: Record<string, unknown> = {};
  await page.route('**/api/email/assist/digest', r => { if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204 }); digestBody = r.request().postDataJSON(); return r.fulfill({ json: {
    digest: { resumen: 'El banco requiere 82,4 UF.', cronologia: [], temas: ['Requerimiento'], puntosAtencion: [{ texto: 'Plazo de 10 días', fuentes: [1] }], fechas: [{ fecha: '2026-11-30', que: 'Fin del plazo', fuentes: [1] }],
      acciones: [{ quien: 'Andrés', que: 'Revisar el pagaré', cuando: 'esta semana', fuentes: [1] }], personas: [], importes: [{ importe: '82,4 UF', concepto: 'Deuda', fuentes: [1] }], adjuntosRelevantes: [], preguntasAbiertas: [] },
    sources: [{ n: 1, id: e1.id, subject: e1.subject, from: e1.from, date: e1.date }], attachmentsRead: ['pagare.pdf'],
    suggestions: [{ type: 'new_client', name: 'Banco', email: 'banco@x.es', organization: 'x.es', reason: 'Participa en la conversación y no está en tus clientes' }] } }); });
  await page.getByRole('button', { name: 'Analizar selección' }).click();
  await expect(page.getByText('El banco requiere 82,4 UF.')).toBeVisible();
  expect(digestBody).toMatchObject({ provider: 'outlook', ids: [e1.id], attachments: [{ messageId: e1.id, attachmentId: 'att1', name: 'pagare.pdf' }] });
  await expect(page.getByText('Adjuntos leídos: pagare.pdf')).toBeVisible();
  await expect(page.getByText('Plazo de 10 días')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear cliente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generar informe' })).toBeVisible();

  // Reply draft only on request.
  await page.route('**/api/email/assist/reply', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204 }) : r.fulfill({ json: { draft: 'Estimados señores: …', subject: 'RE: Requerimiento de pago' } }));
  await page.getByRole('button', { name: 'Borrador de respuesta' }).click();
  await page.getByRole('button', { name: 'Redactar borrador' }).click();
  await expect(page.getByLabel('Borrador')).toHaveValue('Estimados señores: …');
  await page.screenshot({ path: 'screenshots/email-assistant-digest.png', fullPage: true });

  // Source chip opens the email.
  await page.getByRole('button', { name: 'email 1' }).first().click();
  await expect(page.getByText('Le requerimos el pago de 82,4 UF.')).toBeVisible();
  await page.getByRole('button', { name: 'Desconectar' }).click();
  await expect(page.getByText('¿Desconectar Microsoft? También se desconectan OneDrive y SharePoint.')).toBeVisible();
});
