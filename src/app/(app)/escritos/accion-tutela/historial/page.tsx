'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, FileText, Lightbulb, TriangleAlert, X } from 'lucide-react';

interface TutelaHistoryItem {
  fechaISO: string;
  derecho: string;
  ciudad: string;
  estado: string;
  documentId: string;
  storagePath?: string;
}

export default function TutelaHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<TutelaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // TODO(ds-v4): pre-existing — the history API is called with uid=demo_user, not the signed-in user.
      const response = await fetch('/api/accion-tutela/history?uid=demo_user');
      if (!response.ok) {
        throw new Error('Error obteniendo el historial');
      }
      
      const data = await response.json();
      if (data.success) {
        setItems(data.data.items);
      } else {
        throw new Error(data.error?.message || 'Error en la respuesta');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/download?uid=demo_user`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accion-tutela-${docId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Error descargando el documento');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAnalyzeWithAI = async (docId: string) => {
    try {
      setAnalyzingDoc(docId);
      setError(null);

      const response = await fetch('/api/analyze-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: 'demo_user',
          docId: docId,
          prompt: 'Analiza este documento de Acción de Tutela y proporciona un análisis legal detallado incluyendo riesgos, fortalezas y recomendaciones.',
          analysisType: 'legal'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error analizando documento');
      }

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data.data);
        setShowAnalysisModal(true);
      } else {
        throw new Error(data.error || 'Error en el análisis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analizando documento');
    } finally {
      setAnalyzingDoc(null);
    }
  };

  const getDerechoLabel = (derecho: string) => {
    const derechosMap: Record<string, string> = {
      'vida': 'Derecho a la vida',
      'salud': 'Derecho a la salud',
      'minimo_vital': 'Derecho al mínimo vital',
      'peticion': 'Derecho de petición',
      'debido_proceso': 'Derecho al debido proceso',
      'igualdad': 'Derecho a la igualdad',
      'educacion': 'Derecho a la educación',
      'libertad_expresion': 'Derecho a la libertad de expresión',
      'intimidad': 'Derecho a la intimidad',
      'habeas_data': 'Derecho al hábeas data'
    };
    return derechosMap[derecho] || derecho;
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-surface rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-status-en-revision-border mx-auto"></div>
                <p className="mt-4 text-text-muted">Cargando historial...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
        <div className="bg-surface rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              Historial de Acciones de Tutela
            </h1>
            <p className="text-text-muted">
              Lista de todas las acciones de tutela generadas
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger-subtle border border-status-urgente-border rounded-md">
              <p className="text-danger-text">{error}</p>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-text-muted mb-4" aria-hidden />
              <h3 className="text-lg font-medium text-text mb-2">
                No hay tutelas generadas
              </h3>
              <p className="text-text-muted mb-6">
                Genera tu primera acción de tutela para verla aquí
              </p>
              <button
                onClick={() => router.push('/escritos/accion-tutela')}
                className="px-6 py-2 bg-accent text-text-on-accent rounded-md hover:bg-accent-hover"
              >
                Generar Tutela
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Derecho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Ciudad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-bg">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {formatDate(item.fechaISO)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {getDerechoLabel(item.derecho)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {item.ciudad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-success-subtle text-success-text">
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadDocument(item.documentId)}
                            className="text-info-text hover:text-info-text"
                          >
                            Descargar
                          </button>
                          <button
                            onClick={() => handleAnalyzeWithAI(item.documentId)}
                            disabled={analyzingDoc === item.documentId}
                            className="text-info-text hover:text-info-text disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {analyzingDoc === item.documentId ? 'Analizando...' : 'Analizar con IA'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => router.push('/escritos/accion-tutela')}
              className="px-6 py-2 border border-border rounded-md text-text-muted hover:bg-bg"
            >
              Volver al Dashboard
            </button>
            <button
              onClick={() => router.push('/escritos/accion-tutela')}
              className="px-6 py-2 bg-accent text-text-on-accent rounded-md hover:bg-accent-hover"
            >
              Nueva Tutela
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Modal de Análisis con IA */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-text">
                  Análisis con IA
                </h3>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  aria-label="Cerrar"
                  className="text-text-muted hover:text-text-muted text-xl"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Resumen */}
                <div>
                  <h4 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><ClipboardList size={18} aria-hidden /> Resumen</h4>
                  <div className="bg-bg p-4 rounded-lg">
                    <p className="text-text-muted">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Riesgos */}
                {analysisResult.risks && analysisResult.risks.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><TriangleAlert size={18} aria-hidden /> Riesgos Identificados</h4>
                    <div className="bg-danger-subtle p-4 rounded-lg">
                      <ul className="space-y-2">
                        {analysisResult.risks.map((risk: string, index: number) => (
                          <li key={index} className="text-danger-text">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><Lightbulb size={18} aria-hidden /> Recomendaciones</h4>
                    <div className="bg-success-subtle p-4 rounded-lg">
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-success-text">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Análisis Completo */}
                <div>
                  <h4 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><FileText size={18} aria-hidden /> Análisis Completo</h4>
                  <div className="bg-info-subtle p-4 rounded-lg">
                    <p className="text-text-muted whitespace-pre-wrap">{analysisResult.content}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-surface-muted/30 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-text-muted mb-2">Información del Análisis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-text-muted">
                    <div>
                      <span className="font-medium">Modelo:</span> {analysisResult.metadata?.model || 'GPT-5'}
                    </div>
                    <div>
                      <span className="font-medium">Tokens usados:</span> {analysisResult.metadata?.tokensUsed || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Tiempo de procesamiento:</span> {analysisResult.metadata?.processingTime || 'N/A'}ms
                    </div>
                    <div>
                      <span className="font-medium">Tipo de análisis:</span> {analysisResult.metadata?.analysisType || 'Legal'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2 bg-accent text-text-on-accent rounded-md hover:bg-accent-hover"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
