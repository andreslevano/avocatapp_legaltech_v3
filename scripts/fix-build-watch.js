#!/usr/bin/env node
/**
 * Watch: only create manifest files if they DON'T exist.
 * Never overwrite pages-manifest.json - Next.js populates it during build.
 */
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function applyFix() {
  const serverDir = path.join(process.cwd(), '.next', 'server');
  const pagesDir = path.join(serverDir, 'pages');
  if (!fs.existsSync(path.join(process.cwd(), '.next'))) return;

  ensureDir(serverDir);
  ensureDir(pagesDir);

  const manifestPath = path.join(serverDir, 'pages-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    try { fs.writeFileSync(manifestPath, '{}'); } catch (_) {}
  }

  const nftPath = path.join(pagesDir, '_error.js.nft.json');
  if (!fs.existsSync(nftPath)) {
    try { fs.writeFileSync(nftPath, '[]'); } catch (_) {}
  }

  const fontPath = path.join(serverDir, 'next-font-manifest.json');
  if (!fs.existsSync(fontPath)) {
    try { fs.writeFileSync(fontPath, '{}'); } catch (_) {}
  }

  const appPathsPath = path.join(serverDir, 'app-paths-manifest.json');
  if (!fs.existsSync(appPathsPath)) {
    try { fs.writeFileSync(appPathsPath, '{}'); } catch (_) {}
  }

  const middlewarePath = path.join(serverDir, 'middleware-manifest.json');
  if (!fs.existsSync(middlewarePath)) {
    try {
      fs.writeFileSync(middlewarePath, JSON.stringify({
        version: 3,
        middleware: {},
        functions: {},
        sortedMiddleware: []
      }));
    } catch (_) {}
  }

  const srPath = path.join(serverDir, 'server-reference-manifest.json');
  if (!fs.existsSync(srPath)) {
    try { fs.writeFileSync(srPath, '{}'); } catch (_) {}
  }
}

applyFix();
const iv = setInterval(applyFix, 200);
setTimeout(() => { clearInterval(iv); process.exit(0); }, 300000);
