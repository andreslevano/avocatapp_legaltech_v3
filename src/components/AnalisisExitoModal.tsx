import React from 'react';
import { Button } from '@/components/ui/Button';
import { CircleCheck, FileText, Target, TriangleAlert } from 'lucide-react';

interface AnalisisExitoModalProps {
  isOpen: boolean;
  onClose: () => void;
  analisis: any;
  loading?: boolean;
}

export default function AnalisisExitoModal({ isOpen, onClose, analisis, loading = false }: AnalisisExitoModalProps) {
  if (!isOpen) return null;

  const getColorClass = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-text bg-surface-muted/20';
    if (porcentaje >= 80) return 'text-text bg-surface-muted/20';
    if (porcentaje >= 70) return 'text-text bg-surface-muted/20';
    if (porcentaje >= 60) return 'text-text bg-surface-muted/20';
    if (porcentaje >= 50) return 'text-text bg-surface-muted/30';
    return 'text-text bg-surface-muted/30';
  };

  const getNivelConfianza = (nivel: string) => {
    const niveles = {
      'excelente': { text: 'Excelente', color: 'text-text' },
      'muy_buena': { text: 'Muy Buena', color: 'text-text' },
      'buena': { text: 'Buena', color: 'text-text-muted' },
      'regular': { text: 'Regular', color: 'text-text-muted' },
      'baja': { text: 'Baja', color: 'text-text-muted' },
      'muy_baja': { text: 'Muy Baja', color: 'text-text-muted' }
    };
    return niveles[nivel as keyof typeof niveles] || { text: nivel, color: 'text-text-muted' };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border-strong mx-auto"></div>
            <p className="mt-4 text-text-muted">Analizando probabilidad de éxito...</p>
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
      <div className="bg-surface rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Análisis de Éxito</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-muted text-2xl"
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
            <p className="mt-2 text-lg text-text-muted">
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
            <h3 className="text-lg font-semibold text-text mb-3">Resumen Ejecutivo</h3>
            <p className="text-text-muted bg-bg p-4 rounded-lg">
              {datos.resumenEjecutivo}
            </p>
          </div>
        )}

        {/* Fortalezas y Debilidades */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {datos?.fortalezas && datos.fortalezas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><CircleCheck size={18} aria-hidden /> Fortalezas</h3>
              <ul className="space-y-2">
                {datos.fortalezas.map((fortaleza: string, index: number) => (
                  <li key={index} className="text-text-muted bg-surface-muted/20 p-3 rounded-lg">
                    {fortaleza}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {datos?.debilidades && datos.debilidades.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2"><TriangleAlert size={18} aria-hidden /> Debilidades</h3>
              <ul className="space-y-2">
                {datos.debilidades.map((debilidad: string, index: number) => (
                  <li key={index} className="text-text-muted bg-surface-muted/20 p-3 rounded-lg">
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
            <h3 className="text-lg font-semibold text-text mb-4">Evaluación Detallada</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(evaluacionDetallada).map(([categoria, datos]: [string, any]) => (
                <div key={categoria} className="bg-bg p-4 rounded-lg">
                  <h4 className="font-semibold text-text capitalize mb-2">
                    {categoria.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-text-muted mb-1">
                      <span>Puntuación</span>
                      <span>{datos.puntuacion}/100</span>
                    </div>
                    <div className="w-full bg-surface-muted rounded-full h-2">
                      <div 
                        className="bg-action-primary h-2 rounded-full" 
                        style={{ width: `${datos.puntuacion}%` }}
                      ></div>
                    </div>
                  </div>
                  {datos.comentarios && (
                    <p className="text-sm text-text-muted">{datos.comentarios}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {recomendacionesEspecificas && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text mb-4">Recomendaciones Específicas</h3>
            
            {recomendacionesEspecificas.documentosAdicionales && recomendacionesEspecificas.documentosAdicionales.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2"><FileText size={16} aria-hidden /> Documentos Adicionales</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.documentosAdicionales.map((doc: string, index: number) => (
                    <li key={index} className="text-text-muted bg-surface-muted/20 p-2 rounded">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.argumentosReforzar && recomendacionesEspecificas.argumentosReforzar.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2">Argumentos a Reforzar</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.argumentosReforzar.map((arg: string, index: number) => (
                    <li key={index} className="text-text-muted bg-surface-muted/20 p-2 rounded">
                      • {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.riesgosIdentificados && recomendacionesEspecificas.riesgosIdentificados.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2"><TriangleAlert size={16} aria-hidden /> Riesgos Identificados</h4>
                <ul className="space-y-1">
                  {recomendacionesEspecificas.riesgosIdentificados.map((riesgo: string, index: number) => (
                    <li key={index} className="text-text-muted bg-surface-muted/20 p-2 rounded">
                      • {riesgo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recomendacionesEspecificas.estrategiaRecomendada && (
              <div>
                <h4 className="font-semibold text-text mb-2 flex items-center gap-2"><Target size={16} aria-hidden /> Estrategia Recomendada</h4>
                <p className="text-text-muted bg-surface-muted/20 p-3 rounded-lg">
                  {recomendacionesEspecificas.estrategiaRecomendada}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button onClick={onClose}
            variant="primary" className="px-6 py-2"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}


