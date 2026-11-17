import { notFound } from 'next/navigation';
import Harness from './Harness';

// Test-only page: the "Productos Protegidos" editor (formatting toolbar + document preview).
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Harness />;
}
