'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { saveUploadedFile } from '@/lib/storage';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';

interface ReclamacionProcessProps {
  userId?: string;
  userEmail?: string;
}

interface ReclamacionFormData {
  nombreTrabajador: string;
  dniTrabajador: string;
  domicilioTrabajador: string;
  telefonoTrabajador: string;
  nombreEmpresa: string;
  cifEmpresa: string;
  domicilioEmpresa: string;
  tipoContrato: string;
  jornada: string;
  tareas: string;
  antiguedad: string;
  salario: string;
  convenio: string;
  fechaPapeleta: string;
  fechaConciliacion: string;
  resultadoConciliacion: string;
  localidad: string;
}

const EMPTY_FORM_DATA: ReclamacionFormData = {
  nombreTrabajador: '',
  dniTrabajador: '',
  domicilioTrabajador: '',
  telefonoTrabajador: '',
  nombreEmpresa: '',
  cifEmpresa: '',
  domicilioEmpresa: '',
  tipoContrato: '',
  jornada: '',
  tareas: '',
  antiguedad: '',
  salario: '',
  convenio: '',
  fechaPapeleta: '',
  fechaConciliacion: '',
  resultadoConciliacion: '',
  localidad: '',
};

const REQUIRED_FORM_FIELDS: (keyof ReclamacionFormData)[] = [
  'nombreTrabajador',
  'dniTrabajador',
  'domicilioTrabajador',
  'telefonoTrabajador',
  'nombreEmpresa',
  'cifEmpresa',
  'domicilioEmpresa',
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

export default function ReclamacionProcessSimple({ userId, userEmail }: ReclamacionProcessProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reclamacionFormData, setReclamacionFormData] = useState<ReclamacionFormData>(EMPTY_FORM_DATA);
  const [currentReclId, setCurrentReclId] = useState<string | null>(null);
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

  const updateFormField = (field: keyof ReclamacionFormData, value: string) => {
    setReclamacionFormData(prev => ({ ...prev, [field]: value }));
  };

  const missingFormFields = REQUIRED_FORM_FIELDS.filter(field => !reclamacionFormData[field].trim());

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      if (!userId) {
        throw new Error('Debes iniciar sesión para continuar.');
      }

      const reclId = currentReclId || `RECL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentReclId(reclId);

      // 1. Guardar el caso (formData + OCR de los documentos) en Firestore
      const documents = await Promise.all(
        uploadedDocuments.map(async (doc) => ({
          name: doc.name,
          mimeType: doc.type,
          base64: await blobToBase64(doc.file),
        }))
      );

      const caseResponse = await fetch('/api/reclamacion-cantidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          caseId: reclId,
          formData: reclamacionFormData,
          documents,
        }),
      });

      if (!caseResponse.ok) {
        const errorData = await caseResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error guardando los datos de la reclamación');
      }

      // 2. Crear sesión de checkout en Stripe
      const endpoint = getCheckoutSessionEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ name: 'Reclamación de Cantidades', price: 1000, quantity: 1 }],
          documentType: 'reclamacion_cantidades',
          caseId: reclId,
          uid: userId,
          userId,
          customerEmail: userEmail || 'user@example.com',
          successUrl: `${window.location.origin}/dashboard/autoservicio/reclamacion-cantidades?payment=success&caseId=${reclId}`,
          cancelUrl: `${window.location.origin}/dashboard/autoservicio/reclamacion-cantidades?payment=cancelled&caseId=${reclId}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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

  // Detectar cuando se regresa de Stripe con pago exitoso
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const caseId = urlParams.get('caseId');

    if (paymentStatus === 'success' && !isPaymentComplete) {
      console.log('✅ Pago completado, documento será generado automáticamente por webhook...', { caseId });
      setIsPaymentComplete(true);
      setCurrentStep(4);

      if (caseId) {
        setCurrentReclId(caseId);
      }

      // Disparar evento de pago completado para actualizar el historial
      window.dispatchEvent(new CustomEvent('payment-completed', {
        detail: { caseId }
      }));

      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      console.log('❌ Pago cancelado');
      alert('El pago fue cancelado. Puedes intentarlo de nuevo cuando estés listo.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isPaymentComplete]);

  const resetProcess = () => {
    setCurrentStep(1);
    setUploadedDocuments([]);
    setDocumentSummary(null);
    setReclamacionFormData(EMPTY_FORM_DATA);
    setCurrentReclId(null);
    setIsProcessing(false);
    setIsPaymentComplete(false);
  };

  const renderField = (
    field: keyof ReclamacionFormData,
    label: string,
    options?: { required?: boolean; placeholder?: string }
  ) => (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {options?.required && <span className="text-text-secondary"> *</span>}
      </label>
      <input
        id={field}
        type="text"
        value={reclamacionFormData[field]}
        onChange={(e) => updateFormField(field, e.target.value)}
        placeholder={options?.placeholder}
        className="w-full px-3 py-2 border border-border rounded-lg bg-app text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-transparent"
      />
    </div>
  );

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
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? 'bg-sidebar text-text-on-dark'
                  : 'bg-gray-200 text-text-secondary'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-sidebar' : 'bg-surface-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>Subir y Analizar</span>
          <span>Tus Datos</span>
          <span>Pago</span>
          <span>Confirmación</span>
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

      {/* Step 2: Tus Datos */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 2: Tus Datos</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-text-primary hover:text-text-secondary"
            >
              ← Volver al Paso 1
            </button>
          </div>

          <p className="text-text-secondary text-sm">
            Estos datos se usarán para redactar tu reclamación de cantidades. Los campos marcados con * son obligatorios.
          </p>

          <div className="space-y-4">
            <h4 className="font-medium text-text-primary">Datos del Trabajador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('nombreTrabajador', 'Nombre completo', { required: true, placeholder: 'Ej: Juan Pérez García' })}
              {renderField('dniTrabajador', 'DNI / NIE', { required: true, placeholder: 'Ej: 12345678A' })}
              {renderField('domicilioTrabajador', 'Domicilio', { required: true, placeholder: 'Ej: Calle Mayor 1, Madrid' })}
              {renderField('telefonoTrabajador', 'Teléfono', { required: true, placeholder: 'Ej: 600123456' })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-text-primary">Datos de la Empresa</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('nombreEmpresa', 'Nombre / Razón social', { required: true, placeholder: 'Ej: Empresa S.L.' })}
              {renderField('cifEmpresa', 'CIF', { required: true, placeholder: 'Ej: B12345678' })}
              <div className="md:col-span-2">
                {renderField('domicilioEmpresa', 'Domicilio', { required: true, placeholder: 'Ej: Avenida de la Paz 1, Madrid' })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-text-primary">Relación Laboral (opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('tipoContrato', 'Tipo de contrato', { placeholder: 'Ej: indefinido, temporal' })}
              {renderField('jornada', 'Jornada', { placeholder: 'Ej: completa, parcial' })}
              {renderField('tareas', 'Tareas / Puesto', { placeholder: 'Ej: administrativa' })}
              {renderField('antiguedad', 'Antigüedad', { placeholder: 'Ej: 2 años' })}
              {renderField('salario', 'Salario', { placeholder: 'Ej: 1.500 euros' })}
              {renderField('convenio', 'Convenio colectivo', { placeholder: 'Ej: Convenio de Oficinas y Despachos' })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-text-primary">Conciliación Previa (opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('fechaPapeleta', 'Fecha papeleta de conciliación', { placeholder: 'Ej: 15/01/2024' })}
              {renderField('fechaConciliacion', 'Fecha del acto de conciliación', { placeholder: 'Ej: 30/01/2024' })}
              {renderField('resultadoConciliacion', 'Resultado', { placeholder: 'Ej: SIN ACUERDO' })}
              {renderField('localidad', 'Localidad', { placeholder: 'Ej: Madrid' })}
            </div>
          </div>

          <button
            onClick={() => {
              if (missingFormFields.length > 0) {
                alert('Por favor completa todos los campos obligatorios marcados con *.');
                return;
              }
              setCurrentStep(3);
            }}
            className="btn-primary w-full"
          >
            Continuar al Pago
          </button>
        </div>
      )}

      {/* Step 3: Payment */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 3: Procesar Pago</h3>
            <button
              onClick={() => setCurrentStep(2)}
              className="text-sm text-text-primary hover:text-text-secondary"
            >
              ← Volver a Tus Datos
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

      {/* Step 4: Confirmación */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Paso 4: Confirmación</h3>
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
              <h4 className="font-semibold text-text-primary">¡Pago completado!</h4>
            </div>
            <p className="text-text-secondary mb-4">
              Estamos generando tu reclamación de cantidades con inteligencia artificial. En unos
              momentos el documento (Word y PDF) estará disponible en tu repositorio de documentos
              y en tu historial de compras.
            </p>
            <a href="/documents" className="btn-primary inline-block">
              Ir a Mis Documentos
            </a>
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
                Procesando Pago
              </h3>
              <p className="text-text-secondary">
                Estamos guardando tus datos y creando la sesión de pago seguro...
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
