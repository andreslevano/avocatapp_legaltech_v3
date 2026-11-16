import { notFound } from 'next/navigation';
import Harness from './Harness';

// Test-only page: the full-screen document viewer with sample files (served by the e2e test's routes).
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Harness />;
}
