import { notFound } from 'next/navigation';
import WizardHarness from './Harness';

// Test-only page: renders the v4 document wizards (no auth, no payment) for visual checks at
// 375 / 768 / 1280 px. ?proc=tutela for the tutela wizard, ?theme=light for the light theme.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <WizardHarness />;
}
