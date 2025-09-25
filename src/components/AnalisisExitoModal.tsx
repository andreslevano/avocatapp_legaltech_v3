import React from 'react';

interface AnalisisExitoModalProps {
  isOpen: boolean;
  onClose: () => void;
  analisis: any;
  loading?: boolean;
}

export default function AnalisisExitoModal({ isOpen, onClose, analisis, loading = false }: AnalisisExitoModalProps) {
  if (!isOpen) return null;

  const getColorClass = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-green-600 bg-green-50';
    if (porcentaje >= 80) return 'text-green-600 bg-green-50';
    if (porcentaje >= 70) return 'text-yellow-600 bg-yellow-50';
    if (porcentaje >= 60) return 'text-orange-600 bg-orange-50';
    if (porcentaje >= 50) return 'text-red-600 bg-red-50';
    return 'text-red-700 bg-red-100';
  };

  const getNivelConfianza = (nivel: string) => {
    const niveles = {
      'excelente': { text: 'Excelente', color: 'text-green-600' },
      'muy_buena': { text: 'Muy Buena', color: 'text-green-600' },
      'buena': { text: 'Buena', color: 'text-yellow-600' },
      'regular': { text: 'Regular', color: 'text-orange-600' },
      'baja': { text: 'Baja', color: 'text-red-600' },
      'muy_baja': { text: 'Muy Baja', color: 'text-red-700' }
    };
    return niveles[nivel as keyof typeof niveles] || { text: nivel, color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Analizando probabilidad de éxito...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analisis) return null;

  const { analisis: datos, evaluacionDetallada, recomendacionesEspecificas } = analisis;
  const porcentaje = datos?.porcentajeExito || 0;
  const nivel = getNivelConfianza(datos?.nivelConfianza || 'baja');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Éxito</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Porcentaje de Éxito */}
        <div className="mb-8">
          <div className="text-center">
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-3xl font-bold ${getColorClass(porcentaje)}`}>
              {porcentaje}%
            </div>
            <p className="mt-2 text-lg text-gray-600">
              Probabilidad de Éxito
            </p>
            <p className={`text-sm font-medium ${nivel.color}`}>
              Nivel de Confianza: {nivel.text}
            </p>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        {datos?.resumenEjecutivo && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen Ejecutivo</h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
              {datos.resumenEjecutivo}
            </p>
          </div>
        )}

        {/* Fortalezas y Debilidades */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {datos?.fortalezas && datos.fortalezas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">✅ Fortalezas</h3>
              <ul className="space-y-2">
                {datos.fortalezas.map((fortaleza: string, index: number) => (
                  <li key={index} className="text-gray-700 bg-green-50 p-3 rounded-lg">
                    {fortaleza}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {datos?.debilidades && datos.debilidades.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-700 mb-3">⚠️ Debilidades</h3>
              <ul className="space-y-2">
                {datos.debilidades.map((debilidad: string, index: number) => (
                  <li key={index} className="text-gray-700 bg-red-50 p-3 rounded-lg">
                    {debilidad}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Evaluación Detallada */}
        {evaluacionDetallada && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluación Detallada</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(evaluacionDetallada).map(([categoria, datos]: [string, any]) => (
                <div key={categoria} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 capitalize mb-2">
                    {categoria.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Puntuación</span>
                      <span>{datos.puntuacion}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${datos.puntuacion}%` }}
                      ></div>
                    </div>
                  </div>
                  {datos.comentarios && (
                    <p className="text-sm text-gray-700">{datos.comentarios}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {recomendacionesEspecificas && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones Específicas</h3>
            
            {recomendacionesEspecificas.documentosAdicionales && recomendacionesEspecificas.documentosAdicionales.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-blue-700 mb-2">📄 Documentos Adicionales</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.documentosAdicionales.map((doc: string, index: number) => (
                    <li key={index} className="text-gray-700 bg-blue-50 p-2 rounded">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.argumentosReforzar && recomendacionesEspecificas.argumentosReforzar.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-green-700 mb-2">💪 Argumentos a Reforzar</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.argumentosReforzar.map((arg: string, index: number) => (
                    <li key={index} className="text-gray-700 bg-green-50 p-2 rounded">
                      • {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.riesgosIdentificados && recomendacionesEspecificas.riesgosIdentificados.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Riesgos Identificados</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.riesgosIdentificados.map((riesgo: string, index: number) => (
                    <li key={index} className="text-gray-700 bg-red-50 p-2 rounded">
                      • {riesgo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.estrategiaRecomendada && (
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">🎯 Estrategia Recomendada</h4>
                <p className="text-gray-700 bg-purple-50 p-3 rounded-lg">
                  {recomendacionesEspecificas.estrategiaRecomendada}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


