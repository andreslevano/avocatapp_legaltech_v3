'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary, GeneratedDocument } from '@/types';

interface TutelaProcessProps {
  formData: {
    vulnerador: string;
    hechos: string;
    derecho: string;
    solicitud: string;
  };
  onComplete?: (document: GeneratedDocument) => void;
  onResetForm?: () => void;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'identidad',
    name: 'Identificación',
    description: 'DNI, NIE o documentos de identidad',
    required: true,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'evidencia',
    name: 'Evidencias',
    description: 'Documentos que prueban la vulneración',
    required: true,
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'comunicaciones',
    name: 'Comunicaciones',
    description: 'Emails, cartas, notificaciones',
    required: false,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'testimonios',
    name: 'Testimonios',
    description: 'Declaraciones de testigos',
    required: false,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'juridicos',
    name: 'Documentos Jurídicos',
    description: 'Leyes, jurisprudencia, precedentes',
    required: false,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'otros',
    name: 'Otros',
    description: 'Otros documentos relevantes',
    required: false,
    color: 'bg-gray-100 text-gray-800'
  }
];

export default function TutelaProcessSimple({ formData, onComplete, onResetForm }: TutelaProcessProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic document categorization based on filename keywords
  const categorizeDocument = (filename: string): DocumentCategory => {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('dni') || lowerName.includes('nie') || lowerName.includes('identidad') || lowerName.includes('pasaporte')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'identidad')!;
    }
    if (lowerName.includes('evidencia') || lowerName.includes('prueba') || lowerName.includes('justificante') || lowerName.includes('testimonio')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'evidencia')!;
    }
    if (lowerName.includes('email') || lowerName.includes('correo') || lowerName.includes('carta') || lowerName.includes('comunicacion') || lowerName.includes('notificacion')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'comunicaciones')!;
    }
    if (lowerName.includes('testimonio') || lowerName.includes('declaracion') || lowerName.includes('testigo')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'testimonios')!;
    }
    if (lowerName.includes('ley') || lowerName.includes('jurisprudencia') || lowerName.includes('sentencia') || lowerName.includes('precedente')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'juridicos')!;
    }
    
    return DOCUMENT_CATEGORIES.find(c => c.id === 'otros')!;
  };

  const handleFileUpload = (files: FileList) => {
    const newDocuments: UploadedDocument[] = Array.from(files)
      .filter(file => file.type === 'application/pdf')
      .map(file => {
        const category = categorizeDocument(file.name);
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          file,
          size: file.size,
          type: file.type,
          category,
          uploadDate: new Date(),
          previewUrl: URL.createObjectURL(file)
        };
      });

    setUploadedDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const removeDocument = (documentId: string) => {
    setUploadedDocuments(prev => {
      const doc = prev.find(d => d.id === documentId);
      if (doc?.previewUrl) {
        URL.revokeObjectURL(doc.previewUrl);
      }
      return prev.filter(d => d.id !== documentId);
    });
  };

  const generateSummary = () => {
    const categorizedDocuments: { [categoryId: string]: UploadedDocument[] } = {};
    const missingRequired: string[] = [];

    DOCUMENT_CATEGORIES.forEach(category => {
      const docs = uploadedDocuments.filter(doc => doc.category?.id === category.id);
      categorizedDocuments[category.id] = docs;
      
      if (category.required && docs.length === 0) {
        missingRequired.push(category.name);
      }
    });

    const summary: DocumentSummary = {
      totalDocuments: uploadedDocuments.length,
      categorizedDocuments,
      missingRequired,
      analysisComplete: missingRequired.length === 0
    };

    setDocumentSummary(summary);
    setCurrentStep(2);
  };

  // Calculate accuracy percentage based on required documents and form quality
  const calculateAccuracy = () => {
    if (!documentSummary) return 0;
    
    // Document accuracy (50% weight)
    const totalRequired = DOCUMENT_CATEGORIES.filter(cat => cat.required).length;
    const missingRequired = documentSummary.missingRequired.length;
    const documentAccuracy = Math.round(((totalRequired - missingRequired) / totalRequired) * 100);
    
    // Form quality accuracy (50% weight)
    let formScore = 0;
    const maxFormScore = 4; // 4 form fields
    
    // Check form completeness and quality
    if (formData.vulnerador && formData.vulnerador.length > 5) formScore += 1;
    if (formData.hechos && formData.hechos.length > 50) formScore += 1;
    if (formData.derecho && formData.derecho !== '') formScore += 1;
    if (formData.solicitud && formData.solicitud.length > 30) formScore += 1;
    
    const formAccuracy = Math.round((formScore / maxFormScore) * 100);
    
    // Combined accuracy (50% documents + 50% form quality)
    const combinedAccuracy = Math.round((documentAccuracy * 0.5) + (formAccuracy * 0.5));
    
    return Math.max(0, combinedAccuracy);
  };

  // Get accuracy level and color
  const getAccuracyInfo = () => {
    const accuracy = calculateAccuracy();
    
    if (accuracy >= 80) {
      return {
        level: 'Alta',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600'
      };
    } else if (accuracy >= 60) {
      return {
        level: 'Media',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600'
      };
    } else {
      return {
        level: 'Baja',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600'
      };
    }
  };

  const handlePayment = async () => {
    try {
      // Simulate payment processing
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsPaymentComplete(true);
      generateDocument();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateDocument = async () => {
    setIsProcessing(true);
    
    // Simulate document generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const derechoText = {
      'vida': 'Derecho a la vida',
      'salud': 'Derecho a la salud',
      'educacion': 'Derecho a la educación',
      'igualdad': 'Derecho a la igualdad',
      'debido-proceso': 'Derecho al debido proceso',
      'otro': 'Otro derecho fundamental'
    }[formData.derecho] || 'Derecho fundamental';

    const generated: GeneratedDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Acción de Tutela - ' + new Date().toLocaleDateString('es-ES'),
      content: `ACCIÓN DE TUTELA

Señor Juez de la República de Colombia

Yo, [NOMBRE DEL ACCIONANTE], mayor de edad, identificado con [TIPO Y NÚMERO DE DOCUMENTO], actuando en mi propio nombre, respetuosamente me dirijo a usted para solicitar la protección de mis derechos fundamentales mediante la presente ACCIÓN DE TUTELA, en contra de:

DEMANDADO: ${formData.vulnerador}

DERECHO VULNERADO: ${derechoText}

HECHOS:

${formData.hechos}

FUNDAMENTOS DE DERECHO:

1. El artículo 86 de la Constitución Política de Colombia establece que toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar, mediante un procedimiento preferente y sumario, por sí misma o por quien actúe a su nombre, la protección inmediata de sus derechos constitucionales fundamentales.

2. El artículo 87 de la Constitución Política establece que toda persona podrá acudir ante la autoridad judicial para hacer efectivo el cumplimiento de una ley o un acto administrativo.

3. El artículo 88 de la Constitución Política establece que la ley regulará las acciones populares para la protección de los derechos e intereses colectivos.

PETICIÓN:

${formData.solicitud}

Por lo anterior, solicito a usted señor Juez:

1. Admitir la presente acción de tutela.
2. Ordenar la protección inmediata de mis derechos fundamentales.
3. Ordenar a ${formData.vulnerador} que cese la vulneración de mis derechos.
4. Ordenar las medidas necesarias para garantizar el cumplimiento de la decisión.

DOCUMENTOS QUE SE ADJUNTAN:

${documentSummary?.categorizedDocuments ? Object.entries(documentSummary.categorizedDocuments).map(([categoryId, docs]) => {
  const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
  return `- ${category?.name}: ${docs.length} documento(s)`;
}).join('\n') : ''}

JURAMENTO:

Juro bajo la gravedad del juramento que los hechos expuestos en la presente acción de tutela son ciertos y que no he promovido otra acción de tutela por los mismos hechos.

Ciudad y fecha: [CIUDAD], [FECHA]

_________________________
[NOMBRE DEL ACCIONANTE]
[C.C. NÚMERO]`,
      type: 'accion_tutela',
      generatedAt: new Date()
    };

    setGeneratedDocument(generated);
    setCurrentStep(3);
    setIsProcessing(false);
    
    // Send email with attachments
    try {
      await sendEmailWithAttachments(generated);
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't block the user flow if email fails
    }
    
    if (onComplete) {
      onComplete(generated);
    }
  };

  const sendEmailWithAttachments = async (document: GeneratedDocument) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: 'user@example.com', // In a real app, this would come from user authentication
          documentTitle: document.title,
          documentContent: document.content,
          userName: 'Usuario', // In a real app, this would come from user profile
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const downloadDocument = async () => {
    if (!generatedDocument) return;
    
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      // Create PDF using jsPDF
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(generatedDocument.title, 105, 20, { align: 'center' });
      
      // Add line under title
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);
      
      // Content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Split content into lines and add to PDF
      const contentLines = generatedDocument.content.split('\n');
      let yPosition = 35;
      const lineHeight = 6;
      const maxWidth = 170;
      const leftMargin = 20;
      
      contentLines.forEach((line) => {
        if (line.trim() === '') {
          yPosition += lineHeight;
          return;
        }
        
        // Handle long lines by wrapping them
        const wrappedLines = doc.splitTextToSize(line, maxWidth);
        wrappedLines.forEach((wrappedLine: string) => {
          if (yPosition > 280) { // Start new page if needed
            doc.addPage();
            yPosition = 20;
          }
          doc.text(wrappedLine, leftMargin, yPosition);
          yPosition += lineHeight;
        });
      });
      
      // Add signature section
      yPosition += 20;
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text('_________________________', 150, yPosition);
      yPosition += lineHeight;
      doc.text('Firma', 150, yPosition);
      
      // Save the PDF
      doc.save(`${generatedDocument.title}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to HTML download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${generatedDocument.title}</title>
            <style>
              body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; color: #000; }
              h1 { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; text-decoration: underline; }
              .content { white-space: pre-line; font-size: 12px; }
              .signature { margin-top: 50px; text-align: right; }
              @media print { body { margin: 20px; } }
            </style>
          </head>
          <body>
            <h1>${generatedDocument.title}</h1>
            <div class="content">${generatedDocument.content}</div>
            <div class="signature">
              <p>_________________________</p>
              <p>Firma</p>
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedDocument.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setUploadedDocuments([]);
    setDocumentSummary(null);
    setGeneratedDocument(null);
    setIsProcessing(false);
    setIsPaymentComplete(false);
    
    // Reset the form as well
    if (onResetForm) {
      onResetForm();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Proceso de Acción de Tutela
        </h2>
        <p className="text-gray-600">
          Sigue estos pasos para generar tu acción de tutela
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-red-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Subir y Analizar</span>
          <span>Pago</span>
          <span>Descargar</span>
        </div>
      </div>

      {/* Step 1: Document Upload and Analysis */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Paso 1: Subir y Analizar Documentos PDF</h3>
          
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Arrastra archivos PDF aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Solo se permiten archivos PDF
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          {uploadedDocuments.length > 0 && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">Documentos subidos ({uploadedDocuments.length})</h4>
              
              {/* Document List with Categories */}
              <div className="space-y-3">
                {uploadedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        {doc.category && (
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${doc.category.color}`}>
                            {doc.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(doc.previewUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analysis Summary */}
              {documentSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-3">Análisis de Documentos</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total documentos:</span>
                      <span className="ml-2 font-medium">{documentSummary.totalDocuments}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Análisis completo:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        documentSummary.analysisComplete 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {documentSummary.analysisComplete ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                  
                  {documentSummary.missingRequired.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-700 font-medium">Documentos requeridos faltantes:</p>
                      <ul className="text-sm text-red-600 mt-1">
                        {documentSummary.missingRequired.map((category) => (
                          <li key={category}>• {category}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={generateSummary}
                disabled={uploadedDocuments.length === 0}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Analizar Documentos y Continuar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Payment */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Paso 2: Procesar Pago</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              ← Volver al Paso 1
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Resumen de la Acción de Tutela</h4>
            
            {documentSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total documentos:</span>
                    <span className="ml-2 font-medium">{documentSummary.totalDocuments}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos requeridos:</span>
                    <span className="ml-2 font-medium">
                      {DOCUMENT_CATEGORIES.filter(cat => cat.required).length - documentSummary.missingRequired.length}/
                      {DOCUMENT_CATEGORIES.filter(cat => cat.required).length}
                    </span>
                  </div>
                </div>

                {/* Accuracy Indicator */}
                <div className={`${getAccuracyInfo().bgColor} ${getAccuracyInfo().borderColor} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className={`font-medium ${getAccuracyInfo().color}`}>Precisión del Resultado</h5>
                    <div className="flex items-center">
                      {getAccuracyInfo().level === 'Alta' && (
                        <svg className={`w-5 h-5 ${getAccuracyInfo().iconColor} mr-1`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {getAccuracyInfo().level === 'Media' && (
                        <svg className={`w-5 h-5 ${getAccuracyInfo().iconColor} mr-1`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      {getAccuracyInfo().level === 'Baja' && (
                        <svg className={`w-5 h-5 ${getAccuracyInfo().iconColor} mr-1`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`font-semibold ${getAccuracyInfo().color}`}>
                        {getAccuracyInfo().level} ({calculateAccuracy()}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        getAccuracyInfo().level === 'Alta' ? 'bg-green-500' :
                        getAccuracyInfo().level === 'Media' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${calculateAccuracy()}%` }}
                    ></div>
                  </div>
                  
                  <p className={`text-sm ${getAccuracyInfo().color}`}>
                    {getAccuracyInfo().level === 'Alta' && 'Excelente precisión. El resultado será muy preciso basado en los documentos proporcionados y la calidad del formulario completado.'}
                    {getAccuracyInfo().level === 'Media' && 'Buena precisión. El resultado será preciso, pero algunos detalles podrían necesitar verificación manual. Considera completar más información en el formulario o subir documentos adicionales.'}
                    {getAccuracyInfo().level === 'Baja' && 'Precisión limitada. El resultado será básico y requerirá revisión y completado manual. Te recomendamos completar mejor el formulario y subir más documentos de apoyo.'}
                  </p>
                  
                  {/* Detailed breakdown */}
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                    <p className="text-sm text-gray-700 font-medium mb-2">Desglose de precisión:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Calidad del formulario:</span>
                        <span className="font-medium">
                          {(() => {
                            let formScore = 0;
                            if (formData.vulnerador && formData.vulnerador.length > 5) formScore += 1;
                            if (formData.hechos && formData.hechos.length > 50) formScore += 1;
                            if (formData.derecho && formData.derecho !== '') formScore += 1;
                            if (formData.solicitud && formData.solicitud.length > 30) formScore += 1;
                            return `${formScore}/4 campos completados correctamente`;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Documentos requeridos:</span>
                        <span className="font-medium">
                          {DOCUMENT_CATEGORIES.filter(cat => cat.required).length - documentSummary.missingRequired.length}/
                          {DOCUMENT_CATEGORIES.filter(cat => cat.required).length} documentos
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {documentSummary.missingRequired.length > 0 && (
                    <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                      <p className="text-sm text-gray-700 font-medium mb-1">Documentos requeridos faltantes:</p>
                      <ul className="text-sm text-gray-600">
                        {documentSummary.missingRequired.map((category) => (
                          <li key={category} className="flex items-center">
                            <svg className="w-3 h-3 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {category}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Documentos por categoría:</h5>
                  <div className="space-y-1">
                    {Object.entries(documentSummary.categorizedDocuments).map(([categoryId, docs]) => {
                      const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
                      if (docs.length === 0) return null;
                      return (
                        <div key={categoryId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{category?.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${category?.color}`}>
                            {docs.length} documento(s)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h4 className="font-semibold text-red-800 mb-2">Generación de Acción de Tutela</h4>
            <p className="text-red-700 text-sm mb-4">
              Para generar tu acción de tutela personalizada, necesitamos procesar un pago único.
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-900">Precio:</span>
              <span className="text-2xl font-bold text-red-600">€15.00</span>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando Pago...' : 'Procesar Pago'}
            </button>
            
            <p className="text-xs text-red-600 mt-2 text-center">
              Pago simulado para demostración
            </p>
            
            {documentSummary && documentSummary.missingRequired.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Puedes proceder con el pago</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Aunque falten algunos documentos requeridos, puedes continuar. 
                      El resultado se generará con la información disponible y podrás completarlo manualmente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Document Generation and Download */}
      {currentStep === 3 && generatedDocument && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Paso 3: Descargar Documento</h3>
            <button
              onClick={resetProcess}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Crear Nueva Acción de Tutela
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-semibold text-green-800">¡Acción de Tutela Generada Exitosamente!</h4>
            </div>
            <p className="text-green-700 mb-4">
              Tu acción de tutela ha sido generada y está lista para su uso.
            </p>
            <div className="text-sm text-green-600">
              <p><strong>Título:</strong> {generatedDocument.title}</p>
              <p><strong>Generado:</strong> {generatedDocument.generatedAt.toLocaleString('es-ES')}</p>
            </div>
          </div>

          {/* Email Notification */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="font-semibold text-blue-800">Email Enviado Automáticamente</h4>
            </div>
            <p className="text-blue-700 mb-3">
              Hemos enviado un email a tu dirección con los siguientes archivos adjuntos:
            </p>
            <ul className="text-sm text-blue-600 space-y-1">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <strong>Documento en Word (.docx):</strong> Para edición y personalización
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <strong>Documento en PDF (.pdf):</strong> Para impresión y envío oficial
              </li>
            </ul>
            <p className="text-xs text-blue-500 mt-3">
              Revisa tu bandeja de entrada y carpeta de spam si no recibes el email en unos minutos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  const newWindow = window.open('', '_blank');
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head>
                          <title>${generatedDocument.title}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                            h1 { color: #333; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
                            .content { white-space: pre-line; }
                          </style>
                        </head>
                        <body>
                          <h1>${generatedDocument.title}</h1>
                          <div class="content">${generatedDocument.content}</div>
                        </body>
                      </html>
                    `);
                    newWindow.document.close();
                  }
                }}
                disabled={!isPaymentComplete}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ver Documento
              </button>
              <button
                onClick={downloadDocument}
                disabled={!isPaymentComplete}
                className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Descargar PDF
              </button>
            </div>
            
            {!isPaymentComplete && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-yellow-700">
                    Los botones se habilitarán una vez que se complete el pago.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-2">Próximos Pasos:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Revisa el documento generado</li>
              <li>• Personaliza el contenido según tus necesidades</li>
              <li>• Presenta la acción de tutela ante el juez competente</li>
              <li>• Guarda una copia para tus registros</li>
            </ul>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentStep === 2 ? 'Procesando Pago' : 'Generando Acción de Tutela'}
              </h3>
              <p className="text-gray-600">
                {currentStep === 2 
                  ? 'Procesando tu pago...' 
                  : 'Estamos analizando tus documentos y generando tu acción de tutela...'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
