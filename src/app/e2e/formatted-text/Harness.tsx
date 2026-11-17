'use client';

import { useState } from 'react';
import FormattedTextarea from '@/components/forms/FormattedTextarea';
import { productosBlock } from '@/lib/org-templates/mobiforwork-nda';

export default function Harness() {
  const [v, setV] = useState('Plataforma Norte\nPortal de fabricantes');
  return (
    <div data-theme="dark" className="min-h-screen bg-bg p-6 max-w-2xl">
      <FormattedTextarea id="productos" label="Productos Protegidos *" value={v} onChange={setV} toDocument={productosBlock} />
      <pre id="raw" className="mt-4 text-text">{v}</pre>
    </div>
  );
}
