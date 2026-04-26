'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const DOC_TYPES = [
  { value: 'demanda_ordinario', label: 'Demanda — Juicio Ordinario' },
  { value: 'demanda_verbal', label: 'Demanda — Juicio Verbal' },
  { value: 'demanda_despido', label: 'Demanda por Despido Improcedente' },
  { value: 'recurso_apelacion', label: 'Recurso de Apelación' },
  { value: 'recurso_reposicion', label: 'Recurso de Reposición' },
  { value: 'contrato_arrendamiento', label: 'Contrato de Arrendamiento' },
  { value: 'contrato_prestacion', label: 'Contrato de Prestación de Servicios' },
  { value: 'burofax', label: 'Burofax / Carta Formal' },
  { value: 'escrito_oposicion', label: 'Escrito de Oposición' },
  { value: 'medidas_cautelares', label: 'Solicitud de Medidas Cautelares' },
];

export default function GeneracionPage() {
  const [docType, setDocType] = useState('demanda_ordinario');
  const [details, setDetails] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const selectedLabel = DOC_TYPES.find(d => d.value === docType)?.label ?? docType;

  const handleGenerate = async () => {
    if (!details.trim()) return setError('Describe los hechos y detalles del caso.');
    setError('');
    setGenerating(true);
    setResult('');

    const prompt = `Genera un documento legal profesional de tipo "${selectedLabel}" en Derecho español.

Detalles del caso:
${details}

Requisitos:
- Formato oficial con todos los apartados necesarios
- Lenguaje jurídico formal y preciso
- Incluir: encabezado, partes, hechos, fundamentos de derecho, petición y firma
- Usar terminología jurídica española actualizada`;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], userPlan: 'Abogados', caseContext: null }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
      }
    } catch {
      setError('Error al generar el documento. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Generación de Escritos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Form */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Tipo de documento
              </label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40"
              >
                {DOC_TYPES.map(d => (
                  <option key={d.value} value={d.value} className="bg-[#161410]">{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Hechos y detalles del caso *
              </label>
              <textarea
                rows={6}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe los hechos relevantes, partes involucradas, fechas, pretensiones, fundamentos jurídicos...&#10;&#10;Cuanto más detallado, mejor será el documento generado."
                className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed"
              />
            </div>

            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <div className="flex justify-end">
              <Button variant="BtnGold" size="md" loading={generating} onClick={handleGenerate}>
                Generar documento
              </Button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2e2b20] flex items-center justify-between">
                <span className="text-[13px] font-sans font-semibold text-[#e8d4a0]">{selectedLabel}</span>
                <div className="flex gap-2">
                  <Button variant="BtnGhost" size="sm" onClick={handleCopy}>Copiar</Button>
                  <Button variant="BtnOutlineDark" size="sm" onClick={handleDownload}>Descargar .txt</Button>
                </div>
              </div>
              <pre className="px-5 py-4 text-[12px] font-sans text-[#c8c0ac] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto">
                {result}
                {generating && <span className="inline-block w-1 h-3 bg-avocat-gold animate-pulse ml-0.5 align-middle" />}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
