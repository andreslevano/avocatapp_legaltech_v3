'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
import { useI18n } from '@/hooks/useI18n';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  complexity: 'Baja' | 'Media' | 'Alta';
  icon: string;
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
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const router = useRouter();
  const { t } = useI18n();

  // Document templates
  const documentTemplates: DocumentTemplate[] = [
    {
      id: '1',
      name: 'Demanda Civil',
      description: 'Demanda para procedimientos civiles ordinarios y verbales',
      category: 'Derecho Civil',
      estimatedTime: '15-20 min',
      complexity: 'Media',
      icon: '📋'
    },
    {
      id: '2',
      name: 'Escrito de Contestación',
      description: 'Contestación a demanda civil con excepciones y defensas',
      category: 'Derecho Civil',
      estimatedTime: '20-25 min',
      complexity: 'Alta',
      icon: '⚖️'
    },
    {
      id: '3',
      name: 'Demanda Laboral',
      description: 'Demanda por despido, salarios o condiciones laborales',
      category: 'Derecho Laboral',
      estimatedTime: '12-18 min',
      complexity: 'Media',
      icon: '💼'
    },
    {
      id: '4',
      name: 'Escrito de Tutela',
      description: 'Acción de tutela para protección de derechos fundamentales',
      category: 'Derecho Constitucional',
      estimatedTime: '10-15 min',
      complexity: 'Baja',
      icon: '🛡️'
    },
    {
      id: '5',
      name: 'Contrato de Arrendamiento',
      description: 'Contrato de arrendamiento comercial o residencial',
      category: 'Derecho Civil',
      estimatedTime: '8-12 min',
      complexity: 'Baja',
      icon: '🏠'
    },
    {
      id: '6',
      name: 'Poder General',
      description: 'Poder general para pleitos y cobranzas',
      category: 'Derecho Civil',
      estimatedTime: '5-8 min',
      complexity: 'Baja',
      icon: '📜'
    },
    {
      id: '7',
      name: 'Demanda Mercantil',
      description: 'Demanda en materia mercantil y comercial',
      category: 'Derecho Mercantil',
      estimatedTime: '18-25 min',
      complexity: 'Alta',
      icon: '💼'
    },
    {
      id: '8',
      name: 'Escrito de Apelación',
      description: 'Apelación contra sentencia de primera instancia',
      category: 'Derecho Procesal',
      estimatedTime: '25-30 min',
      complexity: 'Alta',
      icon: '📈'
    }
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

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat - Generar Escritos</span>
            </div>
            
            <UserMenu user={user} currentPlan="Abogados" />
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Abogados" />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-blue-800">
                {t('dashboard.generateDocuments.title')}
              </h1>
              <p className="text-sm text-blue-700">
                {t('dashboard.generateDocuments.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/analisis-caso"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← {t('dashboard.generateDocuments.backToAnalysis')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Top Section - Document Selection and Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Document Type Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.generateDocuments.documentType')}</h2>
                
                <div className="space-y-2">
                  {documentTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`group relative flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mr-3">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {template.category}
                        </p>
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 hidden group-hover:block">
                        <div className="font-medium mb-1">{template.name}</div>
                        <div className="text-gray-300 mb-2">{template.description}</div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded-full text-white ${
                            template.complexity === 'Baja' ? 'bg-green-500' : 
                            template.complexity === 'Media' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {template.complexity}
                          </span>
                          <span className="text-gray-400">{template.estimatedTime}</span>
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute left-4 -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Instructions and Generate Button */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.generateDocuments.specialInstructions')}</h3>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  placeholder={t('dashboard.generateDocuments.instructionsPlaceholder')}
                />
                
                {selectedTemplate && (
                  <button
                    onClick={handleGenerateDocument}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <span>{t('dashboard.generateDocuments.generating')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>{t('dashboard.generateDocuments.generate')} {selectedTemplate.name}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Document Display Section */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 min-h-[600px]">
            {generatedDocument ? (
              <>
                {/* Document Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.generateDocuments.generatedDocument')}</h2>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        generatedDocument.status === 'Completado' ? 'bg-green-100 text-green-800' :
                        generatedDocument.status === 'Generando' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {generatedDocument.status}
                      </span>
                      {generatedDocument.status === 'Completado' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadDocument('pdf')}
                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadDocument('docx')}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Word
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      {generatedDocument.template}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {generatedDocument.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Document Content */}
                <div className="p-8">
                  {generatedDocument.status === 'Generando' ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Generando Documento</h3>
                      <p className="text-gray-600">Nuestra IA está creando tu documento legal profesional...</p>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto">
                      {/* Professional Legal Document Format */}
                      <div className="bg-white border-2 border-gray-300 shadow-xl">
                        {/* Document Header */}
                        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8">
                          <div className="text-center">
                            <h1 className="text-2xl lg:text-3xl font-bold mb-4 tracking-wide">
                              {generatedDocument.template.toUpperCase()}
                            </h1>
                            <div className="border-t border-blue-300 pt-4">
                              <p className="text-lg opacity-90">ESTUDIO JURÍDICO PROFESIONAL</p>
                              <p className="text-sm opacity-75 mt-1">Documento Legal Generado por IA</p>
                            </div>
                          </div>
                        </div>

                        {/* Document Body */}
                        <div className="p-8 lg:p-12">
                          <div className="prose prose-lg max-w-none">
                            <div className="text-gray-800 leading-relaxed">
                              {generatedDocument.content.split('\n').map((paragraph, index) => {
                                if (paragraph.trim() === '') return <br key={index} />;
                                
                                // Check if it's a title (all caps or specific patterns)
                                if (paragraph.trim().toUpperCase() === paragraph.trim() && paragraph.trim().length > 10) {
                                  return (
                                    <h2 key={index} className="text-xl font-bold text-gray-900 mt-8 mb-4 border-l-4 border-blue-600 pl-4">
                                      {paragraph.trim()}
                                    </h2>
                                  );
                                }
                                
                                // Check if it's a section header
                                if (paragraph.trim().endsWith(':') && paragraph.trim().length < 50) {
                                  return (
                                    <h3 key={index} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
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
                        <div className="bg-gray-100 border-t-2 border-gray-300 p-6">
                          <div className="flex flex-col lg:flex-row justify-between items-center text-sm text-gray-600">
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
                  
                  {/* Approve and Save Button */}
                  {generatedDocument.status === 'Completado' && (
                    <div className="mt-8 flex justify-center">
                      <button className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
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
                <svg className="mx-auto h-20 w-20 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Generador de Documentos Legales</h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Selecciona un tipo de documento legal de la lista superior para comenzar a generar tu escrito profesional con inteligencia artificial.
                </p>
                <div className="mt-8 flex justify-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Documentos profesionales
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Formato legal estándar
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
