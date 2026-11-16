import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

// Full-screen document viewer (harness: src/app/e2e/doc-viewer, dev only). Files are served by routes.
const OUT = resolve(__dirname, '../../test-results/doc-viewer');
const NDA_DOC = '﻿<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>NDA</title></head><body><h1>ACUERDO DE CONFIDENCIALIDAD</h1><p>Texto del acuerdo Avocat.</p><div class="doc-footer">x</div></body></html>';

async function serveFiles(page: Page) {
  const docx = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph({ text: 'DEMANDA DE JUICIO VERBAL', heading: HeadingLevel.HEADING_1 }),
    new Paragraph('Hechos del caso en un Word subido.'),
  ] }] }));
  await page.route('**/e2e-files/sample.pdf', r => r.fulfill({ contentType: 'application/pdf', body: readFileSync(resolve(__dirname, '../fixtures/sample.pdf')) }));
  await page.route('**/e2e-files/nda.doc', r => r.fulfill({ contentType: 'application/msword', body: NDA_DOC }));
  await page.route('**/e2e-files/demanda.docx', r => r.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: docx }));
}

test('viewer renders PDF, Avocat .doc and .docx; navigates; closes with Esc', async ({ page }) => {
  await serveFiles(page);
  await page.goto('/e2e/doc-viewer');

  // side-panel (compact) render of the Avocat .doc
  await expect(page.frameLocator('#panel iframe').getByText('ACUERDO DE CONFIDENCIALIDAD')).toBeVisible();

  await page.click('#open-doc');
  const dialog = page.getByRole('dialog', { name: 'NDA_Avocat.doc' });
  await expect(dialog).toBeVisible();
  await expect(dialog.frameLocator('iframe').getByText('Texto del acuerdo Avocat.')).toBeVisible();
  await expect(dialog.getByText('2 de 4')).toBeVisible();
  await page.screenshot({ path: `${OUT}/doc-1280.png` });

  await page.keyboard.press('ArrowRight');
  const docx = page.getByRole('dialog', { name: 'Demanda.docx' });
  await expect(docx.frameLocator('iframe').getByText('DEMANDA DE JUICIO VERBAL')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `${OUT}/docx-1280.png` });

  await page.getByRole('button', { name: 'Documento siguiente' }).click();
  await expect(page.getByRole('dialog', { name: 'Datos.xlsx' }).getByText(/no tienen vista previa/)).toBeVisible();

  await page.getByRole('button', { name: 'Documento siguiente' }).click();   // wraps to the PDF
  const pdf = page.getByRole('dialog', { name: 'Contrato.pdf' });
  await expect(pdf.locator('iframe')).toHaveAttribute('src', '/e2e-files/sample.pdf');

  await page.keyboard.press('Escape');
  await expect(page.locator('[aria-labelledby="viewer-title"]')).toHaveCount(0);
});

test('mobile: viewer is full screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await serveFiles(page);
  await page.goto('/e2e/doc-viewer');
  await page.click('#open-doc');
  const viewer = page.locator('[aria-labelledby="viewer-title"]');
  const box = await viewer.boundingBox();
  expect(box?.width).toBe(375);
  await expect(viewer.frameLocator('iframe').getByText('ACUERDO DE CONFIDENCIALIDAD')).toBeVisible();
  await page.screenshot({ path: `${OUT}/doc-375.png` });
});
