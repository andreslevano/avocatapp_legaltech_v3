import { notFound } from 'next/navigation';
import SignSheetHarness from './Harness';

// Test-only page for tests/e2e/sign-sheet.e2e.spec.ts (Phase 5c): renders the "Firmar y enviar"
// sheet with a fake signed-in user so Playwright can drive it against mocked API routes.
// Never served in production builds.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <SignSheetHarness />;
}
