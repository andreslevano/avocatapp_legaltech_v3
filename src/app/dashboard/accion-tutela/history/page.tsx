'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavigation from '@/components/DashboardNavigation';

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
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation currentPlan="basic" />
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando historial...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation currentPlan="basic" />
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Historial de Acciones de Tutela
            </h1>
            <p className="text-gray-600">
              Lista de todas las acciones de tutela generadas
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay tutelas generadas
              </h3>
              <p className="text-gray-600 mb-6">
                Genera tu primera acción de tutela para verla aquí
              </p>
              <button
                onClick={() => router.push('/dashboard/accion-tutela')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generar Tutela
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Derecho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ciudad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.fechaISO)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getDerechoLabel(item.derecho)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ciudad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadDocument(item.documentId)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Descargar
                          </button>
                          <button
                            onClick={() => handleAnalyzeWithAI(item.documentId)}
                            disabled={analyzingDoc === item.documentId}
                            className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Volver al Dashboard
            </button>
            <button
              onClick={() => router.push('/dashboard/accion-tutela')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  🤖 Análisis con IA - GPT-5
                </h3>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Resumen */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">📋 Resumen</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Riesgos */}
                {analysisResult.risks && analysisResult.risks.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Riesgos Identificados</h4>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {analysisResult.risks.map((risk: string, index: number) => (
                          <li key={index} className="text-red-700">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">💡 Recomendaciones</h4>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-green-700">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Análisis Completo */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">📄 Análisis Completo</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.content}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Información del Análisis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
