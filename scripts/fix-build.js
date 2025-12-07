#!/usr/bin/env node

/**
 * Workaround script for Next.js 14.2.32 static export pages-manifest.json bug
 * Creates the required directory structure before Next.js tries to read it
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const serverDir = path.join(nextDir, 'server');

// Ensure .next/server directory exists
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
}

// Create empty pages-manifest.json if it doesn't exist
const manifestPath = path.join(serverDir, 'pages-manifest.json');
if (!fs.existsSync(manifestPath)) {
  fs.writeFileSync(manifestPath, '{}');
}

console.log('✓ Build fix applied: Created .next/server/pages-manifest.json');

