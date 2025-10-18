'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
              <span className="text-xl font-bold text-gray-900">Avocat</span>
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
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-blue-800">
                {t('dashboard.createCase.title')}
              </h1>
              <p className="text-sm text-blue-700">
                {t('dashboard.createCase.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← {t('dashboard.backToDashboard')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Case Information */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.createCase.caseInfo')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Caso *
                  </label>
                  <input
                    type="text"
                    name="caseTitle"
                    value={formData.caseTitle}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Contrato de Arrendamiento Comercial"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Caso *
                  </label>
                  <select
                    name="caseType"
                    value={formData.caseType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar tipo</option>
                    {caseTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Caso *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describa los detalles del caso, situación legal, objetivos, etc."
                />
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Información del Cliente</h2>
              
              {/* Client Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <span className="text-sm text-gray-700">Cliente Existente</span>
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
                    <span className="text-sm text-gray-700">Nuevo Cliente</span>
                  </label>
                </div>
              </div>

              {formData.clientSelection === 'existing' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Cliente Existente *
                  </label>
                  <select
                    name="selectedClientId"
                    value={formData.selectedClientId}
                    onChange={handleExistingClientChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Nombre completo del cliente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Cliente *
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    required
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono del Cliente
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    disabled={formData.clientSelection === 'existing'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="+34 600 123 456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Abogado Asignado *
                  </label>
                  <select
                    name="assignedLawyer"
                    value={formData.assignedLawyer}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Documentos</h2>
              
              <div className="space-y-6">
                {/* File Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
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
                    <h4 className="font-medium text-gray-900">Documentos subidos ({formData.documents.length})</h4>
                    
                    <div className="space-y-3">
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                              <span className="text-xs text-gray-500 ml-2">
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

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creando Caso...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>Crear Caso</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
