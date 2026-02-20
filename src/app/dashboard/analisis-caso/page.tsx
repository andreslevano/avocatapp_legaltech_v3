'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import WinProbabilityIndicator from '@/components/WinProbabilityIndicator';
import { useI18n } from '@/hooks/useI18n';

interface CaseData {
  id: string;
  title: string;
  type: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  priority: string;
  description: string;
  assignedLawyer: string;
  deadline: string;
  documents: File[];
  createdAt: string;
  selectedAreaLegal?: string;
  selectedProcedimiento?: string;
}

interface LegalSuggestion {
  id: string;
  area: string;
  procedure: string;
  confidence: number;
  description: string;
  selected?: boolean;
}

interface ExtractedData {
  documentName: string;
  documentType: string;
  keyData: {
    field: string;
    value: string;
    confidence: number;
  }[];
  summary: string;
}

interface Alert {
  id: string;
  type: 'deadline' | 'warning' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  lawReference: string;
}

interface WinProbability {
  percentage: number;
  factors: {
    documentQuality: number;
    legalPrecedent: number;
    caseStrength: number;
    marketAnalysis: number;
  };
  recommendations: string[];
}

function CaseAnalysisContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [legalSuggestions, setLegalSuggestions] = useState<LegalSuggestion[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [winProbability, setWinProbability] = useState<WinProbability | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [manualAreaLegal, setManualAreaLegal] = useState<string>('');
  const [manualProcedimiento, setManualProcedimiento] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Legal areas and procedures data
  const legalAreas = [
    'Derecho Civil',
    'Derecho Mercantil',
    'Derecho Laboral',
    'Derecho Penal',
    'Derecho de Familia',
    'Derecho Administrativo',
    'Derecho Fiscal',
    'Derecho Inmobiliario',
    'Derecho Constitucional',
    'Derecho Procesal'
  ];

  const legalProcedures = [
    'Acción de Cumplimiento de Contrato',
    'Acción de Resolución de Contrato',
    'Acción de Nulidad',
    'Acción de Rescisión',
    'Acción de Daños y Perjuicios',
    'Acción de Restitución',
    'Acción de Declaración de Derecho',
    'Acción de Condena',
    'Acción de Tutela',
    'Acción de Amparo',
    'Mediación',
    'Arbitraje',
    'Conciliación',
    'Proceso Monitorio',
    'Proceso Ejecutivo',
    'Proceso Ordinario',
    'Proceso Verbal',
    'Proceso Sumario'
  ];

  useEffect(() => {
    // Check if Firebase is properly initialized
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
        if (user) {
          setUser(user);
        } else {
          router.push('/login');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (user && isFirebaseReady) {
      // Simulate case data from URL params or localStorage
      const mockCaseData: CaseData = {
        id: 'CASE-001',
        title: 'Contrato de Arrendamiento Comercial - Disputa de Términos',
        type: 'Derecho Mercantil',
        clientName: 'Juan Pérez García',
        clientEmail: 'juan.perez@email.com',
        clientPhone: '+34 600 123 456',
        priority: 'high',
        description: 'Disputa sobre términos de contrato de arrendamiento comercial, incluyendo cláusulas de renovación y responsabilidades de mantenimiento.',
        assignedLawyer: 'Dr. Carlos Mendoza',
        deadline: '2024-02-15',
        documents: [],
        createdAt: new Date().toISOString()
      };
      
      setCaseData(mockCaseData);
      performAnalysis();
    }
  }, [user, isFirebaseReady]);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock legal suggestions
    const suggestions: LegalSuggestion[] = [
      {
        id: '1',
        area: 'Derecho Mercantil',
        procedure: 'Acción de Cumplimiento de Contrato',
        confidence: 85,
        description: 'Procedimiento recomendado basado en la naturaleza contractual de la disputa'
      },
      {
        id: '2',
        area: 'Derecho Civil',
        procedure: 'Acción de Resolución de Contrato',
        confidence: 72,
        description: 'Alternativa en caso de incumplimiento grave del contrato'
      },
      {
        id: '3',
        area: 'Derecho Mercantil',
        procedure: 'Mediación Comercial',
        confidence: 68,
        description: 'Procedimiento extrajudicial recomendado para resolver la disputa'
      }
    ];
    
    // Mock extracted data
    const extracted: ExtractedData[] = [
      {
        documentName: 'Contrato_Arrendamiento_2023.pdf',
        documentType: 'Contrato',
        keyData: [
          { field: 'Fecha de Inicio', value: '01/01/2023', confidence: 95 },
          { field: 'Fecha de Vencimiento', value: '31/12/2025', confidence: 95 },
          { field: 'Renta Mensual', value: '€2,500.00', confidence: 90 },
          { field: 'Depósito de Garantía', value: '€5,000.00', confidence: 88 },
          { field: 'Cláusula de Renovación', value: 'Automática por 2 años', confidence: 85 }
        ],
        summary: 'Contrato de arrendamiento comercial por 3 años con renovación automática. Incluye cláusulas específicas sobre mantenimiento y responsabilidades del arrendatario.'
      },
      {
        documentName: 'Comunicacion_Incumplimiento.pdf',
        documentType: 'Correspondencia',
        keyData: [
          { field: 'Fecha de Comunicación', value: '15/11/2023', confidence: 92 },
          { field: 'Motivo de Reclamo', value: 'Falta de mantenimiento', confidence: 88 },
          { field: 'Plazo de Respuesta', value: '15 días hábiles', confidence: 90 },
          { field: 'Monto Reclamado', value: '€1,200.00', confidence: 85 }
        ],
        summary: 'Comunicación formal de incumplimiento por falta de mantenimiento de las instalaciones. Se solicita reparación en 15 días hábiles.'
      }
    ];
    
    // Mock alerts
    const caseAlerts: Alert[] = [
      {
        id: '1',
        type: 'deadline',
        title: 'Plazo de Respuesta a Comunicación',
        description: 'El plazo para responder a la comunicación de incumplimiento vence en 5 días',
        priority: 'high',
        dueDate: '2024-01-20',
        lawReference: 'Art. 1101 Código Civil'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Cláusula de Renovación Automática',
        description: 'El contrato se renovará automáticamente si no se notifica la terminación 3 meses antes',
        priority: 'medium',
        lawReference: 'Art. 1571 Código Civil'
      },
      {
        id: '3',
        type: 'alert',
        title: 'Prescripción de Acciones Contractuales',
        description: 'Las acciones derivadas del contrato prescriben a los 15 años desde el vencimiento',
        priority: 'low',
        lawReference: 'Art. 1964 Código Civil'
      }
    ];
    
    // Mock executive summary
    const summary = `ANÁLISIS EJECUTIVO DEL CASO

SITUACIÓN ACTUAL:
El presente caso involucra una disputa contractual entre el arrendador y arrendatario de un local comercial. La controversia surge de una comunicación de incumplimiento emitida el 15 de noviembre de 2023, donde se reclama la falta de mantenimiento adecuado de las instalaciones por parte del arrendatario.

ASPECTOS LEGALES RELEVANTES:
1. El contrato de arrendamiento tiene una duración de 3 años (2023-2025) con renovación automática por 2 años adicionales.
2. La renta mensual establecida es de €2,500.00 con un depósito de garantía de €5,000.00.
3. Existe una cláusula específica sobre responsabilidades de mantenimiento que requiere interpretación.

FORTALEZAS DEL CASO:
- Documentación contractual completa y bien estructurada
- Comunicación formal de incumplimiento con plazos específicos
- Monto reclamado razonable (€1,200.00)
- Precedentes legales favorables en materia de arrendamientos comerciales

RIESGOS IDENTIFICADOS:
- Plazo de respuesta a la comunicación vence en 5 días
- Posible renovación automática del contrato si no se actúa a tiempo
- Necesidad de documentar el estado actual de las instalaciones

RECOMENDACIONES ESTRATÉGICAS:
1. Responder inmediatamente a la comunicación de incumplimiento
2. Solicitar una inspección técnica independiente de las instalaciones
3. Evaluar la posibilidad de mediación antes de proceder judicialmente
4. Preparar documentación adicional sobre el estado de las instalaciones

PROBABILIDAD DE ÉXITO: 78%
Basado en la calidad de la documentación, precedentes legales y fortalezas del caso, se estima una alta probabilidad de éxito en la resolución favorable para el cliente.`;

    // Mock win probability
    const probability: WinProbability = {
      percentage: 78,
      factors: {
        documentQuality: 85,
        legalPrecedent: 75,
        caseStrength: 80,
        marketAnalysis: 72
      },
      recommendations: [
        'Documentar el estado actual de las instalaciones',
        'Obtener testimonios de otros arrendatarios',
        'Consultar precedentes recientes en la jurisdicción',
        'Considerar mediación como primera opción'
      ]
    };
    
    setLegalSuggestions(suggestions);
    setExtractedData(extracted);
    setAlerts(caseAlerts);
    setExecutiveSummary(summary);
    setWinProbability(probability);
    setIsAnalyzing(false);
  };

  const handleSignOut = async () => {
    if (!isFirebaseReady || !auth || typeof auth.signOut !== 'function') {
      return;
    }

    try {
      await signOut(auth as Auth);
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const downloadAnalysis = async (format: 'pdf' | 'docx') => {
    // Implementation for downloading analysis
    console.log(`Downloading analysis in ${format} format`);
    // This would integrate with a document generation service
  };

  const handleSuggestionSelect = (suggestionId: string) => {
    setLegalSuggestions(prev => 
      prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, selected: true }
          : { ...suggestion, selected: false }
      )
    );
  };

  const toggleDocumentExpansion = (index: number) => {
    setExpandedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleUpdateHeader = () => {
    const selectedSuggestions = legalSuggestions.filter(s => s.selected);
    if (selectedSuggestions.length > 0) {
      const firstSelected = selectedSuggestions[0];
      setCaseData(prev => prev ? {
        ...prev,
        selectedAreaLegal: firstSelected.area,
        selectedProcedimiento: firstSelected.procedure
      } : null);
    } else if (manualAreaLegal && manualProcedimiento) {
      setCaseData(prev => prev ? {
        ...prev,
        selectedAreaLegal: manualAreaLegal,
        selectedProcedimiento: manualProcedimiento
      } : null);
    }
  };

  const handleSaveCase = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save case
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Case saved:', caseData);
      alert('Caso guardado exitosamente');
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Error al guardar el caso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDocuments = () => {
    router.push('/dashboard/generar-escritos');
  };

  const handleViewRepository = () => {
    router.push('/dashboard/repositorio');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDownloadDropdown) {
        setShowDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDownloadDropdown]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-text-primary bg-surface-muted/40 border-border';
      case 'medium': return 'text-text-primary bg-surface-muted/30 border-border';
      case 'low': return 'text-text-secondary bg-surface-muted/20 border-border';
      default: return 'text-text-secondary bg-surface-muted/30 border-border';
    }
  };

  const getAlertIcon = (type: string) => {
    const iconClass = 'w-5 h-5 text-text-primary';
    switch (type) {
      case 'deadline':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'alert':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      {/* Floating Action Buttons - top right, always visible when scrolling */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-2">
        <Link
          href="/dashboard/casos"
          className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors"
          title="Volver"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Volver
          </span>
        </Link>
        <button
          onClick={handleSaveCase}
          disabled={isSaving}
          className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Guardar"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-text-on-dark border-t-transparent" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Guardar
          </span>
        </button>
        <button
          onClick={handleGenerateDocuments}
          className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors"
          title="Generar Escritos"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Generar Escritos
          </span>
        </button>
        <button
          onClick={handleViewRepository}
          className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors"
          title="Ver Repositorio"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ver Repositorio
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors"
            title="Descargar Análisis"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Descargar Análisis
            </span>
          </button>
          {showDownloadDropdown && (
            <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[180px]">
              <button
                onClick={() => {
                  downloadAnalysis('pdf');
                  setShowDownloadDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted/30 transition-colors"
              >
                <svg className="w-4 h-4 mr-3 text-text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Descargar PDF
              </button>
              <button
                onClick={() => {
                  downloadAnalysis('docx');
                  setShowDownloadDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted/30 transition-colors"
              >
                <svg className="w-4 h-4 mr-3 text-text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Descargar Word
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Win Probability Indicator */}
      {winProbability && (
        <WinProbabilityIndicator 
          percentage={winProbability.percentage}
          factors={winProbability.factors}
          recommendations={winProbability.recommendations}
        />
      )}


      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Case Header */}
          {caseData && (
            <div className="bg-card shadow-sm rounded-lg border border-border p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary break-words">{caseData.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getPriorityColor(caseData.priority)}`}>
                    {caseData.priority === 'high' ? 'Alta Prioridad' : 
                     caseData.priority === 'medium' ? 'Media Prioridad' : 'Baja Prioridad'}
                  </span>
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-surface-muted/30 text-text-primary border border-border">
                    {caseData.type}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">{t('dashboard.caseAnalysis.client')}</h3>
                  <p className="text-base sm:text-lg font-semibold text-text-primary break-words">{caseData.clientName}</p>
                  <p className="text-sm text-text-secondary break-all">{caseData.clientEmail}</p>
                  <p className="text-sm text-text-secondary">{caseData.clientPhone}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">{t('dashboard.caseAnalysis.assignedLawyer')}</h3>
                  <p className="text-base sm:text-lg font-semibold text-text-primary break-words">{caseData.assignedLawyer}</p>
                  <p className="text-sm text-text-secondary">Fecha Límite: {new Date(caseData.deadline).toLocaleDateString('es-ES')}</p>
                </div>
                
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">{t('dashboard.caseAnalysis.caseInfo')}</h3>
                  <p className="text-sm text-text-secondary">ID: {caseData.id}</p>
                  <p className="text-sm text-text-secondary">Creado: {new Date(caseData.createdAt).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
              
              {/* Selected Legal Area and Procedure */}
              {(caseData.selectedAreaLegal || caseData.selectedProcedimiento) && (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-surface-muted/20 border border-border rounded-lg">
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Selección Actual</h3>
                  <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                    {caseData.selectedAreaLegal && (
                      <div>
                        <span className="text-sm font-medium text-text-secondary">Área Legal: </span>
                        <span className="text-sm text-text-primary font-semibold break-words">{caseData.selectedAreaLegal}</span>
                      </div>
                    )}
                    {caseData.selectedProcedimiento && (
                      <div>
                        <span className="text-sm font-medium text-text-secondary">Procedimiento: </span>
                        <span className="text-sm text-text-primary font-semibold break-words">{caseData.selectedProcedimiento}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-4 sm:mt-6">
                <h3 className="text-sm font-medium text-text-secondary mb-2">Descripción</h3>
                <p className="text-sm sm:text-base text-text-secondary leading-relaxed">{caseData.description}</p>
              </div>
            </div>
          )}

          {/* Analysis Loading State */}
          {isAnalyzing && (
            <div className="bg-card shadow-sm rounded-lg border border-border p-8 mb-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Analizando Documentos</h3>
                <p className="text-text-secondary">
                  Nuestra IA está procesando los documentos y generando el análisis legal...
                </p>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {!isAnalyzing && (
            <div className="space-y-8">
              {/* 1. Extracted Data */}
              <div className="bg-card shadow-sm rounded-lg border border-border p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-4 sm:mb-6">1. Datos Extraídos de Documentos</h2>
                
                <div className="space-y-4">
                  {extractedData.map((doc, index) => {
                    const isExpanded = expandedDocuments.has(index);
                    return (
                      <div key={index} className="border border-border rounded-lg">
                        {/* Document Header - Always Visible */}
                        <div 
                          className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-app transition-colors"
                          onClick={() => toggleDocumentExpansion(index)}
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-lg font-medium text-text-primary truncate">{doc.documentName}</h3>
                              <p className="text-xs sm:text-sm text-text-secondary">
                                {doc.keyData.length} campos extraídos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                            <span className="px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-surface-muted/30 text-text-primary border border-border">
                              {doc.documentType}
                            </span>
                            <span className="text-xs sm:text-sm text-text-secondary hidden sm:inline">
                              {isExpanded ? 'Ocultar' : 'Ver'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Document Content - Collapsible */}
                        {isExpanded && (
                          <div className="border-t border-border p-3 sm:p-4 bg-app">
                            {/* Mobile Card Layout */}
                            <div className="block sm:hidden space-y-3">
                              {doc.keyData.map((data, dataIndex) => (
                                <div key={dataIndex} className="bg-card rounded-lg p-3 border border-border">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-sm font-medium text-text-primary break-words">{data.field}</h4>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 bg-surface-muted/30 text-text-primary border border-border">
                                      {data.confidence}%
                                    </span>
                                  </div>
                                  <p className="text-sm text-text-secondary break-words">{data.value}</p>
                                </div>
                              ))}
                            </div>
                            
                            {/* Desktop Table Layout */}
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="min-w-full divide-y divide-border">
                                <thead className="bg-card">
                                  <tr>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                      Campo
                                    </th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                      Valor
                                    </th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                      Confianza
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                  {doc.keyData.map((data, dataIndex) => (
                                    <tr key={dataIndex}>
                                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-text-primary break-words">
                                        {data.field}
                                      </td>
                                      <td className="px-4 lg:px-6 py-4 text-sm text-text-primary break-words">
                                        {data.value}
                                      </td>
                                      <td className="px-4 lg:px-6 py-4 text-sm text-text-primary">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-surface-muted/30 text-text-primary border border-border">
                                          {data.confidence}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                              <h4 className="text-sm font-medium text-text-secondary mb-1">Resumen del Documento:</h4>
                              <p className="text-sm text-text-secondary leading-relaxed">{doc.summary}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Side by Side: Legal Suggestions and Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Legal Suggestions */}
                <div className="bg-card shadow-sm rounded-lg border border-border p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-4 sm:mb-6">2. Sugerencias de Área Legal y Procedimiento</h2>
                  
                  {/* Manual Selection */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-app rounded-lg">
                    <h3 className="text-base sm:text-lg font-medium text-text-primary mb-3 sm:mb-4">Selección Manual</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Área Legal
                        </label>
                        <select
                          value={manualAreaLegal}
                          onChange={(e) => setManualAreaLegal(e.target.value)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                        >
                          <option value="">Seleccionar área legal</option>
                          {legalAreas.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Procedimiento
                        </label>
                        <select
                          value={manualProcedimiento}
                          onChange={(e) => setManualProcedimiento(e.target.value)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                        >
                          <option value="">Seleccionar procedimiento</option>
                          {legalProcedures.map((procedure) => (
                            <option key={procedure} value={procedure}>{procedure}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-medium text-text-primary mb-3 sm:mb-4">Sugerencias de IA</h3>
                    {legalSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${
                        suggestion.selected ? 'border-sidebar bg-surface-muted/20' : 'border-border'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start flex-1 min-w-0">
                            <input
                              type="radio"
                              name="ai-suggestion"
                              checked={suggestion.selected || false}
                              onChange={() => handleSuggestionSelect(suggestion.id)}
                              className="mr-2 sm:mr-3 h-4 w-4 text-sidebar focus:ring-sidebar border-border mt-0.5 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-lg font-medium text-text-primary break-words">{suggestion.area}</h3>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-surface-muted/30 text-text-primary border border-border flex-shrink-0 ml-2">
                            {suggestion.confidence}%
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-md font-semibold text-text-primary mb-2 ml-6 sm:ml-7 break-words">{suggestion.procedure}</h4>
                        <p className="text-sm sm:text-base text-text-secondary ml-6 sm:ml-7 leading-relaxed break-words">{suggestion.description}</p>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Alerts and Warnings */}
                <div className="bg-card shadow-sm rounded-lg border border-border p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-4 sm:mb-6">3. Alertas, Advertencias y Plazos Legales</h2>
                
                  <div className="space-y-3 sm:space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="border-l-4 border-sidebar bg-surface-muted/20 p-3 sm:p-4 rounded-r-lg">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-2 sm:mr-3">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                              <h3 className="text-base sm:text-lg font-medium text-text-primary break-words">{alert.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(alert.priority)} self-start sm:self-auto`}>
                                {alert.priority === 'high' ? 'Alta' : 
                                 alert.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base text-text-secondary mb-2 leading-relaxed break-words">{alert.description}</p>
                            {alert.dueDate && (
                              <p className="text-xs sm:text-sm text-text-secondary">
                                <strong>Fecha límite:</strong> {new Date(alert.dueDate).toLocaleDateString('es-ES')}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-text-secondary mt-2 break-words">
                              <strong>Referencia legal:</strong> {alert.lawReference}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Executive Summary */}
              <div className="bg-card shadow-sm rounded-lg border border-border p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-4 sm:mb-6">4. Resumen Ejecutivo Extendido</h2>
                
                {/* Professional Legal Document Format */}
                <div className="bg-card border-2 border-border shadow-lg">
                  {/* Document Header */}
                  <div className="bg-sidebar text-text-on-dark p-6 sm:p-8">
                    <div className="text-center">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">ANÁLISIS LEGAL EJECUTIVO</h1>
                      <div className="border-t border-border pt-3">
                        <p className="text-sm sm:text-base opacity-90">ESTUDIO JURÍDICO PROFESIONAL</p>
                        <p className="text-xs sm:text-sm opacity-75 mt-1">Análisis Integral de Caso</p>
                      </div>
                    </div>
                  </div>

                  {/* Document Body */}
                  <div className="p-6 sm:p-8">
                    {/* Case Information Header */}
                    <div className="mb-8 border-b-2 border-border pb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Información del Caso</h3>
                          <div className="space-y-2">
                            <p className="text-sm"><span className="font-medium text-text-secondary">Cliente:</span> {caseData?.clientName || 'N/A'}</p>
                            <p className="text-sm"><span className="font-medium text-text-secondary">Fecha de Análisis:</span> {new Date().toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}</p>
                            <p className="text-sm"><span className="font-medium text-text-secondary">Número de Documentos:</span> {extractedData.length}</p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Clasificación Legal</h3>
                          <div className="space-y-2">
                            {caseData?.selectedAreaLegal && (
                              <p className="text-sm"><span className="font-medium text-text-secondary">Área Legal:</span> <span className="text-text-primary font-semibold">{caseData.selectedAreaLegal}</span></p>
                            )}
                            {caseData?.selectedProcedimiento && (
                              <p className="text-sm"><span className="font-medium text-text-secondary">Procedimiento:</span> <span className="text-text-primary font-semibold">{caseData.selectedProcedimiento}</span></p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary Content */}
                    <div className="prose prose-sm sm:prose max-w-none">
                      <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4 border-l-4 border-sidebar pl-4">RESUMEN EJECUTIVO</h2>
                      
                      <div className="bg-app border-l-4 border-sidebar p-4 sm:p-6 mb-6">
                        <div className="text-sm sm:text-base text-text-primary leading-relaxed">
                          {executiveSummary.split('\n').map((paragraph, index) => (
                            paragraph.trim() ? (
                              <p key={index} className="mb-4 last:mb-0 text-justify">
                                {paragraph.trim()}
                              </p>
                            ) : null
                          ))}
                        </div>
                      </div>

                      {/* Key Findings Section */}
                      <div className="mt-8">
                        <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-4 border-l-4 border-sidebar pl-4">HALLAZGOS PRINCIPALES</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-surface-muted/20 border border-border rounded-lg p-4">
                            <h4 className="font-semibold text-text-primary mb-2">Fortalezas del Caso</h4>
                            <ul className="text-sm text-text-secondary space-y-1">
                              <li>• Documentación completa y bien estructurada</li>
                              <li>• Evidencia sólida respaldando las pretensiones</li>
                              <li>• Cumplimiento de plazos procesales</li>
                            </ul>
                          </div>
                          <div className="bg-surface-muted/20 border border-border rounded-lg p-4">
                            <h4 className="font-semibold text-text-primary mb-2">Consideraciones Importantes</h4>
                            <ul className="text-sm text-text-secondary space-y-1">
                              <li>• Revisar jurisprudencia reciente aplicable</li>
                              <li>• Evaluar estrategias de negociación</li>
                              <li>• Considerar alternativas de solución</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations Section */}
                      <div className="mt-8">
                        <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-4 border-l-4 border-sidebar pl-4">RECOMENDACIONES ESTRATÉGICAS</h3>
                        <div className="bg-surface-muted/20 border border-border rounded-lg p-4 sm:p-6">
                          <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-sidebar text-text-on-dark rounded-full flex items-center justify-center text-xs font-bold">1</div>
                              <p className="text-sm sm:text-base text-text-primary">Proceder con la estrategia legal recomendada basada en el análisis de documentos</p>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-sidebar text-text-on-dark rounded-full flex items-center justify-center text-xs font-bold">2</div>
                              <p className="text-sm sm:text-base text-text-primary">Mantener comunicación constante con el cliente sobre el desarrollo del caso</p>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-sidebar text-text-on-dark rounded-full flex items-center justify-center text-xs font-bold">3</div>
                              <p className="text-sm sm:text-base text-text-primary">Evaluar oportunidades de solución alternativa antes del proceso judicial</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Footer */}
                  <div className="bg-surface-muted/30 border-t-2 border-border p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-text-secondary">
                      <div>
                        <p className="font-semibold">Estudio Jurídico Profesional</p>
                        <p>Análisis generado por sistema de inteligencia artificial</p>
                      </div>
                      <div className="mt-2 sm:mt-0 text-right">
                        <p>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                        <p>Página 1 de 1</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function CaseAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando análisis del caso...</p>
        </div>
      </div>
    }>
      <CaseAnalysisContent />
    </Suspense>
  );
}
