'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';

interface ExtractedField { key: string; value: string; }
interface ExtractionResult {
  country: string;
  documentType: string;
  emisor: string;
  receptor: string;
  fields: ExtractedField[];
}

export default function ExtraccionDatosPage() {
  const { userDoc } = useAppAuth();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!text.trim()) return setError('Introduce el texto del documento.');
    setError('');
    setExtracting(true);
    setResult(null);

    const prompt = `Extrae los datos del siguiente documento y devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura:
{
  "country": "país de origen",
  "documentType": "Factura | Contrato | Recibo | Demanda | Sentencia | Escritura | Otro",
  "emisor": "nombre del emisor o parte 1",
  "receptor": "nombre del receptor o parte 2",
  "fields": [
    {"key": "campo", "value": "valor"}
  ]
}
Extrae máximo 20 campos relevantes según el tipo de documento. Usa "-" si no hay valor.

Documento: ${fileName || 'Sin nombre'}
${text.slice(0, 12000)}`;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], userPlan: userDoc.plan, caseContext: null }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
        }
      }
      const clean = accumulated.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      setResult(JSON.parse(clean));
    } catch {
      setError('Error al extraer los datos. Intenta de nuevo.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const rows = [
      ['Campo', 'Valor'],
      ['País', result.country],
      ['Tipo', result.documentType],
      ['Emisor', result.emisor],
      ['Receptor', result.receptor],
      ...result.fields.map(f => [f.key, f.value]),
    ];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraccion-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Extracción de Datos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0]">Documento</h3>
            </div>
            <input
              type="text"
              placeholder="Nombre del documento (opcional)"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="w-full mb-3 bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2 text-[12px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
            />
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Pega el texto del documento (factura, contrato, escritura, sentencia...)&#10;&#10;Tip: Para PDFs, copia el texto y pégalo aquí."
              className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed"
            />
            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
            <div className="mt-3 flex justify-end">
              <Button variant="BtnGold" size="md" loading={extracting} onClick={handleExtract}>
                Extraer datos
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2e2b20] flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">{result.documentType}</h3>
                  <p className="text-[11px] text-[#6b6050]">{result.country}</p>
                </div>
                <Button variant="BtnOutlineDark" size="sm" onClick={handleExportCSV}>
                  Exportar CSV
                </Button>
              </div>
              <div className="px-5 py-3 border-b border-[#2e2b20] grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-[#6b6050]">Emisor: </span><span className="text-[#c8c0ac]">{result.emisor}</span></div>
                <div><span className="text-[#6b6050]">Receptor: </span><span className="text-[#c8c0ac]">{result.receptor}</span></div>
              </div>
              <div className="divide-y divide-[#2e2b20]">
                {result.fields.map((f, i) => (
                  <div key={i} className="flex items-center px-5 py-2.5 text-[12px]">
                    <span className="w-1/2 text-[#6b6050] font-medium">{f.key}</span>
                    <span className="w-1/2 text-[#c8c0ac]">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
