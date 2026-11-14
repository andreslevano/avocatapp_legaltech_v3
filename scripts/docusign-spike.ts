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
 *   … spike.ts html you@example.com   # easier: reuse the connection made in Perfil → Integraciones
 *                                      # (no DOCUSIGN_SPIKE_* vars needed)
 *   … spike.ts html you@example.com --branded[=webfont]
 *        # document branding check: 120×40 PNG logo (data URI), navy header, Lato. Default sends the
 *        # forSignature web-safe stack (what production sends); =webfont keeps the Google Fonts link
 *        # to see whether DocuSign's HTML conversion loads web fonts.
 *
 * Plain fetch against eSignature REST v2.1 (no docusign-esign SDK). Demo only.
 */
import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildDocHtml, countSignatureBlocks, dateAnchor, signatureAnchor } from '../src/lib/doc-html';
import { DEFAULT_BRANDING, resolveBranding, withLogoSrc, withSafeFont } from '../src/lib/branding';

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

// Credentials: either the DocuSign connection an Avocat user made in Perfil → Integraciones
// (pass their email as the 2nd arg — uses firebase-admin + the same token store as the app),
// or a manual token from DOCUSIGN_SPIKE_* env vars.
async function resolveCredentials(email?: string): Promise<{ token: string; accountId: string; baseUri: string }> {
  if (email) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily, after path aliases are registered
    require('tsconfig-paths').register({ baseUrl: join(__dirname, '..'), paths: { '@/*': ['src/*'] } });
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily, after path aliases are registered
    const { authAdmin } = require('../src/lib/firebase-admin');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily, after path aliases are registered
    const { getValidAccessToken } = require('../src/lib/docusign/tokens');
    const user = await authAdmin().getUserByEmail(email);
    const c = await getValidAccessToken(user.uid);
    return { token: c.accessToken, accountId: c.accountId, baseUri: c.baseUri };
  }
  return {
    token: env('DOCUSIGN_SPIKE_ACCESS_TOKEN'),
    accountId: env('DOCUSIGN_SPIKE_ACCOUNT_ID'),
    baseUri: env('DOCUSIGN_SPIKE_BASE_URI').replace(/\/+$/, '').replace(/\/restapi$/, ''),
  };
}

/** Solid navy 120×40 PNG — generated, so the spike needs no binary fixture. */
function spikeLogoPng(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deflateSync } = require('zlib');
  const w = 120, h = 40;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 4 + 1) + 1 + x * 4;
    const ring = x < 4 || x >= w - 4 || y < 4 || y >= h - 4;
    raw[o] = ring ? 0xb8 : 0x1f; raw[o + 1] = ring ? 0x88 : 0x3a; raw[o + 2] = ring ? 0x2a : 0x5f; raw[o + 3] = 255;
  }
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function spikeBranding(webFont: boolean) {
  const r = resolveBranding({ branding: {
    ...DEFAULT_BRANDING, logoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/spike.png', logoWidth: 120, logoHeight: 40,
    colors: { primary: '#1f3a5f', secondary: '#5b6b7f' }, font: 'lato', applyColorsToHeadings: true,
  } });
  const b = withLogoSrc(r, spikeLogoPng());
  return webFont ? b : withSafeFont(b);
}

async function main() {
  const variant = (process.argv[2] ?? 'html') as 'html' | 'pdf';
  const brandedArg = process.argv.find(a => a.startsWith('--branded'));
  const { token, accountId, baseUri } = await resolveCredentials(process.argv[3]?.startsWith('--') ? undefined : process.argv[3]);
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
    const html = buildDocHtml(SAMPLE_NDA, 'Acuerdo de confidencialidad', undefined, { authorName: 'ACME S.L.' },
      { forSignature: true, branding: brandedArg ? spikeBranding(brandedArg.endsWith('=webfont')) : undefined });
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
      signHereTabs: [{ anchorString: signatureAnchor(n), anchorUnits: 'pixels', anchorXOffset: '20', anchorYOffset: '16', anchorIgnoreIfNotPresent: 'false' }],
      dateSignedTabs: [{ anchorString: dateAnchor(n), anchorUnits: 'pixels', anchorXOffset: '20', anchorYOffset: '6', anchorIgnoreIfNotPresent: 'false' }],
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
