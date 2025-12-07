'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary, GeneratedDocument } from '@/types';

interface ReclamacionProcessProps {
  onComplete?: (document: GeneratedDocument) => void;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'contract',
    name: 'Contrato',
    description: 'Contrato o acuerdo comercial',
    required: true,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'invoice',
    name: 'Factura',
    description: 'Facturas pendientes de pago',
    required: true,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'correspondence',
    name: 'Correspondencia',
    description: 'Emails, cartas, comunicaciones',
    required: false,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'evidence',
    name: 'Pruebas',
    description: 'Documentos que prueban la deuda',
    required: true,
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'identity',
    name: 'Identificación',
    description: 'DNI, NIE o documentos de identidad',
    required: true,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'other',
    name: 'Otros',
    description: 'Otros documentos relevantes',
    required: false,
    color: 'bg-gray-100 text-gray-800'
  }
];

export default function ReclamacionProcess({ onComplete }: ReclamacionProcessProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Stripe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeStripe = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        setStripe(stripeInstance);
      } catch (error) {
        console.error('Error loading Stripe:', error);
      }
    };
    initializeStripe();
  }, []);

  const generateDocument = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulate document generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const generated: GeneratedDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Reclamación de Cantidades - ' + new Date().toLocaleDateString('es-ES'),
      content: `RECLAMACIÓN DE CANTIDADES

Estimado/a Sr./Sra.,

Por medio del presente documento, y en mi condición de [TIPO DE RELACIÓN], me dirijo a usted para reclamar el pago de las cantidades que se detallan a continuación:

DOCUMENTOS PRESENTADOS:
${documentSummary?.categorizedDocuments ? Object.entries(documentSummary.categorizedDocuments).map(([categoryId, docs]) => {
  const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
  return `- ${category?.name}: ${docs.length} documento(s)`;
}).join('\n') : ''}

CANTIDAD RECLAMADA: [A DETERMINAR SEGÚN DOCUMENTOS]

FUNDAMENTOS LEGALES:
- Artículo 1101 del Código Civil
- Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad
- Jurisprudencia del Tribunal Supremo

Se solicita el pago de la cantidad adeudada en el plazo de 15 días naturales desde la recepción de esta reclamación.

Sin otro particular, reciba un cordial saludo.

[FECHA]
[FIRMA]`,
      type: 'reclamacion_cantidades',
      generatedAt: new Date()
    };

    setGeneratedDocument(generated);
    setCurrentStep(3);
    setIsProcessing(false);
    
    if (onComplete) {
      onComplete(generated);
    }
  }, [documentSummary, onComplete]);

  // Handle payment completion (this would be called from a webhook or success page)
  const handlePaymentSuccess = useCallback(() => {
    setIsPaymentComplete(true);
    // Call generateDocument directly to avoid circular dependency
    if (documentSummary) {
      generateDocument();
    }
  }, [documentSummary, generateDocument]);

  // Check for payment success in URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success' && currentStep === 2) {
      handlePaymentSuccess();
    }
  }, [currentStep, handlePaymentSuccess]);

  // Automatic document categorization based on filename keywords
  const categorizeDocument = useCallback((filename: string): DocumentCategory => {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('contrato') || lowerName.includes('acuerdo') || lowerName.includes('convenio')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'contract')!;
    }
    if (lowerName.includes('factura') || lowerName.includes('invoice') || lowerName.includes('recibo')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'invoice')!;
    }
    if (lowerName.includes('email') || lowerName.includes('correo') || lowerName.includes('carta') || lowerName.includes('comunicacion')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'correspondence')!;
    }
    if (lowerName.includes('dni') || lowerName.includes('nie') || lowerName.includes('identidad') || lowerName.includes('pasaporte')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'identity')!;
    }
    if (lowerName.includes('prueba') || lowerName.includes('evidencia') || lowerName.includes('testimonio') || lowerName.includes('justificante')) {
      return DOCUMENT_CATEGORIES.find(c => c.id === 'evidence')!;
    }
    
    return DOCUMENT_CATEGORIES.find(c => c.id === 'other')!;
  }, []);

  const handleFileUpload = useCallback((files: FileList) => {
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
  }, [categorizeDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  }, [handleFileUpload]);

  const removeDocument = useCallback((documentId: string) => {
    setUploadedDocuments(prev => {
      const doc = prev.find(d => d.id === documentId);
      if (doc?.previewUrl) {
        URL.revokeObjectURL(doc.previewUrl);
      }
      return prev.filter(d => d.id !== documentId);
    });
  }, []);

  const generateSummary = useCallback(() => {
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
  }, [uploadedDocuments]);

  const handlePayment = useCallback(async () => {
    if (!stripe) return;

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_reclamacion_cantidades', // You'll need to create this price in Stripe
          metadata: {
            documentType: 'reclamacion_cantidades',
            documentCount: uploadedDocuments.length
          }
        }),
      });

      const session = await response.json();

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Error:', error);
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  }, [stripe, uploadedDocuments.length]);

  const downloadDocument = useCallback(async () => {
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
  }, [generatedDocument]);

  const resetProcess = useCallback(() => {
    setCurrentStep(1);
    setUploadedDocuments([]);
    setDocumentSummary(null);
    setGeneratedDocument(null);
    setIsProcessing(false);
    setIsPaymentComplete(false);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Proceso de Reclamación de Cantidades
        </h2>
        <p className="text-gray-600">
          Sigue estos pasos para generar tu reclamación de cantidades
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-orange-600' : 'bg-gray-200'
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
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors cursor-pointer"
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
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              ← Volver al Paso 1
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Resumen de la Reclamación</h4>
            
            {documentSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total documentos:</span>
                    <span className="ml-2 font-medium">{documentSummary.totalDocuments}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Análisis completo:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      documentSummary.analysisComplete 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {documentSummary.analysisComplete ? 'Sí' : 'No'}
                    </span>
                  </div>
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

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h4 className="font-semibold text-orange-800 mb-2">Generación de Reclamación de Cantidades</h4>
            <p className="text-orange-700 text-sm mb-4">
              Para generar tu reclamación de cantidades personalizada, necesitamos procesar un pago único.
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-900">Precio:</span>
              <span className="text-2xl font-bold text-orange-600">€10.00</span>
            </div>

            <button
              onClick={handlePayment}
              disabled={!stripe || !documentSummary?.analysisComplete}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!stripe ? 'Cargando...' : 'Procesar Pago con Stripe'}
            </button>
            
            <p className="text-xs text-orange-600 mt-2 text-center">
              Pago seguro procesado por Stripe
            </p>
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
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Crear Nueva Reclamación
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-semibold text-green-800">¡Reclamación Generada Exitosamente!</h4>
            </div>
            <p className="text-green-700 mb-4">
              Tu reclamación de cantidades ha sido generada y está lista para su uso.
            </p>
            <div className="text-sm text-green-600">
              <p><strong>Título:</strong> {generatedDocument.title}</p>
              <p><strong>Generado:</strong> {generatedDocument.generatedAt.toLocaleString('es-ES')}</p>
            </div>
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
                            h1 { color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
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
              <li>• Envía la reclamación por correo certificado</li>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generando Reclamación
              </h3>
              <p className="text-gray-600">
                Estamos analizando tus documentos y generando tu reclamación de cantidades...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
