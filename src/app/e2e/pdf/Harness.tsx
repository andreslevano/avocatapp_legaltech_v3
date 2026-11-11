'use client';

import { useEffect, useState } from 'react';
import { buildPdfBlob } from '@/lib/agent-export';
import { renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';

export default function PdfHarness() {
  const [b64, setB64] = useState('');
  useEffect(() => {
    const md = renderMfwNda({
      receptor: { tipo: 'sociedad', razonSocial: 'ACME SL', nif: 'B12345678', domicilio: 'C/ Mayor 1, Madrid', nombre: 'Ana Pérez', documento: 'DNI 12345678Z', cargo: 'Administradora', facultades: 'escritura de poder nº 123', email: 'ana@acme.es' },
      productos: 'Plataforma Mobility For Work\nPortal de fabricantes',
    });
    buildPdfBlob(md, 'NDA prueba', undefined, { authorName: 'MOBIFORWORK S.L.', authorNif: 'CIF ESB22430706' })
      .then(({ blob }) => blob.arrayBuffer())
      .then(buf => {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        setB64(btoa(bin));
      })
      .catch(e => setB64(`ERROR ${(e as Error).message}`));
  }, []);
  return <textarea id="pdf" readOnly value={b64} style={{ width: 400, height: 100 }} />;
}
