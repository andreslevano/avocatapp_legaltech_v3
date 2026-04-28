'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';

interface EmailAnalysis {
  categoria: string;
  urgencia: 'alta' | 'media' | 'baja';
  ideasPrincipales: string[];
  accionesRequeridas: string[];
  riesgoLegal: string;
  resumen: string;
}

export default function RevisionEmailPage() {
  const { userDoc } = useAppAuth();
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<EmailAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!emailText.trim()) return setError('Introduce el contenido del email a analizar.');
    setError('');
    setAnalyzing(true);
    setResult(null);

    const prompt = `Analiza el siguiente email y devuelve un JSON con la estructura exacta (sin markdown):
{
  "categoria": "Categoría del email (legal, comercial, notificación, demanda, etc.)",
  "urgencia": "alta | media | baja",
  "ideasPrincipales": ["idea 1", "idea 2"],
  "accionesRequeridas": ["acción requerida 1", "acción 2"],
  "riesgoLegal": "Descripción del riesgo legal si aplica, o 'Sin riesgo aparente'",
  "resumen": "Resumen del email en 1-2 frases"
}

Email a analizar:
${emailText}`;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          userPlan: userDoc.plan,
          caseContext: null,
        }),
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
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch {
      setError('Error al analizar el email. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const urgenciaColor: Record<string, string> = {
    alta: 'text-red-400 bg-red-400/10 border-red-400/20',
    media: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    baja: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Revisión de Email"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0] mb-3">Contenido del email</h3>
            <textarea
              rows={8}
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              placeholder="Pega aquí el contenido del email legal a analizar..."
              className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed"
            />
            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
            <div className="mt-3 flex justify-end">
              <Button variant="BtnGold" size="md" loading={analyzing} onClick={handleAnalyze}>
                Analizar email
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-sans font-medium text-[#c8c0ac]">{result.categoria}</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${urgenciaColor[result.urgencia] ?? urgenciaColor.media}`}>
                  Urgencia {result.urgencia}
                </span>
              </div>
              <p className="text-[12px] text-[#6b6050] leading-relaxed">{result.resumen}</p>

              {[
                { label: 'Ideas principales', items: result.ideasPrincipales, color: 'text-[#c8c0ac]' },
                { label: 'Acciones requeridas', items: result.accionesRequeridas, color: 'text-avocat-gold' },
              ].map(({ label, items, color }) =>
                items?.length ? (
                  <div key={label}>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">{label}</p>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className={`text-[12px] ${color}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}

              {result.riesgoLegal && result.riesgoLegal !== 'Sin riesgo aparente' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-red-400 mb-1">Riesgo legal</p>
                  <p className="text-[12px] text-red-400">{result.riesgoLegal}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
