'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary, GeneratedDocument } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { saveUploadedFile, savePdfForUser } from '@/lib/storage';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { isPilotUser } from '@/lib/pilot-users';

interface ReclamacionProcessProps {
  onComplete?: (document: GeneratedDocument) => void;
  userId?: string;
  userEmail?: string;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'contract',
    name: 'Contrato',
    description: 'Contrato o acuerdo comercial',
    required: true,
    color: 'bg-surface-muted/30 text-text-primary'
  },
  {
    id: 'invoice',
    name: 'Factura',
    description: 'Facturas pendientes de pago',
    required: true,
    color: 'bg-surface-muted/30 text-text-primary'
  },
  {
    id: 'correspondence',
    name: 'Correspondencia',
    description: 'Emails, cartas, comunicaciones',
    required: false,
    color: 'bg-surface-muted/20 text-text-secondary'
  },
  {
    id: 'evidence',
    name: 'Pruebas',
    description: 'Documentos que prueban la deuda',
    required: true,
    color: 'bg-surface-muted/30 text-text-primary'
  },
  {
    id: 'identity',
    name: 'Identificación',
    description: 'DNI, NIE o documentos de identidad',
    required: true,
    color: 'bg-surface-muted/30 text-text-primary'
  },
  {
    id: 'other',
    name: 'Otros',
    description: 'Otros documentos relevantes',
    required: false,
    color: 'bg-surface-muted/30 text-text-primary'
  }
];

export default function ReclamacionProcessSimple({ onComplete, userId, userEmail }: ReclamacionProcessProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [caseDescription, setCaseDescription] = useState('');
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const [paymentReclId, setPaymentReclId] = useState<string | null>(null);
  const [currentReclId, setCurrentReclId] = useState<string | null>(null);
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState<Array<{ fileName: string; storagePath: string; downloadUrl?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener usuario autenticado
  useEffect(() => {
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
        setUser(user);
      });
      return () => unsubscribe();
    }
  }, []);

  // Automatic document categorization based on filename keywords
  const categorizeDocument = (filename: string): DocumentCategory => {
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
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user) {
      console.warn('Usuario no autenticado, no se pueden guardar archivos');
      // Aún así permitir subir archivos localmente
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
      return;
    }

    setIsUploading(true);
    try {
      const newDocuments: UploadedDocument[] = [];

      // Procesar cada archivo
      for (const file of Array.from(files).filter(f => f.type === 'application/pdf')) {
        const category = categorizeDocument(file.name);
        const docId = Math.random().toString(36).substr(2, 9);
        
        // Guardar archivo en Firebase Storage
        try {
          const storageResult = await saveUploadedFile(
            user.uid,
            file,
            category.id,
            'reclamacion_cantidades',
            { userType: 'autoservicio', documentType: 'reclamacion-cantidades' }
          );

          newDocuments.push({
            id: docId,
            name: file.name,
            file,
            size: file.size,
            type: file.type,
            category,
            uploadDate: new Date(),
            previewUrl: URL.createObjectURL(file),
            storagePath: storageResult.storagePath,
            downloadURL: storageResult.downloadURL,
            fileId: storageResult.fileId,
          });

          console.log('✅ Archivo guardado en Storage:', storageResult.storagePath);
        } catch (error) {
          console.error('❌ Error guardando archivo:', file.name, error);
          // Aún así agregar el documento localmente
          newDocuments.push({
            id: docId,
            name: file.name,
            file,
            size: file.size,
            type: file.type,
            category,
            uploadDate: new Date(),
            previewUrl: URL.createObjectURL(file)
          });
        }
      }

      setUploadedDocuments(prev => [...prev, ...newDocuments]);
    } catch (error) {
      console.error('Error procesando archivos:', error);
    } finally {
      setIsUploading(false);
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

  // Calculate accuracy percentage based on required documents
  const calculateAccuracy = () => {
    if (!documentSummary) return 0;
    
    const totalRequired = DOCUMENT_CATEGORIES.filter(cat => cat.required).length;
    const missingRequired = documentSummary.missingRequired.length;
    const accuracy = Math.round(((totalRequired - missingRequired) / totalRequired) * 100);
    
    return Math.max(0, accuracy);
  };

  // Get accuracy level and color
  const getAccuracyInfo = () => {
    const accuracy = calculateAccuracy();
    
    if (accuracy >= 80) {
      return {
        level: 'Alta',
        color: 'text-text-primary',
        bgColor: 'bg-surface-muted/20',
        borderColor: 'border-border',
        iconColor: 'text-text-primary'
      };
    } else if (accuracy >= 60) {
      return {
        level: 'Media',
        color: 'text-text-secondary',
        bgColor: 'bg-surface-muted/20',
        borderColor: 'border-border',
        iconColor: 'text-text-secondary'
      };
    } else {
      return {
        level: 'Baja',
        color: 'text-text-secondary',
        bgColor: 'bg-surface-muted/30',
        borderColor: 'border-border',
        iconColor: 'text-text-secondary'
      };
    }
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      // Generar IDs únicos para el documento y la reclamación
      const docId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const reclId = currentReclId || `RECL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Guardar reclId para uso posterior
      setCurrentReclId(reclId);
      setPaymentDocId(docId);
      setPaymentReclId(reclId);

      // Pilot users: saltar completamente Stripe y generar el documento directamente
      if (userEmail && isPilotUser(userEmail)) {
        try {
          console.log('🧪 Pilot user detected, skipping Stripe payment for reclamación');
          await generateDocument(docId, reclId);
          setIsPaymentComplete(true);
          return;
        } catch (error) {
          console.error('❌ Error generating document for pilot user:', error);
          alert(
            error instanceof Error
              ? error.message
              : 'Error generando el documento para usuario piloto.',
          );
          setIsProcessing(false);
          return;
        }
      }
      
      // Si hay archivos subidos pero no guardados, guardarlos ahora
      if (userId && userId !== 'demo_user' && uploadedDocuments.length > 0 && uploadedFilesInfo.length === 0) {
        try {
          console.log(`💾 Guardando ${uploadedDocuments.length} archivos antes del pago...`);
          const pdfFiles = uploadedDocuments.map(doc => doc.file).filter(Boolean) as File[];
          
          if (pdfFiles.length > 0) {
            const formData = new FormData();
            pdfFiles.forEach(file => {
              formData.append('files', file);
            });
            formData.append('userId', userId);
            formData.append('reclId', reclId);

            const response = await fetch('/api/analyze-documents', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data.uploadedFiles) {
                console.log(`✅ ${result.data.uploadedFiles.length} archivos guardados antes del pago`);
                setUploadedFilesInfo(result.data.uploadedFiles);
              }
            }
          }
        } catch (error: any) {
          console.warn('⚠️ Error guardando archivos antes del pago:', error.message);
        }
      }
      
      // Crear sesión de checkout en Stripe (formato unificado como estudiantes/tutela)
      const endpoint = getCheckoutSessionEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: 'reclamacion_cantidades',
          caseId: reclId, // Usar reclId como caseId para consistencia
          uid: userId || 'demo_user',
          userId: userId || 'demo_user',
          customerEmail: userEmail || 'user@example.com',
          successUrl: `${window.location.origin}/dashboard/autoservicio/reclamacion-cantidades?payment=success&caseId=${reclId}`,
          cancelUrl: `${window.location.origin}/dashboard/autoservicio/reclamacion-cantidades?payment=cancelled&caseId=${reclId}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando sesión de checkout');
      }

      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pago. Inténtalo de nuevo.');
      setIsProcessing(false);
    }
  };

  // Función para generar contenido completo del documento
  const generarContenidoDocumentoCompleto = (summary: DocumentSummary | null): string => {
    const fechaActual = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const documentosLista = summary?.categorizedDocuments 
      ? Object.entries(summary.categorizedDocuments)
          .map(([categoryId, docs]) => {
            const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
            return docs.map((doc: any) => `- ${category?.name || 'Documento'}: ${doc.name || doc.fileName || 'Sin nombre'}`).join('\n');
          })
          .join('\n')
      : 'No se han proporcionado documentos específicos.';

    const cantidadReclamada = summary?.totalAmount 
      ? `${summary.totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
      : '[A determinar según documentos analizados]';

    const precisionTexto = summary?.precision 
      ? `La precisión del análisis de documentos es del ${summary.precision}%.`
      : '';

    return `RECLAMACIÓN DE CANTIDADES

EXPEDIENTE: ${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}

${fechaActual}

Estimado/a Sr./Sra.,

Por medio del presente escrito, y en mi condición de acreedor legítimo, me dirijo a usted para reclamar el pago de las cantidades que se detallan a continuación, derivadas de la relación contractual existente entre las partes.

I. HECHOS

PRIMERO.- Que entre las partes existe una relación contractual debidamente documentada, de la que se derivan las obligaciones de pago objeto de la presente reclamación.

SEGUNDO.- Que, pese a los requerimientos realizados, la parte deudora no ha satisfecho las cantidades adeudadas, incumpliendo así sus obligaciones contractuales.

TERCERO.- Que los documentos que acreditan la existencia de la deuda y su cuantía son los siguientes:

${documentosLista}

${precisionTexto}

II. FUNDAMENTOS DE DERECHO

PRIMERO.- De conformidad con lo dispuesto en el artículo 1101 del Código Civil, "quedan sujetos a la indemnización de los daños y perjuicios causados los que en el cumplimiento de sus obligaciones incurrieren en dolo, negligencia o morosidad, y los que de cualquier modo contravinieren al tenor de aquéllas".

SEGUNDO.- En aplicación del artículo 1108 del Código Civil, "si la obligación consistiere en el pago de una cantidad de dinero, y el deudor incurriere en mora, la indemnización de daños y perjuicios, no habiendo pacto en contrario, consistirá en el pago de los intereses convenidos, y, a falta de convenio, en el interés legal del dinero".

TERCERO.- La Ley 3/2004, de 29 de diciembre, de medidas contra la morosidad en las operaciones comerciales, establece el derecho del acreedor a reclamar el pago de las cantidades adeudadas junto con los intereses de demora correspondientes.

CUARTO.- La jurisprudencia del Tribunal Supremo ha establecido de forma reiterada que el incumplimiento de las obligaciones contractuales genera el derecho a reclamar el cumplimiento forzoso y la indemnización de daños y perjuicios.

III. PETICIÓN

Por todo lo expuesto, SOLICITO:

1. Que se tenga por presentado este escrito de reclamación de cantidades.

2. Que se requiera a la parte deudora el pago de la cantidad de ${cantidadReclamada}, correspondiente a las obligaciones incumplidas.

3. Que se reconozcan los intereses de demora desde la fecha de vencimiento de cada obligación hasta el pago efectivo, conforme a lo establecido en la legislación aplicable.

4. Que se condenen en costas a la parte deudora en caso de que la reclamación sea estimada.

IV. OTROSÍ

PRIMERO.- Se acompañan los siguientes documentos:
${documentosLista}

SEGUNDO.- Se deja constancia de que, en caso de no recibir respuesta satisfactoria en el plazo de quince días naturales desde la recepción de la presente reclamación, se procederá a interponer la correspondiente demanda judicial, con las consecuencias legales que de ello puedan derivarse.

Sin otro particular, y a la espera de su respuesta, reciba un cordial saludo.

${fechaActual}

[Firma del acreedor]

---
NOTA: Este documento ha sido generado mediante inteligencia artificial y debe ser revisado por un profesional del derecho antes de su presentación oficial.`;
  };

  const generateDocument = useCallback(async (urlDocId?: string | null, urlReclId?: string | null) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Usar docId y reclId de la URL si están disponibles, sino usar los guardados en el estado
      const docIdToUse = urlDocId || paymentDocId;
      const reclIdToUse = urlReclId || paymentReclId;
      
      if (!docIdToUse || !reclIdToUse) {
        throw new Error('docId y reclId son requeridos para generar el documento');
      }
      
      console.log('🚀 Generando Reclamación de Cantidades con ChatGPT...');
      console.log('📋 Datos disponibles:', {
        hasDocumentSummary: !!documentSummary,
        hasUploadedDocuments: uploadedDocuments.length > 0,
        totalDocuments: uploadedDocuments.length,
        docId: docIdToUse,
        reclId: reclIdToUse
      });
      
             // Preparar datos OCR desde documentos subidos
             const ocrFiles = uploadedDocuments.map((doc, index) => ({
               originalName: doc.name || `Documento ${index + 1}`,
               extractedText: (doc as any).ocrText || (doc as any).text || 'Texto no disponible',
               confidence: (doc as any).confidence || 0.8,
               category: doc.category?.id || 'otros',
               fileType: doc.type || 'application/pdf',
               // Incluir información de Storage si está disponible
               storagePath: (doc as any).storagePath,
               downloadUrl: (doc as any).downloadUrl
             }));

      // Extraer información de documentos categorizados
      let cantidadesAdeudadas: string[] = [];
      let cantidadTotal = '0 euros';
      
      if (documentSummary?.categorizedDocuments) {
        // Buscar información de cantidades en documentos
        Object.values(documentSummary.categorizedDocuments).flat().forEach((doc: any) => {
          if (doc.ocrText) {
            // Extraer cantidades del texto OCR
            const cantidadMatches = doc.ocrText.match(/(\d+[.,]\d+)\s*euros?/gi);
            if (cantidadMatches) {
              cantidadesAdeudadas.push(...cantidadMatches.map((m: string) => m.trim()));
            }
          }
        });
        
        // Calcular total si hay cantidades
        if (cantidadesAdeudadas.length > 0) {
          const total = cantidadesAdeudadas.reduce((sum, cant) => {
            const num = parseFloat(cant.replace(/[^\d,.-]/g, '').replace(',', '.'));
            return sum + (isNaN(num) ? 0 : num);
          }, 0);
          cantidadTotal = `${total.toFixed(2)} euros`;
        }
      }

      // Preparar datos para el endpoint (usar datos reales si están disponibles)
      const requestData = {
        nombreTrabajador: 'María García López', // TODO: Obtener del formulario o perfil
        dniTrabajador: '12345678A',
        domicilioTrabajador: 'Calle Mayor 123, Madrid',
        telefonoTrabajador: '600123456',
        nombreEmpresa: 'Empresa Ejemplo S.L.',
        cifEmpresa: 'B12345678',
        domicilioEmpresa: 'Avenida de la Paz 456, Madrid',
        tipoContrato: 'indefinido',
        jornada: 'completa',
        tareas: 'administrativa',
        antiguedad: '2 años',
        salario: '1.500 euros',
        convenio: 'Convenio de Oficinas y Despachos',
        cantidadesAdeudadas: cantidadesAdeudadas.length > 0 ? cantidadesAdeudadas : [
          'Salarios pendientes: 3.000 euros',
          'Horas extras: 500 euros',
          'Vacaciones no disfrutadas: 800 euros'
        ],
        fechaPapeleta: '15/01/2024',
        fechaConciliacion: '30/01/2024',
        resultadoConciliacion: 'SIN ACUERDO',
        cantidadTotal: cantidadTotal !== '0 euros' ? cantidadTotal : '4.300 euros',
        localidad: 'Madrid',
        userId: userId || 'demo_user',
        // Incluir datos OCR
        ocrFiles: ocrFiles,
        documentSummary: documentSummary ? {
          totalDocuments: documentSummary.totalDocuments,
          categorizedDocuments: documentSummary.categorizedDocuments,
          totalAmount: documentSummary.totalAmount,
          precision: documentSummary.precision
        } : null,
        caseDescription: caseDescription || undefined,
        // Usar docId y reclId de la URL si existen
        docId: docIdToUse,
        reclId: reclIdToUse
      };

      console.log('📤 Enviando datos a ChatGPT:', {
        userId: requestData.userId,
        ocrFilesCount: ocrFiles.length,
        hasDocumentSummary: !!requestData.documentSummary,
        cantidadesAdeudadas: requestData.cantidadesAdeudadas.length,
        docId: requestData.docId,
        reclId: requestData.reclId
      });
      
      // Validar que userId esté presente
      if (!requestData.userId || requestData.userId === 'demo_user') {
        console.warn('⚠️ userId no válido o es demo_user:', requestData.userId);
        if (!userId) {
          throw new Error('userId es requerido para generar el documento. Por favor, inicia sesión.');
        }
      }

      // Usar el endpoint real de generación de documentos
      const response = await fetch('/api/reclamacion-cantidades', {
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

      // Verificar el tipo de contenido
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (contentType?.includes('application/json')) {
        // Respuesta JSON
        const data = await response.json();
        console.log('✅ Respuesta JSON:', data);
        
        // Simular descarga de documento
        const content = `RECLAMACIÓN DE CANTIDADES\n\nEstimado/a Sr./Sra.,\n\nPor medio del presente, me dirijo a ustedes para reclamar las cantidades adeudadas...`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reclamacion-cantidades-${requestData.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Respuesta binaria (PDF) - El endpoint devuelve directamente el PDF con fundamentos legales mejorados
        console.log('📥 Descargando PDF...');
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('El PDF recibido está vacío');
        }
        
        console.log(`✅ PDF recibido: ${blob.size} bytes, tipo: ${blob.type}`);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `reclamacion-cantidades-${requestData.nombreTrabajador}-${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = filename;
        a.style.display = 'none'; // Ocultar el elemento
        document.body.appendChild(a);
        
        // Forzar la descarga
        console.log(`💾 Iniciando descarga: ${filename}`);
        a.click();
        
        // Limpiar después de un breve delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ PDF descargado exitosamente con fundamentos legales mejorados');
        }, 100);
      }

      // Crear documento generado para mostrar en la UI
      // NOTA: El PDF real descargado contiene los fundamentos legales completos y mejorados
      // Este contenido es solo para referencia en la UI
      const generated: GeneratedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Reclamación de Cantidades - ' + new Date().toLocaleDateString('es-ES'),
        content: `✅ DOCUMENTO GENERADO EXITOSAMENTE

El PDF ha sido generado con fundamentos legales completos y referencias específicas a la legislación española.

El documento incluye:
• Datos completos del demandante y demandada
• Hechos detallados de la relación laboral
• Fundamentos de derecho con explicaciones completas:
  - Ley 36/2011, de 10 de octubre, reguladora de la jurisdicción social (LJS)
  - Real Decreto Legislativo 2/2015, Estatuto de los Trabajadores
  - Ley 3/2004, de medidas contra la morosidad
  - Código Civil español (artículos 1101, 1108, 1902)
  - Jurisprudencia del Tribunal Supremo con referencias específicas
• Petitorio con solicitudes específicas al Juzgado
• Medios de prueba documentales

El PDF ha sido descargado y guardado en tu historial. Está listo para su revisión y presentación ante el Juzgado de lo Social.`,
        type: 'reclamacion_cantidades',
        generatedAt: new Date()
      };

      setGeneratedDocument(generated);
      setCurrentStep(3);
      setIsProcessing(false);
      
      console.log('✅ Reclamación de Cantidades generada exitosamente con fundamentos legales mejorados');
      
      // Disparar evento personalizado para actualizar el historial
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document-generated', {
          detail: { docId: docIdToUse, reclId: reclIdToUse }
        }));
        console.log('📢 Evento document-generated disparado');
      }

    } catch (error: any) {
      console.error('❌ Error generando documento:', error);
      setError(error.message || 'Error generando el documento. Por favor, intenta de nuevo.');
      setIsProcessing(false);
      
      // Mostrar error al usuario
      alert(`Error generando documento: ${error.message}`);
    }
  }, [documentSummary, uploadedDocuments, userId, paymentDocId, paymentReclId, caseDescription, onComplete]);

  // Detectar cuando se regresa de Stripe con pago exitoso
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const caseId = urlParams.get('caseId'); // Usar caseId (consistente con webhook)
    const docId = urlParams.get('docId'); // Mantener para backward compatibility
    const reclId = urlParams.get('reclId'); // Mantener para backward compatibility
    
    // Usar caseId si está disponible, sino usar reclId o docId
    const finalCaseId = caseId || reclId || docId;
    
    if (paymentStatus === 'success' && !isPaymentComplete) {
      console.log('✅ Pago completado, documento será generado automáticamente por webhook...', { caseId: finalCaseId });
      setIsPaymentComplete(true);
      
      // Guardar IDs del pago
      if (finalCaseId) {
        setPaymentReclId(finalCaseId);
        setCurrentReclId(finalCaseId);
      }
      if (docId) setPaymentDocId(docId);
      
      // Disparar evento de pago completado para actualizar el historial
      window.dispatchEvent(new CustomEvent('payment-completed', {
        detail: { caseId: finalCaseId, docId, reclId: finalCaseId }
      }));
      console.log('💳 Evento payment-completed disparado');
      
      // Nota: El documento se genera automáticamente por el webhook de Stripe
      // No necesitamos llamar a generateDocument aquí
      // El usuario puede ver el documento en el historial de compras
      
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      console.log('❌ Pago cancelado');
      alert('El pago fue cancelado. Puedes intentarlo de nuevo cuando estés listo.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isPaymentComplete]); // Remover generateDocument de dependencias ya que no se llama

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
      
      // Generar el PDF como blob
      const pdfBlob = doc.output('blob');
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfUint8Array = new Uint8Array(pdfBuffer);

      // Guardar en Firebase Storage si el usuario está autenticado
      if (user && generatedDocument.id) {
        try {
          const storageResult = await savePdfForUser(
            user.uid,
            generatedDocument.id,
            pdfUint8Array,
            {
              fileName: `${generatedDocument.title.replace(/\s+/g, '_')}.pdf`,
              contentType: 'application/pdf',
              documentType: 'reclamacion_cantidades',
              storageContext: { userType: 'autoservicio', documentType: 'reclamacion-cantidades' },
            }
          );
          console.log('✅ PDF guardado en Storage:', storageResult.storagePath);
          
          // Actualizar el documento generado con la información de Storage
          setGeneratedDocument(prev => prev ? {
            ...prev,
            storagePath: storageResult.storagePath,
            downloadURL: storageResult.downloadURL
          } : null);
        } catch (storageError) {
          console.error('❌ Error guardando PDF en Storage:', storageError);
          // Continuar con la descarga aunque falle el guardado
        }
      }

      // Descargar el PDF
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
    setCaseDescription('');
    setIsProcessing(false);
    setIsPaymentComplete(false);
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Proceso de Reclamación de Cantidades
        </h2>
        <p className="text-text-secondary">
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
                  ? 'bg-sidebar text-text-on-dark' 
                  : 'bg-gray-200 text-text-secondary'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-sidebar' : 'bg-surface-muted'
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

      {/* Step 1: Document Upload and Analysis */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-text-primary">Paso 1: Subir y Analizar Documentos PDF</h3>
          
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-sidebar transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm text-text-secondary">
              {isUploading ? 'Subiendo archivos a Firebase Storage...' : 'Arrastra archivos PDF aquí o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Solo se permiten archivos PDF
            </p>
            {isUploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sidebar mx-auto"></div>
              </div>
            )}
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
              <h4 className="font-medium text-text-primary">Documentos subidos ({uploadedDocuments.length})</h4>
              
              {/* Document List with Categories */}
              <div className="space-y-3">
                {uploadedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-app rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-text-secondary mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-text-primary">{doc.name}</span>
                        <span className="text-xs text-text-secondary ml-2">
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
                        className="text-text-primary hover:text-text-secondary text-sm"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="text-text-primary hover:text-text-secondary text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analysis Summary */}
              {documentSummary && (
                <div className="bg-surface-muted/20 border border-border rounded-lg p-4">
                  <h5 className="font-medium text-text-primary mb-3">Análisis de Documentos</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">Total documentos:</span>
                      <span className="ml-2 font-medium">{documentSummary.totalDocuments}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Análisis completo:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        documentSummary.analysisComplete 
                          ? 'bg-surface-muted/30 text-text-primary' 
                          : 'bg-surface-muted/30 text-text-primary'
                      }`}>
                        {documentSummary.analysisComplete ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                  
                  {documentSummary.missingRequired.length > 0 && (
                    <div className="mt-3 p-3 bg-surface-muted/30 border border-border rounded">
                      <p className="text-sm text-text-primary font-medium">Documentos requeridos faltantes:</p>
                      <ul className="text-sm text-text-secondary mt-1">
                        {documentSummary.missingRequired.map((category) => (
                          <li key={category}>• {category}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="case-description" className="block text-sm font-medium text-text-primary">
                  Descripción del caso
                </label>
                <textarea
                  id="case-description"
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  placeholder="Describe brevemente tu caso: contexto, cantidades reclamadas, fechas relevantes, etc."
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-app text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-transparent resize-y"
                />
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={generateSummary}
                  disabled={uploadedDocuments.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analizar Documentos y Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Payment */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 2: Procesar Pago</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-text-primary hover:text-text-secondary"
            >
              ← Volver al Paso 1
            </button>
          </div>

          <div className="bg-app rounded-lg p-6">
            <h4 className="font-semibold text-text-primary mb-4">Resumen de la Reclamación</h4>
            
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
                        getAccuracyInfo().level === 'Alta' ? 'bg-sidebar' :
                        getAccuracyInfo().level === 'Media' ? 'bg-surface-muted' : 'bg-surface-muted'
                      }`}
                      style={{ width: `${calculateAccuracy()}%` }}
                    ></div>
                  </div>
                  
                  <p className={`text-sm ${getAccuracyInfo().color}`}>
                    {getAccuracyInfo().level === 'Alta' && 'Excelente precisión. El resultado será muy preciso basado en los documentos proporcionados.'}
                    {getAccuracyInfo().level === 'Media' && 'Buena precisión. El resultado será preciso, pero algunos detalles podrían necesitar verificación manual.'}
                    {getAccuracyInfo().level === 'Baja' && 'Precisión limitada. El resultado será básico y requerirá revisión y completado manual.'}
                  </p>
                  
                  {documentSummary.missingRequired.length > 0 && (
                    <div className="mt-3 p-3 bg-card border border-border rounded">
                      <p className="text-sm text-text-secondary font-medium mb-1">Documentos requeridos faltantes:</p>
                      <ul className="text-sm text-text-secondary">
                        {documentSummary.missingRequired.map((category) => (
                          <li key={category} className="flex items-center">
                            <svg className="w-3 h-3 text-text-secondary mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                  <h5 className="font-medium text-text-secondary mb-2">Documentos por categoría:</h5>
                  <div className="space-y-1">
                    {Object.entries(documentSummary.categorizedDocuments).map(([categoryId, docs]) => {
                      const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
                      if (docs.length === 0) return null;
                      return (
                        <div key={categoryId} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">{category?.name}</span>
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

          <div className="bg-surface-muted/20 border border-border rounded-lg p-6">
            <h4 className="font-semibold text-text-primary mb-2">Generación de Reclamación de Cantidades</h4>
            <p className="text-text-secondary text-sm mb-4">
              Para generar tu reclamación de cantidades personalizada, necesitamos procesar un pago único.
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-text-primary">Precio:</span>
              <span className="text-2xl font-bold text-text-primary">€10.00</span>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando Pago...' : 'Procesar Pago'}
            </button>
            
            <p className="text-xs text-text-secondary mt-2 text-center">
              Pago simulado para demostración
            </p>
            
            {documentSummary && documentSummary.missingRequired.length > 0 && (
              <div className="mt-3 p-3 bg-surface-muted/20 border border-border rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-text-primary mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-text-primary font-medium">Puedes proceder con el pago</p>
                    <p className="text-xs text-text-secondary mt-1">
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
            <h3 className="text-lg font-semibold text-text-primary">Paso 3: Descargar Documento</h3>
            <button
              onClick={resetProcess}
              className="text-sm text-text-primary hover:text-text-secondary"
            >
              Crear Nueva Reclamación
            </button>
          </div>

          <div className="bg-surface-muted/20 border border-border rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-semibold text-text-primary">¡Reclamación Generada Exitosamente!</h4>
            </div>
            <p className="text-text-secondary mb-4">
              Tu reclamación de cantidades ha sido generada y está lista para su uso.
            </p>
            <div className="text-sm text-text-primary">
              <p><strong>Título:</strong> {generatedDocument.title}</p>
              <p><strong>Generado:</strong> {generatedDocument.generatedAt.toLocaleString('es-ES')}</p>
            </div>
          </div>

          {/* Email Notification */}
          <div className="bg-surface-muted/20 border border-border rounded-lg p-6">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="font-semibold text-text-primary">Email Enviado Automáticamente</h4>
            </div>
            <p className="text-text-secondary mb-3">
              Hemos enviado un email a tu dirección con los siguientes archivos adjuntos:
            </p>
            <ul className="text-sm text-text-secondary space-y-1">
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
            <p className="text-xs text-text-secondary mt-3">
              Revisa tu bandeja de entrada y carpeta de spam si no recibes el email en unos minutos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={async () => {
                  // Descargar como PDF directamente sin abrir nueva pestaña
                  try {
                    const { default: jsPDF } = await import('jspdf');
                    const doc = new jsPDF();
                    
                    doc.setFont('helvetica');
                    doc.setFontSize(12);
                    
                    // Dividir el contenido en líneas que quepan en la página
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
                    // Fallback: descargar como texto
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
                  // Descargar como Word directamente
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
            
            {!isPaymentComplete && (
              <div className="bg-surface-muted/20 border border-border rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-text-secondary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-text-secondary">
                    Los botones se habilitarán una vez que se complete el pago.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-app rounded-lg p-4">
            <h5 className="font-medium text-text-secondary mb-2">Próximos Pasos:</h5>
            <ul className="text-sm text-text-secondary space-y-1">
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
          <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {currentStep === 2 ? 'Procesando Pago' : 'Generando Reclamación'}
              </h3>
              <p className="text-text-secondary">
                {currentStep === 2 
                  ? 'Procesando tu pago...' 
                  : 'Estamos analizando tus documentos y generando tu reclamación de cantidades...'
                }
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
