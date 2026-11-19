import { notFound } from 'next/navigation';
import NegotiationHarness from './Harness';

// Test-only page for tests/e2e/negotiation.e2e.spec.ts: the owner's negotiation screens (prepare,
// respond, agreed) with a fake signed-in user, against mocked API routes. Never served in production.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <NegotiationHarness />;
}
