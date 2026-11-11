#!/usr/bin/env node
// Avocat DS v4 guard — fails CI when raw colours or off-system classes enter src/.
// Usage: node scripts/check-design-tokens.mjs [--baseline .ds-baseline.json] [--update-baseline]
// With a baseline it only fails on NEW violations (ratchet), so it can land on day 1.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ALLOW = new Set(['src/lib/tokens.ts', 'src/styles/globals.css']);
const RULES = [
  { id: 'raw-hex', re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, msg: 'Raw hex colour — use a role class (bg-surface, text-text-muted…) or tokens.ts' },
  { id: 'arbitrary-color', re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder)-\[(?:#|rgb|hsl)[^\]]*\]/g, msg: 'Arbitrary Tailwind colour' },
  { id: 'tw-default-color', re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|placeholder)-(?:red|green|yellow|blue|emerald|orange|gray|slate|zinc|neutral|stone|amber|lime|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g, msg: 'Tailwind default palette — map with the v4 find/replace table' },
  { id: 'arbitrary-text-size', re: /\btext-\[\d+(?:px|rem)\]/g, msg: 'Arbitrary font size — use text-body-sm, text-small, text-caption, text-label…' },
  { id: 'raw-font', re: /(Times New Roman|Arial|Helvetica)/g, msg: 'Hard-coded typeface — use .legal-doc (font-document) or font-sans' },
  { id: 'v3-alias', re: /\b(?:bg|text|border)-(?:avocat-[a-z0-9-]+|ds-(?:bg|card2?|border|text|head))\b/g, msg: 'Deprecated v3 alias — use the v4 role' },
];

const files = execSync("git ls-files 'src/**/*.ts' 'src/**/*.tsx' 'src/**/*.css'", { encoding: 'utf8' })
  .split('\n').filter(f => f && !ALLOW.has(f));
const found = {};
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const r of RULES) {
    const n = (src.match(r.re) || []).length;
    if (n) (found[f] ??= {})[r.id] = n;
  }
}
const args = process.argv.slice(2);
const bi = args.indexOf('--baseline');
const basePath = bi >= 0 ? args[bi + 1] : null;
if (args.includes('--update-baseline') && basePath) {
  writeFileSync(basePath, JSON.stringify(found, null, 1));
  console.log(`baseline written: ${Object.keys(found).length} files`);
  process.exit(0);
}
const base = basePath && existsSync(basePath) ? JSON.parse(readFileSync(basePath, 'utf8')) : {};
let fail = 0;
for (const [f, ids] of Object.entries(found)) {
  for (const [id, n] of Object.entries(ids)) {
    const allowed = base[f]?.[id] ?? 0;
    if (n > allowed) {
      fail++;
      console.error(`✖ ${f}: ${id} ${n} (baseline ${allowed}) — ${RULES.find(r => r.id === id).msg}`);
    }
  }
}
const total = Object.values(found).reduce((a, o) => a + Object.values(o).reduce((x, y) => x + y, 0), 0);
console.log(`design-token guard: ${total} remaining violations in ${Object.keys(found).length} files; ${fail} new`);
process.exit(fail ? 1 : 0);
