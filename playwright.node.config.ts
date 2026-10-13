import { defineConfig } from '@playwright/test';

// Node-only tests (pure unit tests + Firestore rules against the emulator).
// Unlike playwright.config.ts, this does not start the Next.js dev server.
//   npm run test:node   → tests/unit/*.node.spec.ts
//   npm run test:rules  → tests/rules (wrapped in `firebase emulators:exec`)
export default defineConfig({
  testDir: './tests',
  testMatch: ['unit/**/*.node.spec.ts', 'rules/**/*.spec.ts'],
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
});
