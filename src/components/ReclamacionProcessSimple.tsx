'use client';

import { useState, useEffect } from 'react';
import { UploadedDocument, DocumentCategory, DocumentSummary } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { saveUploadedFile } from '@/lib/storage';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { Button } from '@/components/ui/Button';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import { Alert } from '@/components/ui/Alert';
import { FileText } from 'lucide-react';
import DocumentWizard, { type WizardStep } from '@/components/wizard/DocumentWizard';
import FileDropzone from '@/components/wizard/FileDropzone';
import DocumentPreview, { Mark } from '@/components/wizard/DocumentPreview';
import AIJobProgress from '@/components/wizard/AIJobProgress';
import { PLANS, formatEuro } from '@/lib/plans';

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

const DRAFT_KEY = 'avocat:reclamacion-cantidades:form';
const STEP = { datos: 1, documentos: 2, revision: 3, pago: 4, descarga: 5 } as const;

function savedLabel(savedAt: number | null, now: number): string | null {
  if (!savedAt) return null;
  const min = Math.floor((now - savedAt) / 60_000);
  return min < 1 ? 'Guardado ahora' : `Guardado hace ${min} min`;
}

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
    color: 'bg-surface-muted/30 text-text'
  },
  {
    id: 'invoice',
    name: 'Factura',
    description: 'Facturas pendientes de pago',
    required: true,
    color: 'bg-surface-muted/30 text-text'
  },
  {
    id: 'correspondence',
    name: 'Correspondencia',
    description: 'Emails, cartas, comunicaciones',
    required: false,
    color: 'bg-surface-muted/20 text-text-muted'
  },
  {
    id: 'evidence',
    name: 'Pruebas',
    description: 'Documentos que prueban la deuda',
    required: true,
    color: 'bg-surface-muted/30 text-text'
  },
  {
    id: 'identity',
    name: 'Identificación',
    description: 'DNI, NIE o documentos de identidad',
    required: true,
    color: 'bg-surface-muted/30 text-text'
  },
  {
    id: 'other',
    name: 'Otros',
    description: 'Otros documentos relevantes',
    required: false,
    color: 'bg-surface-muted/30 text-text'
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
  // v4 wizard UI state
  const [confirmData, setConfirmData] = useState(false);
  const [confirmSelf, setConfirmSelf] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Autosave the form (this browser only; files are not kept). Restored on the next visit.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setReclamacionFormData(prev => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  useEffect(() => {
    if (reclamacionFormData === EMPTY_FORM_DATA) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(reclamacionFormData)); setSavedAt(Date.now()); } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [reclamacionFormData]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

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
          // Charged amount unchanged (cents). TODO(ds-v4): derive from PLANS.particulares.price once Stripe uses a price id.
          items: [{ name: 'Reclamación de Cantidades', price: 1000, quantity: 1 }],
          documentType: 'reclamacion_cantidades',
          caseId: reclId,
          uid: userId,
          userId,
          customerEmail: userEmail || 'user@example.com',
          successUrl: `${window.location.origin}/escritos/reclamacion-cantidad?payment=success&caseId=${reclId}`,
          cancelUrl: `${window.location.origin}/escritos/reclamacion-cantidad?payment=cancelled&caseId=${reclId}`
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
      setPaymentError(error instanceof Error ? error.message : 'Error al procesar el pago. Inténtalo de nuevo.');
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
      setCurrentStep(STEP.descarga);

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
      setPaymentCancelled(true);
      setCurrentStep(STEP.pago);
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
    setConfirmData(false);
    setConfirmSelf(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const renderField = (
    field: keyof ReclamacionFormData,
    label: string,
    options?: { required?: boolean; placeholder?: string; autoComplete?: string; inputMode?: 'text' | 'tel' | 'numeric' }
  ) => {
    const invalid = !!options?.required && showMissing && !reclamacionFormData[field].trim();
    return (
      <div>
        <label htmlFor={field} className="block text-small font-medium text-text mb-1">
          {label}
          {options?.required ? <span className="text-danger-text" aria-hidden> *</span> : <span className="text-text-muted font-normal"> (opcional)</span>}
        </label>
        <input
          id={field}
          type="text"
          value={reclamacionFormData[field]}
          onChange={(e) => updateFormField(field, e.target.value)}
          placeholder={options?.placeholder}
          autoComplete={options?.autoComplete}
          inputMode={options?.inputMode}
          required={options?.required}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${field}-err` : undefined}
          className={`w-full h-control-md px-3 rounded-md border bg-surface text-text ${invalid ? 'border-danger' : 'border-border-strong'}`}
        />
        {invalid && <p id={`${field}-err`} className="mt-1 text-caption text-danger-text">Este campo es obligatorio.</p>}
      </div>
    );
  };

  const requiredCount = DOCUMENT_CATEGORIES.filter(cat => cat.required).length;
  const price = formatEuro(PLANS.particulares.price);
  const f = reclamacionFormData;

  const datosStep: WizardStep = {
    id: 'datos',
    label: 'Datos',
    title: 'Tus datos',
    description: 'Estos datos se usarán para redactar tu reclamación de cantidades. Los campos con * son obligatorios.',
    content: (
      <div className="space-y-6">
        {showMissing && missingFormFields.length > 0 && (
          <Alert tone="danger" title={`Faltan ${missingFormFields.length} campos obligatorios`}>
            Revisa los campos marcados en rojo.
          </Alert>
        )}
        <fieldset className="space-y-3">
          <legend className="text-h4 mb-1">Datos del trabajador</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('nombreTrabajador', 'Nombre completo', { required: true, placeholder: 'Ej.: Juan Pérez García', autoComplete: 'name' })}
            {renderField('dniTrabajador', 'DNI / NIE', { required: true, placeholder: 'Ej.: 12345678A' })}
            {renderField('domicilioTrabajador', 'Domicilio', { required: true, placeholder: 'Ej.: Calle Mayor 1, Madrid', autoComplete: 'street-address' })}
            {renderField('telefonoTrabajador', 'Teléfono', { required: true, placeholder: 'Ej.: 600123456', autoComplete: 'tel', inputMode: 'tel' })}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-h4 mb-1">Datos de la empresa</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('nombreEmpresa', 'Nombre o razón social', { required: true, placeholder: 'Ej.: Empresa S. L.', autoComplete: 'organization' })}
            {renderField('cifEmpresa', 'CIF', { required: true, placeholder: 'Ej.: B12345678' })}
            <div className="md:col-span-2">
              {renderField('domicilioEmpresa', 'Domicilio', { required: true, placeholder: 'Ej.: Avenida de la Paz 1, Madrid' })}
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-h4 mb-1">Relación laboral</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('tipoContrato', 'Tipo de contrato', { placeholder: 'Ej.: indefinido, temporal' })}
            {renderField('jornada', 'Jornada', { placeholder: 'Ej.: completa, parcial' })}
            {renderField('tareas', 'Tareas o puesto', { placeholder: 'Ej.: administrativa' })}
            {renderField('antiguedad', 'Antigüedad', { placeholder: 'Ej.: 2 años' })}
            {renderField('salario', 'Salario', { placeholder: 'Ej.: 1.500 €' })}
            {renderField('convenio', 'Convenio colectivo', { placeholder: 'Ej.: Convenio de Oficinas y Despachos' })}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-h4 mb-1">Conciliación previa</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('fechaPapeleta', 'Fecha de la papeleta de conciliación', { placeholder: 'Ej.: 15/01/2026' })}
            {renderField('fechaConciliacion', 'Fecha del acto de conciliación', { placeholder: 'Ej.: 30/01/2026' })}
            {renderField('resultadoConciliacion', 'Resultado', { placeholder: 'Ej.: sin acuerdo' })}
            {renderField('localidad', 'Localidad', { placeholder: 'Ej.: Madrid' })}
          </div>
        </fieldset>
      </div>
    ),
    cta: {
      label: 'Continuar',
      onClick: () => {
        if (missingFormFields.length > 0) { setShowMissing(true); return; }
        setShowMissing(false);
        setCurrentStep(STEP.documentos);
      },
    },
  };

  const documentosStep: WizardStep = {
    id: 'documentos',
    label: 'Documentos',
    title: 'Sube tus documentos',
    description: 'Contrato, nóminas, facturas, pruebas de la deuda e identificación. Solo PDF.',
    content: (
      <div className="space-y-4">
        <FileDropzone
          onFiles={handleFileUpload}
          accept=".pdf"
          acceptLabel="Solo PDF · varios archivos a la vez"
          busy={isUploading}
          busyLabel="Subiendo tus archivos…"
        />
        {uploadedDocuments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-h4">Documentos subidos ({uploadedDocuments.length})</h4>
            <ul className="divide-y divide-border rounded-md border border-border">
              {uploadedDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="shrink-0 text-accent-text" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-text truncate">{doc.name}</p>
                      <p className="text-caption text-text-muted">
                        {(doc.size / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 2 })} MB
                        {doc.category && <> · {doc.category.name}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => window.open(doc.previewUrl, '_blank')}>Ver</Button>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)} aria-label={`Quitar ${doc.name}`}>Quitar</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
    cta: {
      label: 'Revisar',
      disabled: uploadedDocuments.length === 0 || isUploading,
      hint: uploadedDocuments.length === 0 ? 'Sube al menos un documento para continuar.' : undefined,
      onClick: () => { generateSummary(); setCurrentStep(STEP.revision); },
    },
  };

  const revisionStep: WizardStep = {
    id: 'revision',
    label: 'Revisión',
    title: 'Revisa antes de pagar',
    description: 'Así usaremos tus datos en el escrito. Compruébalos: lo que está resaltado lo has escrito tú o sale de tus documentos.',
    content: (
      <div className="space-y-5">
        <DocumentPreview
          title="Reclamación de cantidades — borrador"
          note="Vista previa de los datos. El escrito completo se redacta tras el pago y lo revisarás antes de presentarlo."
        >
          <h1>Al Juzgado de lo Social{f.localidad ? <> de <Mark>{f.localidad}</Mark></> : null}</h1>
          <p>
            Don/Doña <Mark>{f.nombreTrabajador || '—'}</Mark>, con DNI/NIE <Mark>{f.dniTrabajador || '—'}</Mark> y domicilio en{' '}
            <Mark>{f.domicilioTrabajador || '—'}</Mark>, ante el Juzgado comparece y, como mejor proceda en Derecho, DICE:
          </p>
          <p>
            Que formula demanda en reclamación de cantidad contra <Mark>{f.nombreEmpresa || '—'}</Mark>, con CIF{' '}
            <Mark>{f.cifEmpresa || '—'}</Mark> y domicilio en <Mark>{f.domicilioEmpresa || '—'}</Mark>, con base en los siguientes
          </p>
          <h2>Hechos</h2>
          <p>
            Primero. — Relación laboral{f.tipoContrato ? <> mediante contrato <Mark>{f.tipoContrato}</Mark></> : null}
            {f.jornada ? <>, jornada <Mark>{f.jornada}</Mark></> : null}
            {f.tareas ? <>, desempeñando tareas de <Mark>{f.tareas}</Mark></> : null}
            {f.antiguedad ? <>, con antigüedad de <Mark>{f.antiguedad}</Mark></> : null}
            {f.salario ? <> y salario de <Mark>{f.salario}</Mark></> : null}.
          </p>
          {(f.fechaPapeleta || f.fechaConciliacion) && (
            <p>
              Segundo. — Se presentó papeleta de conciliación{f.fechaPapeleta ? <> el <Mark>{f.fechaPapeleta}</Mark></> : null}
              {f.fechaConciliacion ? <>; el acto se celebró el <Mark>{f.fechaConciliacion}</Mark></> : null}
              {f.resultadoConciliacion ? <> con resultado <Mark>{f.resultadoConciliacion}</Mark></> : null}.
            </p>
          )}
        </DocumentPreview>

        {documentSummary && (
          <section className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="text-h4">Documentos aportados</h4>
            <p className="text-body-sm text-text">
              {documentSummary.totalDocuments} {documentSummary.totalDocuments === 1 ? 'documento' : 'documentos'} ·{' '}
              {requiredCount - documentSummary.missingRequired.length} de {requiredCount} tipos recomendados
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {Object.entries(documentSummary.categorizedDocuments).filter(([, docs]) => docs.length > 0).map(([categoryId, docs]) => (
                <li key={categoryId} className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-caption text-text">
                  {DOCUMENT_CATEGORIES.find(c => c.id === categoryId)?.name} · {docs.length}
                </li>
              ))}
            </ul>
            {documentSummary.missingRequired.length > 0 && (
              <Alert tone="warning" title="Faltan documentos recomendados">
                {documentSummary.missingRequired.join(', ')}. Puedes continuar: el escrito se redactará con la información disponible y tendrás que completarlo.
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

  const pagoStep: WizardStep = {
    id: 'pago',
    label: 'Pago',
    title: 'Pago',
    description: 'Pago único por escrito. Te llevaremos a la pasarela segura de Stripe.',
    content: (
      <div className="space-y-4">
        {paymentCancelled && (
          <Alert tone="info" title="Pago cancelado" onDismiss={() => setPaymentCancelled(false)}>
            No se ha cobrado nada. Puedes intentarlo de nuevo cuando quieras.
          </Alert>
        )}
        {paymentError && (
          <Alert tone="danger" title="No se pudo iniciar el pago" onDismiss={() => setPaymentError(null)}>
            {paymentError} No se ha cobrado nada.
          </Alert>
        )}
        <div className="rounded-lg border border-border p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-text-heading">Reclamación de cantidades</p>
            <p className="text-caption text-text-muted">Escrito en Word y PDF · IVA incluido</p>
          </div>
          <p className="font-display text-h2 text-text-heading">{price}</p>
        </div>
      </div>
    ),
    cta: {
      label: `Pagar ${price}`,
      onClick: () => { setPaymentError(null); setPaymentCancelled(false); handlePayment(); },
      loading: isProcessing,
      loadingText: 'Preparando el pago…',
    },
  };

  const descargaStep: WizardStep = {
    id: 'descarga',
    label: 'Descarga',
    title: 'Pago completado',
    content: (
      <div className="space-y-4">
        {/* TODO(ds-v4): drive the steps from the generation status (webhook → purchases doc) instead of a fixed position. */}
        <AIJobProgress
          title="Generando tu reclamación"
          steps={['Pago confirmado', 'Leyendo tus documentos', 'Redactando hechos y fundamentos', 'Guardando Word y PDF en Mis documentos']}
          current={1}
          typicalSeconds={90}
        />
        <AIDisclaimer />
        <div className="flex flex-wrap gap-2">
          <Button href="/documents" variant="primary">Ir a Mis documentos</Button>
          <Button variant="ghost" onClick={resetProcess}>Crear otra reclamación</Button>
        </div>
      </div>
    ),
    back: false,
  };

  return (
    <DocumentWizard
      title="Reclamación de cantidades"
      subtitle="Sigue estos pasos para preparar tu escrito."
      steps={[datosStep, documentosStep, revisionStep, pagoStep, descargaStep]}
      current={currentStep}
      onStepChange={setCurrentStep}
      locked={isPaymentComplete}
      savedLabel={currentStep < STEP.descarga ? savedLabel(savedAt, now) : null}
    />
  );
}
