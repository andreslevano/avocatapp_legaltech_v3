'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary, GeneratedDocument } from '@/types';
import AnalisisExitoModal from './AnalisisExitoModal';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { isPilotUser } from '@/lib/pilot-users';

interface TutelaProcessProps {
  onComplete?: (document: GeneratedDocument) => void;
  userId?: string;
  userEmail?: string;
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
    color: 'bg-surface-muted/30 text-text-primary'
  }
];

const DERECHOS_OPTIONS = [
  { value: 'vida', label: 'Derecho a la vida' },
  { value: 'salud', label: 'Derecho a la salud' },
  { value: 'minimo_vital', label: 'Derecho al mínimo vital' },
  { value: 'peticion', label: 'Derecho de petición' },
  { value: 'debido_proceso', label: 'Derecho al debido proceso' },
  { value: 'igualdad', label: 'Derecho a la igualdad' },
  { value: 'educacion', label: 'Derecho a la educación' },
  { value: 'libertad_expresion', label: 'Derecho a la libertad de expresión' },
  { value: 'intimidad', label: 'Derecho a la intimidad' },
  { value: 'habeas_data', label: 'Derecho al hábeas data' }
];

interface OCRFile {
  id: string;
  originalName: string;
  size: number;
  extractedText: string;
  confidence: number;
  pages: number;
  language: string;
  processingTime: number;
}

export default function TutelaProcessSimple({ onComplete, userId, userEmail }: TutelaProcessProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [analisisExito, setAnalisisExito] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const [currentTutelaId, setCurrentTutelaId] = useState<string | null>(null);
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState<Array<{ fileName: string; storagePath: string; downloadUrl?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data state
  const [formData, setFormData] = useState({
    vulnerador: '',
    hechos: '',
    derecho: '',
    peticiones: '',
    medidasProvisionales: false,
    anexos: [] as string[],
    ciudad: 'Bogotá'
  });

  // OCR files state
  const [ocrFiles, setOcrFiles] = useState<OCRFile[]>([]);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [useOcrData, setUseOcrData] = useState(false);
  const [quantity, setQuantity] = useState(1); // ⭐ NUEVO: Cantidad de documentos

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

  const handleFileUpload = async (files: FileList) => {
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Por favor, sube solo archivos PDF');
      return;
    }

    // Generar tutelaId si no existe
    let tutelaIdToUse = currentTutelaId;
    if (!tutelaIdToUse) {
      tutelaIdToUse = `TUTELA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentTutelaId(tutelaIdToUse);
      console.log(`📝 Nuevo tutelaId generado: ${tutelaIdToUse}`);
    }

    // Crear documentos locales primero
    const newDocuments: UploadedDocument[] = pdfFiles.map(file => {
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

    // Guardar archivos en Storage si userId está disponible
    if (userId && userId !== 'demo_user') {
      try {
        console.log(`💾 Guardando ${pdfFiles.length} archivos en Storage para tutelaId: ${tutelaIdToUse}`);
        
        const formData = new FormData();
        pdfFiles.forEach(file => {
          formData.append('files', file);
        });
        formData.append('userId', userId);
        formData.append('tutelaId', tutelaIdToUse);

        const response = await fetch('/api/analyze-documents', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          try {
            const result = await response.json();
            if (result.success) {
              if (result.data.uploadedFiles && result.data.uploadedFiles.length > 0) {
                console.log(`✅ ${result.data.uploadedFiles.length} archivos guardados en Storage`);
                setUploadedFilesInfo(prev => [...prev, ...result.data.uploadedFiles]);
              }
            }
          } catch (parseError: any) {
            console.warn('⚠️ Error parseando respuesta del servidor:', parseError.message);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Error guardando archivos en Storage:', error?.message || 'Error desconocido');
      }
    }
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

  // OCR file handling
  const handleOcrFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const processOcrFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsProcessingOcr(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/accion-tutela/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error procesando archivos');
      }

      const result = await response.json();
      if (result.success) {
        setOcrFiles(result.data.files);
        setUseOcrData(true);
      } else {
        throw new Error('Error en el procesamiento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const applyOcrData = async () => {
    if (ocrFiles.length === 0) return;

    const firstFile = ocrFiles[0];
    const extractedText = firstFile.extractedText;

    // Simulación de extracción de datos (en producción usarías NLP)
    const mockExtractedData = {
      vulnerador: 'Entidad extraída del documento',
      hechos: 'Hechos extraídos del documento PDF mediante OCR',
      derecho: 'salud',
      peticiones: 'Peticiones extraídas del documento'
    };

    setFormData(prev => ({
      ...prev,
      vulnerador: mockExtractedData.vulnerador,
      hechos: mockExtractedData.hechos,
      derecho: mockExtractedData.derecho,
      peticiones: mockExtractedData.peticiones
    }));

    setUseOcrData(true);
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

  const removeOcrFile = (id: string) => {
    setOcrFiles(prev => prev.filter(file => file.id !== id));
    if (ocrFiles.length === 1) {
      setUseOcrData(false);
    }
  };

  const generateSummary = () => {
    // Validate required form fields
    if (!formData.vulnerador || !formData.hechos || !formData.derecho || !formData.peticiones) {
      alert('Por favor, completa todos los campos requeridos antes de continuar.');
      return;
    }

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

  const analizarExito = async () => {
    if (uploadedDocuments.length === 0 && ocrFiles.length === 0) {
      alert('Primero sube algunos documentos para analizar');
      return;
    }

    setIsAnalyzing(true);
    setShowAnalisisModal(true);

    try {
      console.log('🔍 Iniciando análisis de éxito...');
      
      const datosOCR = {
        documentos: ocrFiles.length > 0 
          ? ocrFiles.map(file => ({
              nombre: file.originalName,
              tipo: 'Documento legal',
              contenido: file.extractedText,
              fecha: new Date().toISOString(),
              relevancia: 'Alta',
              confianza: file.confidence
            }))
          : uploadedDocuments.map(doc => ({
              nombre: doc.name,
              tipo: doc.category?.name || 'Documento',
              contenido: `Contenido extraído de ${doc.name}`,
              fecha: doc.uploadDate.toISOString(),
              relevancia: doc.category?.required ? 'Alta' : 'Media'
            })),
        resumen: [],
        completitud: 0
      };

      const response = await fetch('/api/analisis-exito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datosOCR,
          tipoDocumento: 'Acción de Tutela',
          userId: userId || 'demo_user'
        }),
      });

      if (!response.ok) {
        throw new Error('Error en el análisis de éxito');
      }

      const result = await response.json();
      setAnalisisExito(result.data.analisis);
      
      console.log('✅ Análisis de éxito completado:', result.data.analisis.analisis?.porcentajeExito + '%');

    } catch (error) {
      console.error('❌ Error en análisis de éxito:', error);
      alert('Error analizando la probabilidad de éxito. Intenta de nuevo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate accuracy percentage
  const calculateAccuracy = () => {
    if (!documentSummary) return 0;
    
    const totalRequired = DOCUMENT_CATEGORIES.filter(cat => cat.required).length;
    const missingRequired = documentSummary.missingRequired.length;
    const documentAccuracy = Math.round(((totalRequired - missingRequired) / totalRequired) * 100);
    
    // Form quality accuracy (50% weight)
    let formScore = 0;
    const maxFormScore = 4;
    
    if (formData.vulnerador && formData.vulnerador.length > 5) formScore += 1;
    if (formData.hechos && formData.hechos.length > 50) formScore += 1;
    if (formData.derecho && formData.derecho !== '') formScore += 1;
    if (formData.peticiones && formData.peticiones.length > 30) formScore += 1;
    
    const formAccuracy = Math.round((formScore / maxFormScore) * 100);
    
    // Combined accuracy (50% documents + 50% form quality)
    const combinedAccuracy = Math.round((documentAccuracy * 0.5) + (formAccuracy * 0.5));
    
    return Math.max(0, combinedAccuracy);
  };

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
      setIsProcessing(true);
      
      // Validar que userId y userEmail estén disponibles
      if (!userId || userId === 'demo_user') {
        alert('Error: No se pudo identificar tu usuario. Por favor, inicia sesión nuevamente.');
        setIsProcessing(false);
        return;
      }
      
      if (!userEmail) {
        alert('Error: No se pudo obtener tu email. Por favor, verifica tu perfil de usuario.');
        setIsProcessing(false);
        return;
      }
      
      const docId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tutelaId = currentTutelaId || `TUTELA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setCurrentTutelaId(tutelaId);
      setPaymentDocId(docId);
      
      // Usuarios piloto: saltar Stripe y generar la tutela directamente
      if (isPilotUser(userEmail)) {
        try {
          console.log('🧪 Pilot user detected, skipping Stripe payment for acción de tutela');
          await generateDocument(docId, tutelaId);
          setIsPaymentComplete(true);
          return;
        } catch (error) {
          console.error('❌ Error generating tutela for pilot user:', error);
          alert(
            error instanceof Error
              ? error.message
              : 'Error generando la acción de tutela para usuario piloto.',
          );
          setIsProcessing(false);
          return;
        }
      }
      
      // ⭐ NUEVO: Guardar metadata en Firestore antes del pago
      // Esto permite que el webhook asocie el pago con los datos del formulario
      const paymentMetadata = {
        documentType: 'accion_tutela',
        docId: docId,
        tutelaId: tutelaId,
        userId: userId, // Ya validado arriba
        customerEmail: userEmail, // Ya validado arriba
        formData: formData,
        quantity: quantity,
        items: [{
          name: 'Acción de Tutela',
          area: 'Derecho Constitucional',
          country: 'Colombia',
          price: 50000, // 50,000 COP (precio del Payment Link)
          quantity: quantity
        }],
        // ⭐ NUEVO: Incluir referencias a documentos subidos
        uploadedFiles: uploadedFilesInfo.length > 0 ? uploadedFilesInfo.map(file => ({
          fileName: file.fileName,
          storagePath: file.storagePath,
          downloadUrl: file.downloadUrl
        })) : [],
        createdAt: new Date().toISOString(),
        status: 'pending_payment'
      };
      
      // Guardar metadata en Firestore para que el webhook la recupere
      try {
        const { db } = await import('@/lib/firebase');
        const { collection, addDoc } = await import('firebase/firestore');
        
        if (db) {
          const metadataRef = await addDoc(collection(db, 'payment_metadata'), {
            ...paymentMetadata,
            userId: userId,
            customerEmail: userEmail,
            createdAt: new Date()
          });
          console.log('✅ Metadata guardada en Firestore:', metadataRef.id);
          console.log('   userId:', userId);
          console.log('   customerEmail:', userEmail);
          console.log('   docId:', docId);
          console.log('   tutelaId:', tutelaId);
        } else {
          throw new Error('Firestore no está disponible');
        }
      } catch (firestoreError) {
        console.error('❌ Error guardando metadata en Firestore:', firestoreError);
        alert('Error al preparar el pago. Por favor, intenta de nuevo.');
        setIsProcessing(false);
        return;
      }
      
      // También guardar en localStorage como backup
      localStorage.setItem('tutela_payment_metadata', JSON.stringify(paymentMetadata));
      console.log('✅ Metadata guardada en localStorage como backup');
      
      // ⭐ NUEVO: Usar Checkout Session (como estudiantes) para redirección automática
      // Crear checkout session con metadata completa
      // Nota: Para COP, Stripe espera el valor mínimo (1), así que 50,000 COP = 50000
      const endpoint = getCheckoutSessionEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            name: 'Acción de Tutela',
            price: 50000, // 50,000 COP (COP no usa centavos, valor mínimo = 1)
            quantity: quantity,
            area: 'Derecho Constitucional',
            country: 'Colombia'
          }],
          documentType: 'accion_tutela',
          docId: docId,
          tutelaId: tutelaId,
          formData: formData,
          customerEmail: userEmail,
          userId: userId,
          successUrl: `${window.location.origin}/dashboard/autoservicio/accion-tutela?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard/autoservicio/accion-tutela?payment=cancelled`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          console.log('🔄 Redirigiendo a Stripe Checkout Session...');
          window.location.href = data.url;
        } else {
          throw new Error('No se recibió URL de checkout de Stripe');
        }
      } else {
        let errorMessage = 'Error al procesar el pago. Por favor, intenta de nuevo.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('❌ Error creando checkout session:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Error creando checkout session (texto):', errorText);
          errorMessage = errorText || errorMessage;
        }
        alert(errorMessage);
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pago. Inténtalo de nuevo.');
      setIsProcessing(false);
    }
  };

  const generateDocument = useCallback(async (urlDocId?: string | null, urlTutelaId?: string | null) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const docIdToUse = urlDocId || paymentDocId;
      const tutelaIdToUse = urlTutelaId || currentTutelaId;
      
      if (!docIdToUse || !tutelaIdToUse) {
        throw new Error('docId y tutelaId son requeridos para generar el documento');
      }
      
      console.log('🚀 Generando Acción de Tutela con ChatGPT...');
      
      const ocrFilesData = ocrFiles.length > 0 
        ? ocrFiles.map(file => ({
            originalName: file.originalName,
            extractedText: file.extractedText,
            confidence: file.confidence,
            pages: file.pages,
            language: file.language
          }))
        : uploadedDocuments.map((doc, index) => ({
            originalName: doc.name || `Documento ${index + 1}`,
            extractedText: (doc as any).ocrText || (doc as any).text || 'Texto no disponible',
            confidence: (doc as any).confidence || 0.8
          }));

      const requestData = {
        ...formData,
        userId: userId || 'demo_user',
        userEmail: userEmail || 'user@example.com',
        ocrFiles: useOcrData ? ocrFilesData : [],
        docId: docIdToUse,
        tutelaId: tutelaIdToUse
      };

      const response = await fetch('/api/accion-tutela', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Respuesta JSON:', data);
        
        if (data.ok && data.downloadUrl) {
          const pdfResponse = await fetch(data.downloadUrl);
          const blob = await pdfResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `accion-tutela-${formData.derecho}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        console.log('📥 Descargando PDF...');
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('El PDF recibido está vacío');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `accion-tutela-${formData.derecho}-${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ PDF descargado exitosamente');
        }, 100);
      }

      const generated: GeneratedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Acción de Tutela - ' + new Date().toLocaleDateString('es-ES'),
        content: `✅ ACCIÓN DE TUTELA GENERADA EXITOSAMENTE

El PDF ha sido generado con fundamentos legales completos conforme a la Constitución Política de Colombia (art. 86) y el Decreto 2591 de 1991.

El documento incluye:
• Datos completos del accionante y accionado
• Hechos detallados de la vulneración
• Fundamentos de derecho con referencias específicas
• Peticiones al juez
• Medidas provisionales (si aplica)
• Pruebas y anexos

El PDF ha sido descargado y guardado en tu historial. Está listo para su revisión y presentación ante el juez competente.`,
        type: 'accion_tutela',
        generatedAt: new Date()
      };

      setGeneratedDocument(generated);
      setCurrentStep(3);
      setIsProcessing(false);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document-generated', {
          detail: { docId: docIdToUse, tutelaId: tutelaIdToUse }
        }));
      }

    } catch (error: any) {
      console.error('❌ Error generando documento:', error);
      setError(error.message || 'Error generando el documento. Por favor, intenta de nuevo.');
      setIsProcessing(false);
      alert(`Error generando documento: ${error.message}`);
    }
  }, [formData, ocrFiles, uploadedDocuments, userId, userEmail, useOcrData, paymentDocId, currentTutelaId, onComplete]);

  // ⭐ NOTA: La detección de payment=success ahora se maneja en la página padre (accion-tutela/page.tsx)
  // El polling y el banner de éxito se muestran automáticamente cuando el webhook procesa el pago
  // No necesitamos detectar payment=success aquí porque el flujo es:
  // 1. Usuario paga → Stripe redirige a /dashboard/accion-tutela?payment=success
  // 2. La página padre detecta payment=success y inicia polling
  // 3. El webhook procesa el pago y crea el purchase en Firestore
  // 4. El polling detecta el purchase y muestra el banner de éxito

  const resetProcess = () => {
    setCurrentStep(1);
    setUploadedDocuments([]);
    setDocumentSummary(null);
    setGeneratedDocument(null);
    setIsProcessing(false);
    setIsPaymentComplete(false);
    setFormData({
      vulnerador: '',
      hechos: '',
      derecho: '',
      peticiones: '',
      medidasProvisionales: false,
      anexos: [],
      ciudad: 'Bogotá'
    });
    setOcrFiles([]);
    setUseOcrData(false);
    setSelectedFiles(null);
    setQuantity(1); // ⭐ NUEVO: Reset cantidad
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Proceso de Acción de Tutela
        </h2>
        <p className="text-text-secondary">
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
                  : 'bg-gray-200 text-text-secondary'
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
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>Subir y Analizar</span>
          <span>Pago</span>
          <span>Descargar</span>
        </div>
      </div>

      {/* Step 1: Document Upload and Form */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-text-primary">Paso 1: Subir y Analizar Documentos PDF (Opcional)</h3>
          
          {/* PDF Upload Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">
              📄 Cargar Documentos PDF (Opcional)
            </h4>
            <p className="text-blue-700 mb-4">
              Sube documentos PDF para extraer automáticamente los datos y completar el formulario.
            </p>
            
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="mx-auto h-12 w-12 text-blue-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm text-blue-600">
                  Arrastra archivos PDF aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Máximo 10MB por archivo. Se permiten múltiples archivos PDF.
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

              {/* OCR File Input */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  O procesar archivos con OCR:
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleOcrFileSelect}
                  className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={processOcrFiles}
                      disabled={isProcessingOcr}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingOcr ? 'Procesando...' : `Procesar ${selectedFiles.length} archivo(s)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles(null)}
                      className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-app"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {ocrFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {ocrFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-card p-3 rounded border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{file.originalName}</p>
                          <p className="text-xs text-text-secondary">
                            {file.pages} página(s) • Confianza: {(file.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOcrFile(file.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={applyOcrData}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Aplicar Datos Extraídos
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseOcrData(!useOcrData)}
                        className={`px-4 py-2 rounded-md ${
                          useOcrData 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-surface-muted/30 text-text-primary border border-border'
                        }`}
                      >
                        {useOcrData ? '✓ Usando datos OCR' : 'Usar datos OCR'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {uploadedDocuments.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-blue-900 mb-2">Archivos subidos ({uploadedDocuments.length})</h5>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-card p-3 rounded border">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">{doc.name}</span>
                          {doc.category && (
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${doc.category.color}`}>
                              {doc.category.name}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label htmlFor="vulnerador" className="block text-sm font-medium text-text-secondary mb-2">
                Nombre de persona o entidad que vulnera el derecho *
              </label>
              <input
                type="text"
                id="vulnerador"
                value={formData.vulnerador}
                onChange={(e) => setFormData(prev => ({ ...prev, vulnerador: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ej: Alcaldía de Bogotá, Empresa XYZ, etc."
                required
              />
            </div>

            <div>
              <label htmlFor="hechos" className="block text-sm font-medium text-text-secondary mb-2">
                Relato detallado de los hechos *
              </label>
              <textarea
                id="hechos"
                value={formData.hechos}
                onChange={(e) => setFormData(prev => ({ ...prev, hechos: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Describe detalladamente qué sucedió, cuándo, dónde y cómo se vulneró el derecho..."
                required
              />
            </div>

            <div>
              <label htmlFor="derecho" className="block text-sm font-medium text-text-secondary mb-2">
                ¿Qué derecho piensa que ha sido vulnerado? *
              </label>
              <select
                id="derecho"
                value={formData.derecho}
                onChange={(e) => setFormData(prev => ({ ...prev, derecho: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Seleccione un derecho</option>
                {DERECHOS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="peticiones" className="block text-sm font-medium text-text-secondary mb-2">
                ¿Qué se solicita? (órdenes concretas) *
              </label>
              <textarea
                id="peticiones"
                value={formData.peticiones}
                onChange={(e) => setFormData(prev => ({ ...prev, peticiones: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Especifique claramente qué órdenes solicita al juez..."
                required
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medidasProvisionales}
                  onChange={(e) => setFormData(prev => ({ ...prev, medidasProvisionales: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-text-secondary">
                  Solicitar medidas provisionales
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-text-secondary mb-2">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Bogotá"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={generateSummary}
              disabled={!formData.vulnerador || !formData.hechos || !formData.derecho || !formData.peticiones}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar al Pago
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 2: Procesar Pago</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              ← Volver al Paso 1
            </button>
          </div>

          <div className="bg-app rounded-lg p-6">
            <h4 className="font-semibold text-text-primary mb-4">Resumen de la Acción de Tutela</h4>
            
            {documentSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Total documentos:</span>
                    <span className="ml-2 font-medium">{documentSummary.totalDocuments}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Documentos requeridos:</span>
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
                    <span className={`font-semibold ${getAccuracyInfo().color}`}>
                      {getAccuracyInfo().level} ({calculateAccuracy()}%)
                    </span>
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
                    {getAccuracyInfo().level === 'Media' && 'Buena precisión. El resultado será preciso, pero algunos detalles podrían necesitar verificación manual.'}
                    {getAccuracyInfo().level === 'Baja' && 'Precisión limitada. El resultado será básico y requerirá revisión y completado manual.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h4 className="font-semibold text-red-800 mb-2">Generación de Acción de Tutela</h4>
            <p className="text-red-700 text-sm mb-4">
              Para generar tu acción de tutela personalizada, necesitamos procesar un pago único.
            </p>
            
            {/* ⭐ NUEVO: Selector de cantidad */}
            <div className="mb-4">
              <label htmlFor="quantity" className="block text-sm font-medium text-text-secondary mb-2">
                Cantidad de documentos
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max="99"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(99, val)));
                  }}
                  className="w-20 text-center px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  disabled={quantity >= 99}
                  className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
                <span className="text-sm text-text-secondary">(máx. 99)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-text-primary">Precio unitario:</span>
              <span className="text-xl font-bold text-red-600">50.000 COP</span>
            </div>
            
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-red-200">
              <span className="text-lg font-semibold text-text-primary">Total ({quantity} documento{quantity !== 1 ? 's' : ''}):</span>
              <span className="text-2xl font-bold text-red-600">
                {(50000 * quantity).toLocaleString('es-CO')} COP
              </span>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando Pago...' : 'Procesar Pago'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Document Generation and Download */}
      {currentStep === 3 && generatedDocument && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 3: Descargar Documento</h3>
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

          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={async () => {
                  try {
                    const { default: jsPDF } = await import('jspdf');
                    const doc = new jsPDF();
                    
                    doc.setFont('helvetica');
                    doc.setFontSize(12);
                    
                    const lines = doc.splitTextToSize(generatedDocument.content, 170);
                    let y = 20;
                    const lineHeight = 7;
                    const pageHeight = 280;
                    
                    lines.forEach((line: string) => {
                      if (y > pageHeight) {
                        doc.addPage();
                        y = 20;
                      }
                      doc.text(line, 20, y);
                      y += lineHeight;
                    });
                    
                    doc.save(`${generatedDocument.title}.pdf`);
                  } catch (error) {
                    console.error('Error generando PDF:', error);
                    const blob = new Blob([generatedDocument.content], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${generatedDocument.title}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }
                }}
                disabled={!isPaymentComplete}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Descargar PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    const { Document, Packer, Paragraph, TextRun } = await import('docx');
                    const doc = new Document({
                      sections: [{
                        properties: {},
                        children: generatedDocument.content.split('\n').map(line => 
                          new Paragraph({
                            children: [new TextRun({ text: line, size: 24 })]
                          })
                        )
                      }]
                    });
                    const buffer = await Packer.toBuffer(doc);
                    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${generatedDocument.title}.docx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Error generando Word:', error);
                    alert('Error al generar el documento Word. Inténtalo de nuevo.');
                  }
                }}
                disabled={!isPaymentComplete}
                className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Descargar Word
              </button>
            </div>
          </div>

          <div className="bg-app rounded-lg p-4">
            <h5 className="font-medium text-text-secondary mb-2">Próximos Pasos:</h5>
            <ul className="text-sm text-text-secondary space-y-1">
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
          <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {currentStep === 2 ? 'Procesando Pago' : 'Generando Acción de Tutela'}
              </h3>
              <p className="text-text-secondary">
                {currentStep === 2 
                  ? 'Procesando tu pago...' 
                  : 'Estamos analizando tus documentos y generando tu acción de tutela...'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análisis de Éxito */}
      <AnalisisExitoModal
        isOpen={showAnalisisModal}
        onClose={() => setShowAnalisisModal(false)}
        analisis={analisisExito}
        loading={isAnalyzing}
      />
    </div>
  );
}
