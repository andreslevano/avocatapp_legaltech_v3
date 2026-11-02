import { test, expect, type Page, type Route } from '@playwright/test';

// Phase 5c — "Firmar y enviar" sheet against mocked API routes (no Firebase, no DocuSign).
// Harness: src/app/e2e/sign-sheet (dev only).

const FAKE_DOCUSIGN = 'http://localhost:3000/e2e-fake/docusign-signing';
const FAKE_BUNDLE = '/e2e-fake/bundle.js';

// Stand-in for DocuSign's bundle.js: mounts a button that ends the session.
const FAKE_BUNDLE_JS = `
window.DocuSign = { loadDocuSign: async function (key) { return { signing: function (opts) {
  var handlers = {};
  return {
    on: function (ev, cb) { handlers[ev] = cb; },
    mount: function (sel) {
      var b = document.createElement('button');
      b.textContent = 'Fake finish ' + key + ' ' + opts.displayFormat;
      b.onclick = function () { handlers.sessionEnd && handlers.sessionEnd({ sessionEndType: 'signing_complete' }); };
      document.querySelector(sel).appendChild(b);
      setTimeout(function () { handlers.ready && handlers.ready(); }, 50);
    },
  };
} }; } };`;

async function stubPages(page: Page) {
  await page.route('**/e2e-fake/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>fake docusign</h1>' }));
  await page.route('**/signatures/return**', r => r.fulfill({ contentType: 'text/html', body: '<h1>return page</h1>' }));
}

function captureCreate(page: Page, reply: (body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const bodies: Record<string, unknown>[] = [];
  return page.route('**/api/signatures', async (route: Route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    const r = reply(body);
    await route.fulfill({ status: r.status ?? 200, json: r.json });
  }).then(() => bodies);
}

const sendBtn = (page: Page) => page.getByRole('button', { name: 'Firmar y enviar →' });

test.describe('Firmar y enviar sheet (5c)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('one signer: sends the right body and redirects to DocuSign', async ({ page }) => {
    await stubPages(page);
    const bodies = await captureCreate(page, () => ({ json: { requestId: 'req-1', signingUrl: FAKE_DOCUSIGN, focused: null } }));
    await page.goto('/e2e/sign-sheet');
    await expect(page.getByText('Contrato de prueba', { exact: true })).toBeVisible();
    await sendBtn(page).click();
    await page.waitForURL(FAKE_DOCUSIGN);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      documentId: 'doc-1', title: 'Contrato de prueba',
      signers: [{ name: 'Juan García', email: 'juan@nike.com' }], cc: [], signingOrder: 'sequential',
      embedOrigin: 'http://localhost:3000',
    });
    expect(bodies[0].markdown).toBeUndefined();          // saved document is signed server-side
  });

  test('validation: bad email, own email, duplicates — nothing is sent', async ({ page }) => {
    const bodies = await captureCreate(page, () => ({ json: {} }));
    await page.goto('/e2e/sign-sheet');
    const email = page.getByPlaceholder('email@empresa.com').first();
    await email.fill('juan@');
    await sendBtn(page).click();
    await expect(page.getByText(/no es válido/)).toBeVisible();
    await email.fill('ana@bufete.es');
    await sendBtn(page).click();
    await expect(page.getByText(/no te añadas/)).toBeVisible();
    await email.fill('juan@nike.com');
    await page.getByRole('button', { name: '+ Añadir en copia' }).click();
    await page.getByPlaceholder('email@empresa.com').nth(1).fill('JUAN@nike.com');
    await sendBtn(page).click();
    await expect(page.getByText(/email distinto/)).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  test('several signers at once, access code and CC', async ({ page }) => {
    await stubPages(page);
    const bodies = await captureCreate(page, () => ({ json: { requestId: 'req-2', signingUrl: FAKE_DOCUSIGN, focused: null } }));
    await page.goto('/e2e/sign-sheet');
    await page.getByRole('button', { name: '+ Añadir firmante' }).click();
    await page.getByPlaceholder('Nombre completo').nth(1).fill('Eva Ruiz');
    await page.getByPlaceholder('email@empresa.com').nth(1).fill('eva@acme.es');
    await page.getByRole('button', { name: 'A la vez' }).click();
    await expect(page.getByText('Todos reciben el email a la vez')).toBeVisible();
    await page.getByRole('button', { name: '🔒 Pedir código de acceso' }).nth(1).click();
    const code = page.getByPlaceholder(/Código de acceso/);
    await code.fill('12');
    await sendBtn(page).click();
    await expect(page.getByText(/entre 4 y 20/)).toBeVisible();
    await code.fill('K7Q2');
    await page.getByRole('button', { name: '+ Añadir en copia' }).click();
    await page.getByPlaceholder('Nombre').last().fill('Socio');
    await page.getByPlaceholder('email@empresa.com').last().fill('socio@bufete.es');
    await sendBtn(page).click();
    await page.waitForURL(FAKE_DOCUSIGN);
    expect(bodies[0]).toMatchObject({
      signingOrder: 'parallel',
      signers: [{ name: 'Juan García', email: 'juan@nike.com' }, { name: 'Eva Ruiz', email: 'eva@acme.es', accessCode: 'K7Q2' }],
      cc: [{ name: 'Socio', email: 'socio@bufete.es' }],
    });
    expect((bodies[0].signers as Record<string, unknown>[])[0].accessCode).toBeUndefined();
  });

  test('already in signature: shows the error and Continuar firma', async ({ page }) => {
    await captureCreate(page, () => ({ status: 409, json: { error: 'Este documento ya está en proceso de firma.', code: 'already_in_signature', requestId: 'req-old' } }));
    await page.goto('/e2e/sign-sheet');
    await sendBtn(page).click();
    await expect(page.getByText('Este documento ya está en proceso de firma.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar firma' })).toBeVisible();
  });

  test('desktop: Focused View modal, then the return page with the event', async ({ page }) => {
    await stubPages(page);
    await page.route(`**${FAKE_BUNDLE}`, r => r.fulfill({ contentType: 'application/javascript', body: FAKE_BUNDLE_JS }));
    await captureCreate(page, () => ({ json: { requestId: 'req-3', signingUrl: 'https://apps-d.docusign.com/x', focused: { integrationKey: 'ik-1', bundleUrl: FAKE_BUNDLE } } }));
    await page.goto('/e2e/sign-sheet');
    await sendBtn(page).click();
    await expect(page.getByRole('dialog', { name: 'Firma con DocuSign' })).toBeVisible();
    await expect(page.getByTestId('closed')).toBeVisible();                     // the sheet closed behind it
    await page.getByRole('button', { name: 'Fake finish ik-1 focused' }).click();
    await page.waitForURL(/\/signatures\/return\?rid=req-3&event=signing_complete/);
  });

  test('Focused View can\'t load → fresh plain URL and redirect', async ({ page }) => {
    await stubPages(page);
    await page.route(`**${FAKE_BUNDLE}`, r => r.fulfill({ status: 404, body: '' }));
    await captureCreate(page, () => ({ json: { requestId: 'req-4', signingUrl: 'https://apps-d.docusign.com/x', focused: { integrationKey: 'ik', bundleUrl: FAKE_BUNDLE } } }));
    const resumeBodies: unknown[] = [];
    await page.route('**/api/signatures/req-4/signing-url', async r => {
      resumeBodies.push(r.request().postDataJSON());
      await r.fulfill({ json: { signingUrl: FAKE_DOCUSIGN, focused: null } });
    });
    await page.goto('/e2e/sign-sheet');
    await sendBtn(page).click();
    await page.waitForURL(FAKE_DOCUSIGN);
    expect(resumeBodies).toEqual([{}]);                                          // plain: no embedOrigin
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('no Focused View on phones', async ({ page }) => {
    await stubPages(page);
    const bodies = await captureCreate(page, () => ({ json: { requestId: 'req-5', signingUrl: FAKE_DOCUSIGN, focused: null } }));
    await page.goto('/e2e/sign-sheet');
    await sendBtn(page).click();
    await page.waitForURL(FAKE_DOCUSIGN);
    expect(bodies[0].embedOrigin).toBeUndefined();
  });
});
