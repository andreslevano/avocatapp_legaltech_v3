import { notFound } from 'next/navigation';
import Harness from './Harness';

// Test-only page: the client detail panel with sample client, cases and documents.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Harness />;
}
