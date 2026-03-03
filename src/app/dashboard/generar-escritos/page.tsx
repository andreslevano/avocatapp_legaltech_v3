'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

type DocumentIconType = 'document' | 'scale' | 'briefcase' | 'shield' | 'home' | 'scroll' | 'chart';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  complexity: 'Baja' | 'Media' | 'Alta';
  icon: DocumentIconType;
}

/** Minimalistic icons using site colors (text-text-primary / text-sidebar) */
function DocumentTypeIcon({ type, selected, className = 'w-6 h-6' }: { type: DocumentIconType; selected?: boolean; className?: string }) {
  const colorClass = selected ? 'text-sidebar' : 'text-text-primary';
  const cls = `${colorClass} ${className}`.trim();
  switch (type) {
    case 'document':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'scale':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18 15a2.25 2.25 0 002.25-2.25 2.25 2.25 0 00-2.25-2.25 2.25 2.25 0 01-2.25-2.25 2.25 2.25 0 012.25-2.25 2.25 2.25 0 012.25 2.25 2.25 2.25 0 01-2.25 2.25M6 15a2.25 2.25 0 01-2.25-2.25 2.25 2.25 0 012.25-2.25 2.25 2.25 0 012.25 2.25 2.25 2.25 0 01-2.25 2.25" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case 'home':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case 'scroll':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  template: string;
  createdAt: Date;
  status: 'Generando' | 'Completado' | 'Error';
}

export default function GenerarEscritosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [selectedLegalArea, setSelectedLegalArea] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const router = useRouter();
  const { t } = useI18n();

  // Legal areas and document types (Área Legal -> Tipo de Escrito)
  const legalAreas: Record<string, { name: string; price?: number }[]> = {
    'Derecho Constitucional': [
      { name: 'Recurso de amparo ante el Tribunal Constitucional' },
      { name: 'Recurso de inconstitucionalidad (modelo orientativo)' },
      { name: 'Escrito de acción de protección de derechos fundamentales' },
    ],
    'Derecho Civil y Procesal Civil': [
      { name: 'Demanda de reclamación de cantidad (juicio ordinario / verbal / monitorio)' },
      { name: 'Escrito de oposición a juicio monitorio' },
      { name: 'Demanda de desahucio por falta de pago' },
      { name: 'Escrito de medidas cautelares' },
      { name: 'Recurso de apelación en proceso civil' },
      { name: 'Demanda de responsabilidad contractual / extracontractual' },
      { name: 'Escrito de ejecución de sentencia' },
    ],
    'Derecho Penal y Procesal Penal': [
      { name: 'Denuncia y querella criminal' },
      { name: 'Escrito de acusación particular' },
      { name: 'Escrito de defensa' },
      { name: 'Solicitud de medidas cautelares' },
      { name: 'Recurso de reforma y subsidiario de apelación' },
      { name: 'Recurso de casación penal (modelo académico)' },
    ],
    'Derecho Laboral (Jurisdicción Social)': [
      { name: 'Demanda por despido improcedente' },
      { name: 'Demanda por reclamación de salarios' },
      { name: 'Demanda por modificación sustancial de condiciones de trabajo' },
      { name: 'Escrito de impugnación de sanción disciplinaria' },
      { name: 'Escrito de ejecución de sentencia laboral' },
    ],
    'Derecho Administrativo y Contencioso-Administrativo': [
      { name: 'Recurso administrativo de alzada' },
      { name: 'Recurso potestativo de reposición' },
      { name: 'Demanda contencioso-administrativa' },
      { name: 'Medidas cautelares en vía contenciosa' },
      { name: 'Recurso de apelación en lo contencioso-administrativo' },
    ],
    'Derecho Mercantil': [
      { name: 'Demanda de impugnación de acuerdos sociales' },
      { name: 'Solicitud de concurso voluntario' },
      { name: 'Demanda por competencia desleal' },
      { name: 'Demanda por incumplimiento contractual mercantil' },
    ],
    'Recursos procesales transversales': [
      { name: 'Recurso de reposición' },
      { name: 'Recurso de apelación' },
      { name: 'Recurso de casación' },
      { name: 'Recurso de queja' },
    ],
    'Derecho de Familia': [
      { name: 'Demanda de divorcio contencioso' },
      { name: 'Demanda de medidas paternofiliales' },
      { name: 'Solicitud de modificación de medidas' },
      { name: 'Demanda de alimentos' },
      { name: 'Escrito de ejecución por impago de pensión alimenticia' },
    ],
  };

  // Derived template when both area and document type are selected
  const selectedTemplate: DocumentTemplate | null =
    selectedLegalArea && selectedDocumentType
      ? { id: 'derived', name: selectedDocumentType, description: '', category: selectedLegalArea, estimatedTime: '', complexity: 'Media', icon: 'document' }
      : null;

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

  const handleLegalAreaChange = (area: string) => {
    setSelectedLegalArea(area);
    setSelectedDocumentType('');
    setGeneratedDocument(null);
  };

  const handleDocumentTypeChange = (docType: string) => {
    setSelectedDocumentType(docType);
    setGeneratedDocument(null);
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    
    // Create initial document state
    const newDocument: GeneratedDocument = {
      id: Date.now().toString(),
      title: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
      content: '',
      template: selectedTemplate.name,
      createdAt: new Date(),
      status: 'Generando'
    };
    
    setGeneratedDocument(newDocument);

    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated content
      const mockContent = generateMockDocument(selectedTemplate, customInstructions);
      
      setGeneratedDocument({
        ...newDocument,
        content: mockContent,
        status: 'Completado'
      });
    } catch (error) {
      setGeneratedDocument({
        ...newDocument,
        content: 'Error al generar el documento. Por favor, intente nuevamente.',
        status: 'Error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockDocument = (template: DocumentTemplate, instructions: string): string => {
    const baseContent = `
${template.name.toUpperCase()}

ESTUDIO JURÍDICO PROFESIONAL
${user?.email || 'usuario@email.com'}

${new Date().toLocaleDateString('es-ES', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

---

SEÑOR JUEZ ${template.category === 'Derecho Civil' ? 'CIVIL' : template.category === 'Derecho Laboral' ? 'LABORAL' : 'COMPETENTE'}:

${user?.displayName || 'El suscrito abogado'}, identificado con cédula de ciudadanía No. [NÚMERO], actuando en nombre y representación de [NOMBRE DEL CLIENTE], identificado con cédula de ciudadanía No. [NÚMERO], domiciliado en [DIRECCIÓN], y autorizado mediante poder debidamente otorgado, respetuosamente me dirijo a usted para:

${getTemplateSpecificContent(template)}

${instructions ? `\n\nINSTRUCCIONES ESPECIALES:\n${instructions}\n` : ''}

Por lo anterior, solicito a usted señor juez, tenga a bien:

${getTemplateSpecificRequests(template)}

Es justicia que espero de su despacho.

Atentamente,

[FIRMA]
${user?.displayName || '[NOMBRE DEL ABOGADO]'}
C.C. [NÚMERO]
T.P. [NÚMERO]
`;

    return baseContent;
  };

  const getTemplateSpecificContent = (template: DocumentTemplate): string => {
    switch (template.id) {
      case '1':
        return `FORMULAR DEMANDA DE ${template.category.toUpperCase()}

Vengo a formular demanda de ${template.category.toLowerCase()} en contra de [NOMBRE DEL DEMANDADO], identificado con cédula de ciudadanía No. [NÚMERO], domiciliado en [DIRECCIÓN], por los siguientes:

HECHOS:

1. El demandante y el demandado celebraron un contrato de [TIPO DE CONTRATO] el día [FECHA], mediante el cual se obligaron a [OBLIGACIONES].

2. El demandado ha incumplido las obligaciones contractuales pactadas, específicamente [DESCRIPCIÓN DEL INCUMPLIMIENTO].

3. Como consecuencia del incumplimiento, el demandante ha sufrido perjuicios por valor de $[MONTO] pesos.

4. Se ha intentado la conciliación extrajudicial sin resultados positivos.

DERECHO:

El artículo 1602 del Código Civil establece que "Todo el que ejecuta un hecho, que por su culpa o negligencia ocasiona un daño a otro, está obligado a repararlo".`;

      case '2':
        return `CONTESTAR LA DEMANDA DE ${template.category.toUpperCase()}

Vengo a contestar la demanda de ${template.category.toLowerCase()} formulada en mi contra por [NOMBRE DEL DEMANDANTE], por los siguientes:

EXCEPCIONES:

1. FALTA DE PERSONERÍA: El demandante no tiene legitimación para actuar en el proceso.

2. FALTA DE JURISDICCIÓN: Este juzgado no es competente para conocer del asunto.

3. COSA JUZGADA: La pretensión ya fue decidida en proceso anterior.

DEFENSAS:

1. El contrato objeto de la demanda no fue celebrado por mi persona.

2. En caso de haberse celebrado, las obligaciones fueron cumplidas en su totalidad.

3. No existe relación causal entre los hechos alegados y los perjuicios pretendidos.`;

      case '3':
        return `FORMULAR DEMANDA DE ${template.category.toUpperCase()}

Vengo a formular demanda de ${template.category.toLowerCase()} en contra de [NOMBRE DE LA EMPRESA], identificada con NIT No. [NÚMERO], con domicilio en [DIRECCIÓN], por los siguientes:

HECHOS:

1. El demandante laboró para la empresa demandada desde el [FECHA DE INGRESO] hasta el [FECHA DE RETIRO].

2. Durante la relación laboral, el demandante desempeñó el cargo de [CARGO] con un salario de $[SALARIO] pesos.

3. El día [FECHA], la empresa procedió al despido del trabajador sin justa causa.

4. La empresa adeuda al trabajador las siguientes prestaciones: [LISTA DE PRESTACIONES ADEUDADAS].

DERECHO:

El artículo 62 del Código Sustantivo del Trabajo establece que "El contrato de trabajo puede terminar por cualquiera de las siguientes causas: 1) Mutuo acuerdo de las partes; 2) Expiración del plazo fijo convenido; 3) Terminación de la obra o labor contratada; 4) Muerte del trabajador; 5) Suspensión de actividades de la empresa por más de ciento veinte (120) días; 6) Licencia o suspensión del trabajo por más de ciento ochenta (180) días; 7) Decisión unilateral del empleador; 8) Decisión unilateral del trabajador; 9) Por despido con justa causa; 10) Por despido sin justa causa; 11) Por renuncia del trabajador; 12) Por retiro del trabajador; 13) Por liquidación de la empresa; 14) Por muerte del empleador; 15) Por incapacidad del trabajador; 16) Por fuerza mayor o caso fortuito; 17) Por sentencia judicial; 18) Por convención colectiva; 19) Por decisión de autoridad competente; 20) Por otras causas previstas en la ley".`;

      case '4':
        return `FORMULAR ACCIÓN DE TUTELA

Vengo a formular acción de tutela en contra de [NOMBRE DE LA AUTORIDAD], con el fin de proteger los derechos fundamentales de [NOMBRE DEL TUTELANTE], por los siguientes:

HECHOS:

1. El tutelante es [DESCRIPCIÓN DE LA PERSONA Y SITUACIÓN].

2. La autoridad demandada ha vulnerado los derechos fundamentales del tutelante mediante [DESCRIPCIÓN DE LA VULNERACIÓN].

3. La vulneración se ha materializado en [CONSECUENCIAS DE LA VULNERACIÓN].

4. Se han agotado los mecanismos ordinarios de protección sin resultados.

DERECHO:

El artículo 86 de la Constitución Política establece que "Toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar, mediante un procedimiento preferente y sumario, por sí misma o por quien actúe a su nombre, la protección inmediata de sus derechos constitucionales fundamentales, cuando quiera que estos resulten vulnerados o amenazados por la acción o la omisión de cualquier autoridad pública".`;

      default:
        return `FORMULAR ${template.name.toUpperCase()}

Vengo a formular ${template.name.toLowerCase()} en el presente proceso, por los siguientes:

HECHOS:

1. [DESCRIPCIÓN DE LOS HECHOS RELEVANTES]

2. [CONTINUACIÓN DE LOS HECHOS]

3. [CONSECUENCIAS DE LOS HECHOS]

DERECHO:

[FUNDAMENTOS LEGALES APLICABLES]`;
    }
  };

  const getTemplateSpecificRequests = (template: DocumentTemplate): string => {
    switch (template.id) {
      case '1':
        return `1. Admitir la presente demanda de ${template.category.toLowerCase()}.

2. Ordenar la notificación personal del demandado.

3. Decretar las medidas cautelares solicitadas.

4. Condenar al demandado al pago de la suma de $[MONTO] pesos, más intereses y costas.

5. Las demás que en derecho correspondan.`;

      case '2':
        return `1. Tener por presentada la presente contestación.

2. Admitir las excepciones propuestas.

3. Declarar improcedente la demanda.

4. Condenar al demandante al pago de costas.

5. Las demás que en derecho correspondan.`;

      case '3':
        return `1. Admitir la presente demanda laboral.

2. Ordenar la notificación de la empresa demandada.

3. Condenar a la empresa al pago de las prestaciones laborales adeudadas.

4. Ordenar el pago de salarios caídos e intereses.

5. Las demás que en derecho correspondan.`;

      case '4':
        return `1. Admitir la presente acción de tutela.

2. Proteger inmediatamente los derechos fundamentales del tutelante.

3. Ordenar a la autoridad demandada cesar la vulneración.

4. Ordenar la restitución del derecho vulnerado.

5. Las demás que en derecho correspondan.`;

      default:
        return `1. Admitir el presente escrito.

2. Tener por presentado en tiempo y forma.

3. Decretar lo solicitado.

4. Las demás que en derecho correspondan.`;
    }
  };

  const handleDownloadDocument = (format: 'pdf' | 'docx') => {
    if (!generatedDocument) return;
    
    // Create a blob with the document content
    const content = generatedDocument.content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedDocument.title}.${format === 'pdf' ? 'txt' : 'docx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Baja': return 'bg-green-100 text-green-800';
      case 'Media': return 'bg-yellow-100 text-yellow-800';
      case 'Alta': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-muted/30 text-text-primary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      {/* Floating actions - Volver and Generar (same area, rounded) */}
      <div className="fixed top-6 right-8 z-50 flex flex-col gap-2">
        <Link
          href="/dashboard/analisis-caso"
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg hover:bg-text-primary transition-colors"
          title={t('dashboard.generateDocuments.backToAnalysis')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {t('dashboard.generateDocuments.backToAnalysis')}
          </span>
        </Link>
        {selectedTemplate && (
          <button
            onClick={handleGenerateDocument}
            disabled={isGenerating}
            className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg hover:bg-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`${t('dashboard.generateDocuments.generate')} ${selectedTemplate.name}`}
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-text-on-dark border-t-transparent" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {isGenerating ? t('dashboard.generateDocuments.generating') : `${t('dashboard.generateDocuments.generate')} ${selectedTemplate.name}`}
            </span>
          </button>
        )}
      </div>

      {/* Page Header - site palette */}
      <div className="border-l-4 border-sidebar bg-surface-muted/20 p-4 mb-6 pr-16">
        <div className="flex">
          <div className="flex-shrink-0">
            <DocumentTypeIcon type="document" className="h-5 w-5 text-sidebar" />
          </div>
          <div className="ml-3">
            <h1 className="text-h1 text-text-primary">
              {t('dashboard.generateDocuments.title')}
            </h1>
            <p className="text-body text-text-secondary mt-0.5">
              {t('dashboard.generateDocuments.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Top Section - Document Selection (Área Legal + Tipo de Escrito) and Instructions - same height */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch min-h-[420px]">
            {/* Left Column - Área Legal and Tipo de Escrito dropdowns */}
            <div className="lg:col-span-1 flex flex-col min-h-0">
              <div className="bg-card shadow-md rounded-xl border border-border p-6 flex flex-col flex-1 min-h-0">
                <h2 className="text-h3 text-text-primary mb-4 flex-shrink-0">{t('dashboard.generateDocuments.documentType')}</h2>
                <div className="space-y-4 flex-1">
                  <div>
                    <label htmlFor="legal-area" className="block text-sm font-medium text-text-primary mb-2">
                      {t('dashboard.generateDocuments.legalArea')}
                    </label>
                    <select
                      id="legal-area"
                      value={selectedLegalArea}
                      onChange={(e) => handleLegalAreaChange(e.target.value)}
                      className="input-field rounded-xl"
                    >
                      <option value="">{t('dashboard.generateDocuments.selectLegalArea')}</option>
                      {Object.keys(legalAreas).map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="document-type" className="block text-sm font-medium text-text-primary mb-2">
                      {t('dashboard.generateDocuments.documentTypeSelect')}
                    </label>
                    <select
                      id="document-type"
                      value={selectedDocumentType}
                      onChange={(e) => handleDocumentTypeChange(e.target.value)}
                      disabled={!selectedLegalArea}
                      className="input-field rounded-xl disabled:bg-surface-muted/30 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {selectedLegalArea ? t('dashboard.generateDocuments.selectDocumentType') : t('dashboard.generateDocuments.selectDocumentTypeFirst')}
                      </option>
                      {selectedLegalArea &&
                        legalAreas[selectedLegalArea]?.map((doc) => (
                          <option key={doc.name} value={doc.name}>
                            {doc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Instructions only (Generar is floating top-right) */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <div className="bg-card shadow-md rounded-xl border border-border p-6 flex flex-col flex-1 min-h-0">
                <h3 className="text-h3 text-text-primary mb-4 flex-shrink-0">{t('dashboard.generateDocuments.specialInstructions')}</h3>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={6}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-sidebar focus:border-sidebar bg-card text-text-primary placeholder:text-text-secondary resize-y"
                  placeholder={t('dashboard.generateDocuments.instructionsPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Document Display Section - site palette, rounded */}
          <div className="bg-card shadow-md rounded-xl border border-border min-h-[600px]">
            {generatedDocument ? (
              <>
                {/* Document Header - site colors */}
                <div className="p-6 border-b border-border bg-surface-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-h2 text-text-primary">{t('dashboard.generateDocuments.generatedDocument')}</h2>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        generatedDocument.status === 'Completado' ? 'bg-surface-muted/50 text-text-primary' :
                        generatedDocument.status === 'Generando' ? 'bg-surface-muted/70 text-text-primary' :
                        'bg-surface-muted text-text-primary'
                      }`}>
                        {generatedDocument.status}
                      </span>
                      {generatedDocument.status === 'Completado' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadDocument('pdf')}
                            className="flex items-center px-4 py-2 rounded-full bg-sidebar text-text-on-dark shadow-md hover:bg-text-primary transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadDocument('docx')}
                            className="flex items-center px-4 py-2 rounded-full bg-sidebar text-text-on-dark shadow-md hover:bg-text-primary transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Word
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-text-secondary">
                    <span className="flex items-center">
                      <DocumentTypeIcon type="document" className="w-4 h-4 mr-2 text-text-secondary" />
                      {generatedDocument.template}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {generatedDocument.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Document Content */}
                <div className="p-8">
                  {generatedDocument.status === 'Generando' ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-2 border-sidebar border-t-transparent mx-auto mb-6"></div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">Generando Documento</h3>
                      <p className="text-text-secondary">Nuestra IA está creando tu documento legal profesional...</p>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto">
                      {/* Professional Legal Document Format - site palette */}
                      <div className="bg-card border-2 border-border shadow-lg rounded-xl overflow-hidden">
                        {/* Document Header */}
                        <div className="bg-sidebar text-text-on-dark p-8">
                          <div className="text-center">
                            <h1 className="text-2xl lg:text-3xl font-bold mb-4 tracking-wide">
                              {generatedDocument.template.toUpperCase()}
                            </h1>
                            <div className="border-t border-surface-muted/50 pt-4">
                              <p className="text-lg opacity-90">ESTUDIO JURÍDICO PROFESIONAL</p>
                              <p className="text-sm opacity-75 mt-1">Documento Legal Generado por IA</p>
                            </div>
                          </div>
                        </div>

                        {/* Document Body */}
                        <div className="p-8 lg:p-12">
                          <div className="prose prose-lg max-w-none">
                            <div className="text-text-primary leading-relaxed">
                              {generatedDocument.content.split('\n').map((paragraph, index) => {
                                if (paragraph.trim() === '') return <br key={index} />;
                                
                                // Check if it's a title (all caps or specific patterns)
                                if (paragraph.trim().toUpperCase() === paragraph.trim() && paragraph.trim().length > 10) {
                                  return (
                                    <h2 key={index} className="text-xl font-bold text-text-primary mt-8 mb-4 border-l-4 border-sidebar pl-4">
                                      {paragraph.trim()}
                                    </h2>
                                  );
                                }
                                
                                // Check if it's a section header
                                if (paragraph.trim().endsWith(':') && paragraph.trim().length < 50) {
                                  return (
                                    <h3 key={index} className="text-lg font-semibold text-text-primary mt-6 mb-3">
                                      {paragraph.trim()}
                                    </h3>
                                  );
                                }
                                
                                // Regular paragraph
                                return (
                                  <p key={index} className="mb-4 text-justify leading-relaxed">
                                    {paragraph.trim()}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Document Footer */}
                        <div className="bg-surface-muted/30 border-t-2 border-border p-6">
                          <div className="flex flex-col lg:flex-row justify-between items-center text-sm text-text-secondary">
                            <div>
                              <p className="font-semibold">Estudio Jurídico Profesional</p>
                              <p>Documento generado por sistema de inteligencia artificial</p>
                            </div>
                            <div className="mt-2 lg:mt-0 text-right">
                              <p>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                              <p>Página 1 de 1</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Approve and Save Button - floating rounded, site colors */}
                  {generatedDocument.status === 'Completado' && (
                    <div className="mt-8 flex justify-center">
                      <button className="flex items-center px-8 py-3 rounded-full bg-sidebar text-text-on-dark font-semibold hover:bg-text-primary transition-all shadow-lg hover:shadow-xl">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Aprobar y Guardar
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto w-20 h-20 mb-6 rounded-2xl bg-surface-muted/30 flex items-center justify-center">
                  <DocumentTypeIcon type="document" className="h-12 w-12 text-sidebar" />
                </div>
                <h3 className="text-h2 text-text-primary mb-4">Generador de Documentos Legales</h3>
                <p className="text-body text-text-secondary max-w-2xl mx-auto">
                  {t('dashboard.generateDocuments.emptyStateMessage')}
                </p>
                <div className="mt-8 flex justify-center flex-wrap gap-6">
                  <div className="flex items-center text-sm text-text-secondary">
                    <svg className="w-5 h-5 mr-2 text-sidebar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Documentos profesionales
                  </div>
                  <div className="flex items-center text-sm text-text-secondary">
                    <svg className="w-5 h-5 mr-2 text-sidebar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Formato legal estándar
                  </div>
                  <div className="flex items-center text-sm text-text-secondary">
                    <svg className="w-5 h-5 mr-2 text-sidebar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Descarga en PDF/Word
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
