'use client';

import { useState, useCallback } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary, GeneratedDocument } from '@/types';
import AnalisisExitoModal from './AnalisisExitoModal';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { isPilotUser } from '@/lib/pilot-users';
import { Button } from '@/components/ui/Button';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import { Alert } from '@/components/ui/Alert';
import { CircleCheck, FileText, Minus, Plus, X } from 'lucide-react';
import DocumentWizard, { type WizardStep } from '@/components/wizard/DocumentWizard';
import FileDropzone from '@/components/wizard/FileDropzone';
import DocumentPreview, { Mark } from '@/components/wizard/DocumentPreview';
import AIJobProgress from '@/components/wizard/AIJobProgress';

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
    color: 'bg-surface-muted text-text'
  },
  {
    id: 'evidencia',
    name: 'Evidencias',
    description: 'Documentos que prueban la vulneración',
    required: true,
    color: 'bg-surface-muted text-text'
  },
  {
    id: 'comunicaciones',
    name: 'Comunicaciones',
    description: 'Emails, cartas, notificaciones',
    required: false,
    color: 'bg-surface-muted text-text'
  },
  {
    id: 'testimonios',
    name: 'Testimonios',
    description: 'Declaraciones de testigos',
    required: false,
    color: 'bg-surface-muted text-text'
  },
  {
    id: 'juridicos',
    name: 'Documentos Jurídicos',
    description: 'Leyes, jurisprudencia, precedentes',
    required: false,
    color: 'bg-surface-muted text-text'
  },
  {
    id: 'otros',
    name: 'Otros',
    description: 'Otros documentos relevantes',
    required: false,
    color: 'bg-surface-muted/30 text-text'
  }
];

const STEP = { datos: 1, documentos: 2, revision: 3, pago: 4, descarga: 5 } as const;
const UNIT_PRICE_COP = 50000; // display only — the charged amount is set in handlePayment (unchanged)

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
  // v4 wizard UI state
  const [generating, setGenerating] = useState(false);
  const [confirmData, setConfirmData] = useState(false);
  const [confirmSelf, setConfirmSelf] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

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

  // "Aplicar datos extraídos" was removed in DS v4: it filled the form with placeholder text
  // ("Entidad extraída del documento") instead of real extraction, and would now overwrite the
  // user's own answers (Datos comes first). TODO(ds-v4): real field extraction from the OCR text.

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
          setGenerating(true);
          setCurrentStep(STEP.descarga);
          await generateDocument(docId, tutelaId).finally(() => setGenerating(false));
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
          successUrl: `${window.location.origin}/escritos/accion-tutela?payment=success`,
          cancelUrl: `${window.location.origin}/escritos/accion-tutela?payment=cancelled`
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
      setCurrentStep(STEP.descarga);
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
    setConfirmData(false);
    setConfirmSelf(false);
  };

  const requiredOk = !!(formData.vulnerador && formData.hechos && formData.derecho && formData.peticiones);
  const derechoLabel = DERECHOS_OPTIONS.find(o => o.value === formData.derecho)?.label ?? '';
  const fieldCls = (invalid: boolean) =>
    `w-full px-3 py-2 rounded-md border bg-surface text-text ${invalid ? 'border-danger' : 'border-border-strong'}`;
  const missing = (v: string) => showMissing && !v.trim();
  const errorText = (id: string, v: string) =>
    missing(v) ? <p id={`${id}-err`} className="mt-1 text-caption text-danger-text">Este campo es obligatorio.</p> : null;

  const datosStep: WizardStep = {
    id: 'datos',
    label: 'Datos',
    title: 'Cuéntanos qué ha pasado',
    description: 'Con estos datos redactaremos tu acción de tutela. Los campos con * son obligatorios.',
    content: (
      <div className="space-y-5">
        {showMissing && !requiredOk && (
          <Alert tone="danger" title="Faltan campos obligatorios">Revisa los campos marcados en rojo.</Alert>
        )}
        <div>
          <label htmlFor="vulnerador" className="block text-small font-medium text-text mb-1">
            Persona o entidad que vulnera el derecho <span className="text-danger-text" aria-hidden>*</span>
          </label>
          <input
            type="text" id="vulnerador" required
            value={formData.vulnerador}
            onChange={(e) => setFormData(prev => ({ ...prev, vulnerador: e.target.value }))}
            aria-invalid={missing(formData.vulnerador) || undefined}
            aria-describedby={missing(formData.vulnerador) ? 'vulnerador-err' : undefined}
            className={`${fieldCls(missing(formData.vulnerador))} h-control-md`}
            placeholder="Ej.: Alcaldía de Bogotá, Empresa XYZ…"
          />
          {errorText('vulnerador', formData.vulnerador)}
        </div>
        <div>
          <label htmlFor="hechos" className="block text-small font-medium text-text mb-1">
            Relato detallado de los hechos <span className="text-danger-text" aria-hidden>*</span>
          </label>
          <textarea
            id="hechos" rows={6} required
            value={formData.hechos}
            onChange={(e) => setFormData(prev => ({ ...prev, hechos: e.target.value }))}
            aria-invalid={missing(formData.hechos) || undefined}
            aria-describedby={missing(formData.hechos) ? 'hechos-err' : undefined}
            className={fieldCls(missing(formData.hechos))}
            placeholder="Qué sucedió, cuándo, dónde y cómo se vulneró el derecho…"
          />
          {errorText('hechos', formData.hechos)}
        </div>
        <div>
          <label htmlFor="derecho" className="block text-small font-medium text-text mb-1">
            Derecho vulnerado <span className="text-danger-text" aria-hidden>*</span>
          </label>
          <select
            id="derecho" required
            value={formData.derecho}
            onChange={(e) => setFormData(prev => ({ ...prev, derecho: e.target.value }))}
            aria-invalid={missing(formData.derecho) || undefined}
            aria-describedby={missing(formData.derecho) ? 'derecho-err' : undefined}
            className={`${fieldCls(missing(formData.derecho))} h-control-md`}
          >
            <option value="">Selecciona un derecho</option>
            {DERECHOS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errorText('derecho', formData.derecho)}
        </div>
        <div>
          <label htmlFor="peticiones" className="block text-small font-medium text-text mb-1">
            ¿Qué le pides al juez? (órdenes concretas) <span className="text-danger-text" aria-hidden>*</span>
          </label>
          <textarea
            id="peticiones" rows={4} required
            value={formData.peticiones}
            onChange={(e) => setFormData(prev => ({ ...prev, peticiones: e.target.value }))}
            aria-invalid={missing(formData.peticiones) || undefined}
            aria-describedby={missing(formData.peticiones) ? 'peticiones-err' : undefined}
            className={fieldCls(missing(formData.peticiones))}
            placeholder="Especifica claramente qué órdenes solicitas…"
          />
          {errorText('peticiones', formData.peticiones)}
        </div>
        <label className="flex items-start gap-3 text-body-sm text-text">
          <input
            type="checkbox"
            checked={formData.medidasProvisionales}
            onChange={(e) => setFormData(prev => ({ ...prev, medidasProvisionales: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-accent"
          />
          Solicitar medidas provisionales
        </label>
        <div>
          <label htmlFor="ciudad" className="block text-small font-medium text-text mb-1">
            Ciudad <span className="text-text-muted font-normal">(opcional)</span>
          </label>
          <input
            type="text" id="ciudad"
            value={formData.ciudad}
            onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
            className={`${fieldCls(false)} h-control-md`}
            placeholder="Bogotá"
          />
        </div>
      </div>
    ),
    cta: {
      label: 'Continuar',
      onClick: () => {
        if (!requiredOk) { setShowMissing(true); return; }
        setShowMissing(false);
        setCurrentStep(STEP.documentos);
      },
    },
  };

  const documentosStep: WizardStep = {
    id: 'documentos',
    label: 'Documentos',
    title: 'Aporta tus pruebas (opcional)',
    description: 'Identificación, evidencias de la vulneración, comunicaciones… Solo PDF, máx. 10 MB por archivo.',
    content: (
      <div className="space-y-6">
        <FileDropzone onFiles={handleFileUpload} accept=".pdf" acceptLabel="Solo PDF · máx. 10 MB por archivo" />

        {uploadedDocuments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-h4">Archivos subidos ({uploadedDocuments.length})</h4>
            <ul className="divide-y divide-border rounded-md border border-border">
              {uploadedDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="shrink-0 text-accent-text" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-text truncate">{doc.name}</p>
                      {doc.category && <p className="text-caption text-text-muted">{doc.category.name}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)} aria-label={`Quitar ${doc.name}`}>Quitar</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <section className="rounded-lg border border-border p-4 space-y-3">
          <div>
            <h4 className="text-h4">Leer el texto de documentos escaneados (OCR)</h4>
            <p className="text-caption text-text-muted">Opcional: el texto reconocido se incluirá en el escrito.</p>
          </div>
          <FileDropzone
            onFiles={files => setSelectedFiles(files)}
            accept=".pdf"
            acceptLabel={selectedFiles?.length ? `${selectedFiles.length} archivo(s) listos para leer` : 'PDF escaneados'}
            busy={isProcessingOcr}
            busyLabel="Leyendo el texto de tus documentos…"
            privacy={false}
          />
          {selectedFiles && selectedFiles.length > 0 && !isProcessingOcr && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={processOcrFiles}>{`Leer ${selectedFiles.length} archivo(s)`}</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(null)}>Cancelar</Button>
            </div>
          )}
          {error && <Alert tone="danger" title="No se pudo leer el archivo" onDismiss={() => setError(null)}>{error}</Alert>}
          {ocrFiles.length > 0 && (
            <div className="space-y-2">
              <ul className="divide-y divide-border rounded-md border border-border">
                {ocrFiles.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-text truncate">{file.originalName}</p>
                      <p className="text-caption text-text-muted">
                        {file.pages} página(s) · confianza {(file.confidence * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %
                      </p>
                    </div>
                    <button type="button" onClick={() => removeOcrFile(file.id)} aria-label={`Quitar ${file.originalName}`} className="text-text-muted hover:text-danger-text">
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-3 text-body-sm text-text">
                <input type="checkbox" checked={useOcrData} onChange={e => setUseOcrData(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
                Usar el texto reconocido al redactar el escrito
              </label>
            </div>
          )}
        </section>
      </div>
    ),
    cta: {
      label: 'Revisar',
      disabled: isProcessingOcr,
      onClick: () => { generateSummary(); setCurrentStep(STEP.revision); },
    },
  };

  const revisionStep: WizardStep = {
    id: 'revision',
    label: 'Revisión',
    title: 'Revisa antes de pagar',
    description: 'Así usaremos tus respuestas en el escrito. Lo resaltado lo has escrito tú: compruébalo.',
    content: (
      <div className="space-y-5">
        <DocumentPreview
          title="Acción de tutela — borrador"
          note="Vista previa de los datos. El escrito completo se redacta tras el pago y debes revisarlo antes de presentarlo."
        >
          <h1>Señor Juez de la República{formData.ciudad ? <> — <Mark>{formData.ciudad}</Mark></> : null}</h1>
          <p>
            Referencia: acción de tutela contra <Mark>{formData.vulnerador || '—'}</Mark> por vulneración del{' '}
            <Mark>{derechoLabel || '—'}</Mark>, conforme al artículo 86 de la Constitución Política y el Decreto 2591 de 1991.
          </p>
          <h2>Hechos</h2>
          <p className="whitespace-pre-wrap"><Mark>{formData.hechos || '—'}</Mark></p>
          <h2>Peticiones</h2>
          <p className="whitespace-pre-wrap"><Mark>{formData.peticiones || '—'}</Mark></p>
          {formData.medidasProvisionales && <p>Se solicitan medidas provisionales.</p>}
        </DocumentPreview>

        {documentSummary && (
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="text-h4">Pruebas aportadas</h4>
            <p className="text-body-sm text-text">
              {documentSummary.totalDocuments} {documentSummary.totalDocuments === 1 ? 'documento' : 'documentos'}
              {ocrFiles.length > 0 && useOcrData ? ` · texto reconocido de ${ocrFiles.length} archivo(s)` : ''}
            </p>
            {documentSummary.missingRequired.length > 0 && (
              <Alert tone="warning" title="Pruebas recomendadas que faltan">
                {documentSummary.missingRequired.join(', ')}. Puedes continuar, pero el escrito será más sólido si las aportas.
              </Alert>
            )}
          </section>
        )}

        <fieldset className="space-y-3">
          <legend className="sr-only">Confirmaciones antes del pago</legend>
          <label className="flex items-start gap-3 text-body-sm text-text">
            <input type="checkbox" checked={confirmData} onChange={e => setConfirmData(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
            He revisado los datos resaltados y son correctos.
          </label>
          <label className="flex items-start gap-3 text-body-sm text-text">
            <input type="checkbox" checked={confirmSelf} onChange={e => setConfirmSelf(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
            Entiendo que Avocat genera un borrador con IA y que debo revisarlo y presentarlo yo.
          </label>
        </fieldset>
      </div>
    ),
    cta: {
      label: 'Continuar al pago',
      disabled: !confirmData || !confirmSelf,
      hint: !confirmData || !confirmSelf ? 'Marca las dos confirmaciones para continuar.' : undefined,
      onClick: () => setCurrentStep(STEP.pago),
    },
  };

  const total = (UNIT_PRICE_COP * quantity).toLocaleString('es-CO');
  const pagoStep: WizardStep = {
    id: 'pago',
    label: 'Pago',
    title: 'Pago',
    description: 'Pago único. Te llevaremos a la pasarela segura de Stripe.',
    content: (
      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <label htmlFor="quantity" className="block text-small font-medium text-text mb-1">Cantidad de documentos</label>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={Minus} aria-label="Uno menos" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} />
              <input
                type="number" id="quantity" min="1" max="99" value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(99, val)));
                }}
                className="w-20 h-control-sm text-center rounded-md border border-border-strong bg-surface text-text"
              />
              <Button variant="secondary" size="sm" icon={Plus} aria-label="Uno más" onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} />
              <span className="text-caption text-text-muted">máx. 99</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-text-muted">Precio unitario</span>
            <span className="text-text">{UNIT_PRICE_COP.toLocaleString('es-CO')} COP</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-body-sm font-semibold text-text-heading">Total ({quantity} documento{quantity !== 1 ? 's' : ''})</span>
            <span className="font-display text-h2 text-text-heading">{total} COP</span>
          </div>
        </div>
      </div>
    ),
    cta: {
      label: `Pagar ${total} COP`,
      onClick: handlePayment,
      loading: isProcessing && !generating,
      loadingText: 'Preparando el pago…',
    },
  };

  const descargaStep: WizardStep = {
    id: 'descarga',
    label: 'Descarga',
    title: generatedDocument ? 'Tu acción de tutela está lista' : 'Generando tu acción de tutela',
    content: (
      <div className="space-y-4">
        {!generatedDocument && (
          <>
            {/* TODO(ds-v4): drive the steps from generation events; /api/accion-tutela is a single request today. */}
            <AIJobProgress
              title="Generando tu acción de tutela"
              steps={['Pago confirmado', 'Analizando tus documentos', 'Redactando hechos, fundamentos y peticiones', 'Preparando el PDF']}
              current={generating ? 1 : 0}
              typicalSeconds={90}
              canLeave={false}
            />
            {error && <Alert tone="danger" title="No se pudo generar el documento" onDismiss={() => setError(null)}>{error}</Alert>}
          </>
        )}
        {generatedDocument && (
          <>
            <AIDisclaimer />
            <Alert tone="success" title="Acción de tutela generada">
              El PDF se ha descargado y se ha guardado en tu historial.
              <span className="block text-caption text-text-muted mt-1">
                {generatedDocument.title} · {generatedDocument.generatedAt.toLocaleString('es-ES')}
              </span>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    const { default: jsPDF } = await import('jspdf');
                    const doc = new jsPDF();
                    // TODO(ds-v4): this exports the summary note, not the tutela itself (that PDF is
                    // downloaded during generation). Embed EB Garamond here when jsPDF fonts are added.
                    doc.setFont('helvetica');
                    doc.setFontSize(12);
                    const lines = doc.splitTextToSize(generatedDocument.content, 170);
                    let y = 20;
                    const lineHeight = 7;
                    const pageHeight = 280;
                    lines.forEach((line: string) => {
                      if (y > pageHeight) { doc.addPage(); y = 20; }
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
                variant="primary"
              >
                Descargar PDF
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { Document, Packer, Paragraph, TextRun } = await import('docx');
                    const doc = new Document({
                      sections: [{
                        properties: {},
                        children: generatedDocument.content.split('\n').map(line =>
                          new Paragraph({ children: [new TextRun({ text: line, size: 24, font: 'EB Garamond' })] })
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
                variant="secondary"
              >
                Descargar Word
              </Button>
              <Button variant="ghost" onClick={resetProcess}>Crear otra acción de tutela</Button>
            </div>
            <section className="rounded-lg border border-border p-4">
              <h4 className="text-h4 mb-2 flex items-center gap-2"><CircleCheck size={18} className="text-success-text" aria-hidden /> Próximos pasos</h4>
              <ul className="list-disc pl-5 text-body-sm text-text space-y-1">
                <li>Revisa el documento generado.</li>
                <li>Ajusta el contenido a tu caso.</li>
                <li>Presenta la acción de tutela ante el juez competente.</li>
                <li>Guarda una copia para tus registros.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    ),
    back: false,
  };

  return (
    <>
      <DocumentWizard
        title="Acción de tutela"
        subtitle="Sigue estos pasos para preparar tu escrito."
        steps={[datosStep, documentosStep, revisionStep, pagoStep, descargaStep]}
        current={currentStep}
        onStepChange={setCurrentStep}
        locked={isPaymentComplete || generating}
      />

      {/* Modal de Análisis de Éxito */}
      <AnalisisExitoModal
        isOpen={showAnalisisModal}
        onClose={() => setShowAnalisisModal(false)}
        analisis={analisisExito}
        loading={isAnalyzing}
      />
    </>
  );
}
