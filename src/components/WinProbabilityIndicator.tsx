'use client';

import { useState, useEffect } from 'react';

interface WinProbabilityProps {
  percentage: number;
  factors: {
    documentQuality: number;
    legalPrecedent: number;
    caseStrength: number;
    marketAnalysis: number;
  };
  recommendations: string[];
}

export default function WinProbabilityIndicator({ percentage, factors, recommendations }: WinProbabilityProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPercentageIcon = (percentage: number) => {
    if (percentage >= 80) {
      return (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (percentage >= 60) {
      return (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  return (
    <div className={`border-l-4 ${getPercentageColor(percentage)} p-3 sm:p-4 mb-4 sm:mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-2 sm:mr-3">
            {getPercentageIcon(percentage)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold">
              Probabilidad de Éxito: {percentage}%
            </h3>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
              Basado en análisis de documentos, precedentes legales y datos del mercado
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-xs sm:text-sm font-medium hover:opacity-75 transition-opacity self-start sm:self-auto"
        >
          {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
          <svg 
            className={`w-3 h-3 sm:w-4 sm:h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {/* Factors Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Calidad de Documentos</div>
              <div className="text-base sm:text-lg font-semibold text-green-600">{factors.documentQuality}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                <div 
                  className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${factors.documentQuality}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Precedentes Legales</div>
              <div className="text-base sm:text-lg font-semibold text-blue-600">{factors.legalPrecedent}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                <div 
                  className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${factors.legalPrecedent}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Fuerza del Caso</div>
              <div className="text-base sm:text-lg font-semibold text-purple-600">{factors.caseStrength}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                <div 
                  className="bg-purple-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${factors.caseStrength}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Análisis de Mercado</div>
              <div className="text-base sm:text-lg font-semibold text-orange-600">{factors.marketAnalysis}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                <div 
                  className="bg-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${factors.marketAnalysis}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-3 sm:mt-4">
              <h4 className="text-xs sm:text-sm font-medium mb-2">Recomendaciones para mejorar la probabilidad:</h4>
              <ul className="space-y-1 sm:space-y-2">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start text-xs sm:text-sm">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="leading-relaxed break-words">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
