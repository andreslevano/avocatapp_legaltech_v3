/**
 * DocuSign Phase 0 spike — does anchor-based tab placement land on the NDA signature blocks?
 *
 * Creates a DRAFT envelope (status "created": nothing is emailed) with a sample NDA and two
 * signers whose signHere/dateSigned tabs are placed by the anchors \s1\ \d1\ (Parte A) and
 * \s2\ \d2\ (Parte B), then prints the sender-view URL so you can inspect where the tabs landed.
 *
 * Env (.env.local, demo account — get a token from the DocuSign OAuth Token Generator or the
 * API Explorer; it expires after ~8 h):
 *   DOCUSIGN_SPIKE_ACCESS_TOKEN   bearer token
 *   DOCUSIGN_SPIKE_ACCOUNT_ID     API Account ID (Apps & Keys page)
 *   DOCUSIGN_SPIKE_BASE_URI       e.g. https://demo.docusign.net  (Account Base URI, no /restapi)
 *
 * Usage:
 *   npx ts-node -P tsconfig.scripts.json scripts/docusign-spike.ts html   # HTML document (preferred)
 *   npx ts-node -P tsconfig.scripts.json scripts/docusign-spike.ts pdf    # text PDF via pdfkit
 *
 * Plain fetch against eSignature REST v2.1 (no docusign-esign SDK). Demo only.
 */
import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildDocHtml, countSignatureBlocks, dateAnchor, signatureAnchor } from '../src/lib/doc-html';

loadEnv({ path: '.env.local' });

const SAMPLE_NDA = `# ACUERDO DE CONFIDENCIALIDAD (UNILATERAL)

En Madrid, a 1 de noviembre de 2026.

## REUNIDOS

De una parte, **ACME S.L.**, con NIF B12345678 (en adelante, la "Parte Divulgante").

De otra parte, **NIKE IBERIA S.L.**, con NIF B87654321 (en adelante, la "Parte Receptora").

## CLÁUSULAS

**Primera. Objeto.** La Parte Receptora se obliga a mantener la confidencialidad de la información
que la Parte Divulgante le facilite con motivo de la evaluación de una posible colaboración comercial.

**Segunda. Duración.** Las obligaciones de confidencialidad se mantendrán durante dos (2) años.

**Tercera. Ley aplicable.** Este acuerdo se rige por la legislación española; los tribunales de Madrid
serán competentes.

## BLOQUE DE FIRMAS

**ACME S.L.**
Nombre: Ana Pérez
Cargo / Calidad: Administradora
Identificación: DNI 12345678Z
Domicilio: Calle Mayor 1, Madrid
Fecha: ____________
Firma: ________________________

**NIKE IBERIA S.L.**
Nombre: Juan García
Cargo / Calidad: Director Legal
Identificación: DNI 87654321X
Domicilio: Avenida de Europa 10, Madrid
Fecha: ____________
Firma: ________________________
`;

function env(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`Missing ${name} in .env.local`); process.exit(1); }
  return v.trim();
}

async function renderPdf(md: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 72 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(res => doc.on('end', () => res(Buffer.concat(chunks))));
  let sig = 0; let date = 0;
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\*\*/g, '');
    if (line.startsWith('# ')) { doc.font('Helvetica-Bold').fontSize(14).text(line.slice(2), { align: 'center' }).moveDown(); continue; }
    if (line.startsWith('## ')) { doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11).text(line.slice(3)).moveDown(0.3); continue; }
    const f = line.match(/^(Fecha|Firma):\s*_{4,}/);
    if (f) {
      const anchor = f[1] === 'Fecha' ? dateAnchor(++date) : signatureAnchor(++sig);
      doc.font('Helvetica').fontSize(10).fillColor('black').text(`${f[1]}: `, { continued: true })
        .fillColor('white').fontSize(1).text(anchor, { continued: true })
        .fillColor('black').fontSize(10).text(f[1] === 'Fecha' ? ' ______________' : ' ______________________________');
      continue;
    }
    doc.font('Helvetica').fontSize(10).fillColor('black').text(line || ' ');
  }
  doc.end();
  return done;
}

async function main() {
  const variant = (process.argv[2] ?? 'html') as 'html' | 'pdf';
  const token = env('DOCUSIGN_SPIKE_ACCESS_TOKEN');
  const accountId = env('DOCUSIGN_SPIKE_ACCOUNT_ID');
  const baseUri = env('DOCUSIGN_SPIKE_BASE_URI').replace(/\/+$/, '').replace(/\/restapi$/, '');
  const api = `${baseUri}/restapi/v2.1/accounts/${accountId}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const blocks = countSignatureBlocks(SAMPLE_NDA);
  let documentBase64: string;
  let fileExtension: string;
  if (variant === 'pdf') {
    const pdf = await renderPdf(SAMPLE_NDA);
    documentBase64 = pdf.toString('base64');
    fileExtension = 'pdf';
    writeFileSync(join(tmpdir(), 'docusign-spike.pdf'), pdf);
  } else {
    const html = buildDocHtml(SAMPLE_NDA, 'Acuerdo de confidencialidad', undefined, { authorName: 'ACME S.L.' }, { forSignature: true });
    documentBase64 = Buffer.from(html, 'utf8').toString('base64');
    fileExtension = 'html';
    writeFileSync(join(tmpdir(), 'docusign-spike.html'), html);
  }
  console.log(`Variant: ${variant} · signature blocks found: ${blocks} · local copy in ${tmpdir()}`);

  const signer = (n: number, name: string, email: string) => ({
    recipientId: String(n),
    routingOrder: String(n),
    name,
    email,
    tabs: {
      signHereTabs: [{ anchorString: signatureAnchor(n), anchorUnits: 'pixels', anchorXOffset: '20', anchorYOffset: '-10', anchorIgnoreIfNotPresent: 'false' }],
      dateSignedTabs: [{ anchorString: dateAnchor(n), anchorUnits: 'pixels', anchorXOffset: '20', anchorYOffset: '-4', anchorIgnoreIfNotPresent: 'false' }],
    },
  });

  const res = await fetch(`${api}/envelopes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      status: 'created',   // draft — nothing is sent
      emailSubject: `[SPIKE ${variant}] Acuerdo de confidencialidad ACME – NIKE`,
      documents: [{ documentId: '1', name: `NDA spike (${variant})`, fileExtension, documentBase64 }],
      recipients: {
        signers: [
          signer(1, 'Ana Pérez (Parte A)', 'parte-a@example.com'),
          signer(2, 'Juan García (Parte B)', 'parte-b@example.com'),
        ],
      },
    }),
  });
  const body = await res.json() as { envelopeId?: string; errorCode?: string; message?: string };
  if (!res.ok || !body.envelopeId) {
    console.error('Envelope creation failed:', res.status, body.errorCode, body.message);
    process.exit(1);
  }
  console.log('Envelope (draft) id:', body.envelopeId);

  const view = await fetch(`${api}/envelopes/${body.envelopeId}/views/sender`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ returnUrl: 'https://avocatapp.com' }),
  });
  const viewBody = await view.json() as { url?: string; message?: string };
  if (!view.ok || !viewBody.url) {
    console.error('Sender view failed:', view.status, viewBody.message);
    console.log('Open the draft in DocuSign → Agreements → Drafts instead.');
    return;
  }
  console.log('\nOpen this URL (valid ~5 min) and check that each signer\'s Sign/Date tabs sit on their');
  console.log('"Firma:" / "Fecha:" lines in the BLOQUE DE FIRMAS:\n');
  console.log(viewBody.url);
}

main().catch(err => { console.error(err); process.exit(1); });
