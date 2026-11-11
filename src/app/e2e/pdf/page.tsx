import { notFound } from 'next/navigation';
import PdfHarness from './Harness';

// Test-only page: builds the PDF of a sample document with the real exporter (buildPdfBlob) so the
// page breaks can be checked visually. Never served in production builds.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PdfHarness />;
}
