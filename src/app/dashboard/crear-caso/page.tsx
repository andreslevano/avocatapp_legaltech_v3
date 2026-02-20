'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

interface CaseFormData {
  caseTitle: string;
  caseType: string;
  clientSelection: 'existing' | 'new';
  selectedClientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  priority: string;
  description: string;
  estimatedDuration: string;
  assignedLawyer: string;
  deadline: string;
  documents: File[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function CreateCasePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();
  const [formData, setFormData] = useState<CaseFormData>({
    caseTitle: '',
    caseType: '',
    clientSelection: 'new',
    selectedClientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    priority: 'medium',
    description: '',
    estimatedDuration: '',
    assignedLawyer: '',
    deadline: '',
    documents: []
  });

  // Mock customer data - in a real app, this would come from an API
  const [customers] = useState<Customer[]>([
    { id: '1', name: 'Juan Pérez García', email: 'juan.perez@email.com', phone: '+34 600 123 456' },
    { id: '2', name: 'María López Rodríguez', email: 'maria.lopez@email.com', phone: '+34 600 234 567' },
    { id: '3', name: 'Carlos Martínez Silva', email: 'carlos.martinez@email.com', phone: '+34 600 345 678' },
    { id: '4', name: 'Ana García Fernández', email: 'ana.garcia@email.com', phone: '+34 600 456 789' },
    { id: '5', name: 'Luis Rodríguez Torres', email: 'luis.rodriguez@email.com', phone: '+34 600 567 890' }
  ]);
  const router = useRouter();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const pdfFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...pdfFiles]
      }));
    }
  };

  const handleClientSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'existing' | 'new';
    setFormData(prev => ({
      ...prev,
      clientSelection: value,
      selectedClientId: value === 'existing' ? prev.selectedClientId : '',
      clientName: value === 'existing' ? '' : prev.clientName,
      clientEmail: value === 'existing' ? '' : prev.clientEmail,
      clientPhone: value === 'existing' ? '' : prev.clientPhone
    }));
  };

  const handleExistingClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    const selectedClient = customers.find(c => c.id === clientId);
    
    setFormData(prev => ({
      ...prev,
      selectedClientId: clientId,
      clientName: selectedClient?.name || '',
      clientEmail: selectedClient?.email || '',
      clientPhone: selectedClient?.phone || ''
    }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...pdfFiles]
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically send the data to your backend
      console.log('Case created:', formData);
      
      // Redirect to case analysis page
      router.push('/dashboard/analisis-caso');
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const caseTypes = [
    'Derecho Civil',
    'Derecho Mercantil',
    'Derecho Laboral',
    'Derecho Penal',
    'Derecho de Familia',
    'Derecho Administrativo',
    'Derecho Fiscal',
    'Derecho Inmobiliario'
  ];

  const priorities = [
    { value: 'low', label: 'Baja', color: 'text-green-600' },
    { value: 'medium', label: 'Media', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' }
  ];

  const lawyers = [
    'Dr. Carlos Mendoza',
    'Dra. Ana Rodríguez',
    'Dr. Luis Martínez',
    'Dra. Carmen Silva',
    'Dr. Miguel Torres',
    'Dra. Patricia López',
    'Dr. Fernando Castro',
    'Dr. Alejandro Ramírez'
  ];

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
          type="submit"
          form="create-case-form"
          disabled={submitting}
          className="group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Crear Caso"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-text-on-dark border-t-transparent" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
          <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Crear Caso
          </span>
        </button>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-h1 text-text-primary mb-2">{t('dashboard.createCase.title')}</h1>
          <p className="text-body text-text-secondary mb-6">{t('dashboard.createCase.subtitle')}</p>
          <form id="create-case-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Case Information */}
            <div className="bg-card shadow-sm rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-6">{t('dashboard.createCase.caseInfo')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Título del Caso *
                  </label>
                  <input
                    type="text"
                    name="caseTitle"
                    value={formData.caseTitle}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    placeholder="Ej: Contrato de Arrendamiento Comercial"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Tipo de Caso *
                  </label>
                  <select
                    name="caseType"
                    value={formData.caseType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  >
                    <option value="">Seleccionar tipo</option>
                    {caseTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Prioridad *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Descripción del Caso *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  placeholder="Describa los detalles del caso, situación legal, objetivos, etc."
                />
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-card shadow-sm rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-6">Información del Cliente</h2>
              
              {/* Client Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Seleccionar Cliente *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientSelection"
                      value="existing"
                      checked={formData.clientSelection === 'existing'}
                      onChange={(e) => handleClientSelectionChange(e as any)}
                      className="mr-2"
                    />
                    <span className="text-sm text-text-secondary">Cliente Existente</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientSelection"
                      value="new"
                      checked={formData.clientSelection === 'new'}
                      onChange={(e) => handleClientSelectionChange(e as any)}
                      className="mr-2"
                    />
                    <span className="text-sm text-text-secondary">Nuevo Cliente</span>
                  </label>
                </div>
              </div>

              {formData.clientSelection === 'existing' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Seleccionar Cliente Existente *
                  </label>
                  <select
                    name="selectedClientId"
                    value={formData.selectedClientId}
                    onChange={handleExistingClientChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar disabled:bg-surface-muted/30 disabled:cursor-not-allowed"
                    placeholder="Nombre completo del cliente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Email del Cliente *
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    required
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar disabled:bg-surface-muted/30 disabled:cursor-not-allowed"
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Teléfono del Cliente
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar disabled:bg-surface-muted/30 disabled:cursor-not-allowed"
                    placeholder="+34 600 123 456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Abogado Asignado *
                  </label>
                  <select
                    name="assignedLawyer"
                    value={formData.assignedLawyer}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  >
                    <option value="">Seleccionar abogado</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer} value={lawyer}>{lawyer}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-card shadow-sm rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-6">Documentos</h2>
              
              <div className="space-y-6">
                {/* File Upload Area */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-text-secondary">
                    Arrastra archivos PDF aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Solo se permiten archivos PDF
                  </p>
                </div>

                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />

                {/* Uploaded Documents List */}
                {formData.documents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-text-primary">Documentos subidos ({formData.documents.length})</h4>
                    
                    <div className="space-y-3">
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-app rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="text-sm font-medium text-text-primary">{doc.name}</span>
                              <span className="text-xs text-text-secondary ml-2">
                                ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeDocument(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
