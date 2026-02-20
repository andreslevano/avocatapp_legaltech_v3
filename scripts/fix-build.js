#!/usr/bin/env node

/**
 * Workaround script for Next.js 14.2.32 static export build issues
 * - pages-manifest.json ENOENT
 * - _error.js.nft.json ENOENT during Collecting build traces
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const serverDir = path.join(nextDir, 'server');
const pagesDir = path.join(serverDir, 'pages');

// Ensure .next/server and .next/server/pages exist
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
}
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

// Always create/overwrite pages-manifest.json
const manifestPath = path.join(serverDir, 'pages-manifest.json');
fs.writeFileSync(manifestPath, '{}');

// Always create _error.js.nft.json (prevents ENOENT during Collecting build traces)
const nftPath = path.join(serverDir, 'pages', '_error.js.nft.json');
fs.writeFileSync(nftPath, '[]');

// next-font-manifest.json (required during export phase)
const fontManifestPath = path.join(serverDir, 'next-font-manifest.json');
fs.writeFileSync(fontManifestPath, '{}');

// app-paths-manifest.json (required during Collecting page data)
const appPathsPath = path.join(serverDir, 'app-paths-manifest.json');
fs.writeFileSync(appPathsPath, '{}');

// middleware-manifest.json (required - must have version, middleware, functions, sortedMiddleware)
const middlewareManifest = JSON.stringify({
  version: 3,
  middleware: {},
  functions: {},
  sortedMiddleware: []
});
fs.writeFileSync(path.join(serverDir, 'middleware-manifest.json'), middlewareManifest);

// server-reference-manifest.json (required during Collecting page data)
fs.writeFileSync(path.join(serverDir, 'server-reference-manifest.json'), '{}');

console.log('✓ Build fix applied: Created .next/server manifests');



