// NDA negotiation — the other party's public review page (mocked API) and the owner's screens
// (dev-only harness /e2e/negotiation), at phone and desktop widths.
import { test, expect, type Page } from '@playwright/test';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { splitClauses } from '@/lib/negotiations/clauses';
import { defaultLevel, levelAllows, MFW_PLAYBOOK } from '@/lib/negotiations/levels';

const TOKEN = 'a'.repeat(43);
const md = renderMfwNda({ receptor: { tipo: 'persona', nombre: 'Juan Pérez', domicilio: 'Calle 1', documento: 'DNI 1', email: 'juan@x.es' }, productos: 'Plataforma' });
const split = splitClauses(md, 14);
if (!split.ok) throw new Error(split.error);
const publicView = {
  status: 'abierta', ownerCompany: 'MOBIFORWORK S.L.', title: 'NDA MOBIFORWORK Juan Pérez', round: 1, version: 1,
  expiresAt: '2099-12-03T10:00:00.000Z', counterpartyName: 'Juan Pérez', showLevels: true,
  clauses: split.clauses.map(c => {
    const level = defaultLevel(MFW_PLAYBOOK, c.n);
    return { key: c.key, n: c.n, heading: c.heading, text: c.text, state: "pendiente", level, comments: [], canPropose: levelAllows(level).propose, reasonRequired: levelAllows(level).reasonRequired };
  }),
};

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'avocat_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, ads: false, v: 1, ts: 1 })), url: 'http://localhost:3000' }]);
});

async function mockPublic(page: Page, view: unknown, onPost?: (body: Record<string, unknown>) => unknown) {
  await page.route(`**/api/negotiations/public/${TOKEN}`, async r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: view });
    const body = r.request().postDataJSON();
    return r.fulfill({ json: onPost ? onPost(body) : { ok: true, status: 'cambios_propuestos', ownerCompany: 'MOBIFORWORK S.L.' } });
  });
}

for (const width of [375, 1280]) {
  test(`public review @${width}: propose on a negotiable clause with a reason, comment on a fixed one, send`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let posted: Record<string, unknown> | null = null;
    await mockPublic(page, publicView, b => { posted = b; return { ok: true, status: 'cambios_propuestos', ownerCompany: 'MOBIFORWORK S.L.' }; });
    await page.goto(`/negociacion/${TOKEN}`);
    await expect(page.getByRole('heading', { name: 'MOBIFORWORK S.L. te ha enviado un borrador de NDA' })).toBeVisible();
    await expect(page.getByText('0 de 14 cláusulas revisadas')).toBeVisible();

    const c1 = page.locator('#clause-c1');
    await expect(c1.getByText('Negociable')).toBeVisible();
    await c1.getByRole('button', { name: 'Propongo cambio' }).click();
    await c1.getByLabel('Tu redacción').fill('El objeto es la relación comercial entre las partes.');
    // Fixed clause: no "Propongo cambio".
    const c4 = page.locator('#clause-c4');
    await expect(c4.getByRole('button', { name: 'Propongo cambio' })).toHaveCount(0);
    await expect(c4.getByText('No modificable')).toBeVisible();

    // Sending without a reason (negociable) and with clauses unreviewed → errors, nothing posted.
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa las' })).toBeVisible();
    expect(posted).toBeNull();

    await c1.getByLabel(/Motivo/).fill('Limitar el alcance');
    await c4.getByRole('button', { name: 'Comento' }).click();
    await c4.getByLabel('Tu comentario').fill('¿Incluye el software de terceros?');
    for (const c of split.clauses) if (c.key !== 'c1' && c.key !== 'c4') await page.locator(`#clause-${c.key}`).getByRole('button', { name: 'Acepto' }).click();
    await expect(page.getByText('14 de 14 cláusulas revisadas')).toBeVisible();
    await page.screenshot({ path: `screenshots/negociacion-publica-${width}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(page.getByRole('heading', { name: 'Propuesta enviada' })).toBeVisible();
    const items = (posted as unknown as { items: { key: string; action: string; reason?: string; text?: string }[] }).items;
    expect(items.find(i => i.key === 'c1')).toMatchObject({ action: 'propongo', reason: 'Limitar el alcance' });
    expect(items.find(i => i.key === 'c4')).toMatchObject({ action: 'comento', text: '¿Incluye el software de terceros?' });
    expect(items.filter(i => i.action === 'acepto')).toHaveLength(12);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}

test('public review: accept the whole draft; expired, revoked and not-your-turn links show no clauses', async ({ page }) => {
  let posted: Record<string, unknown> | null = null;
  await mockPublic(page, publicView, b => { posted = b; return { ok: true, status: 'acordado', ownerCompany: 'MOBIFORWORK S.L.' }; });
  await page.goto(`/negociacion/${TOKEN}`);
  await page.getByRole('button', { name: 'Acepto el borrador completo' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { name: 'Has aceptado el borrador' })).toBeVisible();
  expect(posted).toMatchObject({ acceptAll: true });

  for (const [status, title] of [['caducada', 'Este enlace ha caducado'], ['revocada', 'Este enlace ya no está activo'], ['no_es_tu_turno', 'MOBIFORWORK S.L. está revisando tu propuesta']] as const) {
    await page.unroute(`**/api/negotiations/public/${TOKEN}`);
    await mockPublic(page, { status, ownerCompany: 'MOBIFORWORK S.L.', title: 'NDA', round: 1 });
    await page.goto(`/negociacion/${TOKEN}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('#clause-c1')).toHaveCount(0);
  }
});

test('owner prepare: change a level, send to review with the recipient', async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await page.route('**/api/negotiations', async r => { body = r.request().postDataJSON(); return r.fulfill({ json: { id: 'n1', status: 'en_revision', emailed: false, emailConfigured: false, link: `http://localhost:3000/negociacion/${TOKEN}` } }); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/e2e/negotiation');
  await expect(page.getByRole('heading', { name: 'Cláusulas y nivel de negociación' })).toBeVisible();
  await page.getByRole('group', { name: 'Nivel de la cláusula 5' }).getByText('No modificable').click();
  await page.screenshot({ path: 'screenshots/negociacion-preparar-1280.png' });
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByText('Negociación creada')).toBeVisible();
  await expect(page.getByLabel('Enlace de revisión')).toHaveValue(`http://localhost:3000/negociacion/${TOKEN}`);
  expect(body).toMatchObject({ draftDocumentId: 'd1', showLevels: true, clientId: 'c1', counterparty: { name: 'Juan Pérez', email: 'juan@acme.es', company: 'Acme S.L.' } });
  expect((body as unknown as { levels: Record<string, string> }).levels).toMatchObject({ c1: 'negociable', c4: 'no_modificable', c5: 'no_modificable', c12: 'modificable' });
});

test('owner respond: opens on the clause, counter-proposes, replies to the comment, sends round 2', async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await page.route('**/api/negotiations/n1/respond', async r => { body = r.request().postDataJSON(); return r.fulfill({ json: { id: 'n1', status: 'en_revision', emailed: true, emailConfigured: true, round: 2 } }); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/e2e/negotiation?estado=cambios&clausula=c1');
  await expect(page.getByRole('heading', { name: /Cláusula 1\. OBJETO/ })).toBeVisible();
  await expect(page.getByText('Limitarlo a la relación comercial')).toBeVisible();
  await expect(page.locator('ins').first()).toBeVisible();
  await expect(page.getByText('0 de 2 respondidas')).toBeVisible();
  const send = page.getByRole('button', { name: 'Enviar respuesta · ronda 2' });
  await expect(send).toBeDisabled();
  await page.getByLabel('Contrapropuesta').check();
  await page.getByLabel('Tu redacción').fill('El objeto es la relación comercial y los pilotos entre las partes.');
  await page.screenshot({ path: 'screenshots/negociacion-responder-1280.png' });
  await page.getByRole('button', { name: /4\. PROPIEDAD/ }).click();
  await page.getByLabel(/Responder al comentario/).fill('Sí, también el de terceros.');
  await expect(page.getByText('2 de 2 respondidas')).toBeVisible();
  await send.click();
  await expect(page.getByText('Respuesta enviada · ronda 2')).toBeVisible();
  expect(body).toMatchObject({
    decisions: [{ key: 'c1', action: 'contrapropuesta', text: 'El objeto es la relación comercial y los pilotos entre las partes.' }],
    replies: [{ key: 'c4', text: 'Sí, también el de terceros.' }],
  });
});

test('owner agreed: changes from the template and "Generar versión acordada"', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/e2e/negotiation?estado=acordado');
  await expect(page.getByText('Juan Pérez aceptó la versión 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cambios respecto a la plantilla (1)' })).toBeVisible();
  await expect(page.locator('ins', { hasText: '15' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generar versión acordada' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/negociacion-acordado-375.png', fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
