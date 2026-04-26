'use client';

import { useState, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface AnalisisResult {
  resumen: string;
  tipo: string;
  partes: string[];
  fechasClave: string[];
  riesgos: string[];
  recomendaciones: string[];
  clausulasClave: string[];
}

async function readFileAsText(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string ?? '');
      reader.readAsText(file);
    });
  }
  return `[Archivo: ${file.name} — ${(file.size / 1024).toFixed(1)} KB. Para análisis completo de PDF/DOCX, pega el texto del documento en el área de texto.]`;
}

export default function AnalisisPage() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalisisResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const content = await readFileAsText(file);
    setText(content);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return setError('Introduce o pega el texto del documento.');
    setError('');
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('/api/tools/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setError((err as Error).message || 'Error al analizar el documento.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Análisis de Documentos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Input area */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0]">
                Documento a analizar
              </h3>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} className="hidden" />
                <Button variant="BtnOutlineDark" size="sm" onClick={() => fileRef.current?.click()}>
                  Cargar .txt
                </Button>
              </div>
            </div>
            {fileName && (
              <p className="text-[11px] text-avocat-gold mb-2">Archivo: {fileName}</p>
            )}
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Pega aquí el texto del documento legal a analizar (contrato, demanda, sentencia, escritura...)&#10;&#10;Para PDF/DOCX: copia el texto del documento y pégalo aquí."
              className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors resize-none leading-relaxed"
            />
            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
            <div className="mt-3 flex justify-end">
              <Button variant="BtnGold" size="md" loading={analyzing} onClick={handleAnalyze}>
                Analizar documento
              </Button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">Resumen ejecutivo</p>
                <p className="text-[13px] text-[#c8c0ac] leading-relaxed">{result.resumen}</p>
                {result.tipo && (
                  <p className="mt-2 text-[12px] text-avocat-gold">Tipo: {result.tipo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'riesgos', label: 'Riesgos y puntos de atención', color: 'text-red-400' },
                  { key: 'recomendaciones', label: 'Recomendaciones', color: 'text-emerald-400' },
                  { key: 'clausulasClave', label: 'Cláusulas clave', color: 'text-avocat-gold' },
                  { key: 'partes', label: 'Partes involucradas', color: 'text-[#c8c0ac]' },
                ].map(({ key, label, color }) => {
                  const items = result[key as keyof AnalisisResult] as string[];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">{label}</p>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className={`text-[12px] leading-snug ${color}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
