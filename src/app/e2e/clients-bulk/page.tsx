import { notFound } from 'next/navigation';
import Harness from './Harness';

// Test-only page: the Clientes bulk-action bar with sample clients (API calls are mocked by the test).
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Harness />;
}
