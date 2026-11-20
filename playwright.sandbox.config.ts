import { defineConfig } from '@playwright/test';

// Yousign sandbox checks (Y0) — real API calls, run by hand only:
//   npx playwright test -c playwright.sandbox.config.ts
// Needs YOUSIGN_API_KEY + YOUSIGN_API_BASE (sandbox) in .env.local. Never prints the key.
export default defineConfig({
  testDir: './tests/sandbox',
  testMatch: /.*\.sandbox\.spec\.ts$/,
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
});
