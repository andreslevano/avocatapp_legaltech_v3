'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';
import DashboardNavigation from '@/components/DashboardNavigation';
import UserMenu from '@/components/UserMenu';
import { useI18n } from '@/hooks/useI18n';

interface DocumentFile {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'docx' | 'txt' | 'image';
  size: string;
  lastModified: Date;
  version: string;
  author: string;
  status: 'current' | 'archived' | 'draft';
  path: string;
  children?: DocumentFile[];
}

interface VersionHistory {
  id: string;
  version: string;
  author: string;
  date: Date;
  changes: string;
  size: string;
}

export default function RepositorioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>(['Caso-001']);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const router = useRouter();
  const { t } = useI18n();

  // Mock document structure
  const documentStructure: DocumentFile[] = [
    {
      id: '1',
      name: 'Caso-001',
      type: 'folder',
      size: '-',
      lastModified: new Date('2024-01-15'),
      version: '1.0',
      author: 'Dr. Carlos Mendoza',
      status: 'current',
      path: 'Caso-001',
      children: [
        {
          id: '2',
          name: 'Documentos Iniciales',
          type: 'folder',
          size: '-',
          lastModified: new Date('2024-01-15'),
          version: '1.0',
          author: 'Dr. Carlos Mendoza',
          status: 'current',
          path: 'Caso-001/Documentos Iniciales',
          children: [
            {
              id: '3',
              name: 'Contrato_Arrendamiento_2023.pdf',
              type: 'pdf',
              size: '2.4 MB',
              lastModified: new Date('2024-01-10'),
              version: '1.2',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Documentos Iniciales/Contrato_Arrendamiento_2023.pdf'
            },
            {
              id: '4',
              name: 'Comunicacion_Incumplimiento.pdf',
              type: 'pdf',
              size: '1.8 MB',
              lastModified: new Date('2024-01-12'),
              version: '1.1',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Documentos Iniciales/Comunicacion_Incumplimiento.pdf'
            }
          ]
        },
        {
          id: '5',
          name: 'Escritos Generados',
          type: 'folder',
          size: '-',
          lastModified: new Date('2024-01-20'),
          version: '1.0',
          author: 'Dr. Carlos Mendoza',
          status: 'current',
          path: 'Caso-001/Escritos Generados',
          children: [
            {
              id: '6',
              name: 'Demanda_Civil_v1.docx',
              type: 'docx',
              size: '45 KB',
              lastModified: new Date('2024-01-18'),
              version: '1.3',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Escritos Generados/Demanda_Civil_v1.docx'
            },
            {
              id: '7',
              name: 'Demanda_Civil_v2.docx',
              type: 'docx',
              size: '47 KB',
              lastModified: new Date('2024-01-19'),
              version: '2.0',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Escritos Generados/Demanda_Civil_v2.docx'
            },
            {
              id: '8',
              name: 'Demanda_Civil_v1_archived.docx',
              type: 'docx',
              size: '45 KB',
              lastModified: new Date('2024-01-18'),
              version: '1.0',
              author: 'Dr. Carlos Mendoza',
              status: 'archived',
              path: 'Caso-001/Escritos Generados/Demanda_Civil_v1_archived.docx'
            }
          ]
        },
        {
          id: '9',
          name: 'Evidencias',
          type: 'folder',
          size: '-',
          lastModified: new Date('2024-01-16'),
          version: '1.0',
          author: 'Dr. Carlos Mendoza',
          status: 'current',
          path: 'Caso-001/Evidencias',
          children: [
            {
              id: '10',
              name: 'Fotos_Instalaciones.jpg',
              type: 'image',
              size: '3.2 MB',
              lastModified: new Date('2024-01-14'),
              version: '1.0',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Evidencias/Fotos_Instalaciones.jpg'
            },
            {
              id: '11',
              name: 'Testimonio_Cliente.txt',
              type: 'txt',
              size: '12 KB',
              lastModified: new Date('2024-01-15'),
              version: '1.1',
              author: 'Dr. Carlos Mendoza',
              status: 'current',
              path: 'Caso-001/Evidencias/Testimonio_Cliente.txt'
            }
          ]
        },
        {
          id: '12',
          name: 'Analisis_Caso_Completo.pdf',
          type: 'pdf',
          size: '5.8 MB',
          lastModified: new Date('2024-01-20'),
          version: '1.0',
          author: 'Dr. Carlos Mendoza',
          status: 'current',
          path: 'Caso-001/Analisis_Caso_Completo.pdf'
        }
      ]
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

  const getCurrentDirectory = (): DocumentFile[] => {
    let current = documentStructure;
    for (const pathSegment of currentPath.slice(1)) {
      const found = current.find(item => item.name === pathSegment);
      if (found && found.children) {
        current = found.children;
      } else {
        return [];
      }
    }
    return current;
  };

  const handleFileClick = (file: DocumentFile) => {
    if (file.type === 'folder') {
      setCurrentPath([...currentPath, file.name]);
    } else {
      setSelectedFile(file);
      if (file.type !== 'folder') {
        loadVersionHistory(file.id);
      }
    }
  };

  const handleBackClick = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const loadVersionHistory = (fileId: string) => {
    // Mock version history
    const mockHistory: VersionHistory[] = [
      {
        id: '1',
        version: '2.0',
        author: 'Dr. Carlos Mendoza',
        date: new Date('2024-01-19'),
        changes: 'Agregadas nuevas cláusulas contractuales y referencias legales',
        size: '47 KB'
      },
      {
        id: '2',
        version: '1.3',
        author: 'Dr. Carlos Mendoza',
        date: new Date('2024-01-18'),
        changes: 'Corrección de errores tipográficos y formato',
        size: '45 KB'
      },
      {
        id: '3',
        version: '1.2',
        author: 'Dr. Carlos Mendoza',
        date: new Date('2024-01-17'),
        changes: 'Primera versión completa del documento',
        size: '45 KB'
      },
      {
        id: '4',
        version: '1.1',
        author: 'Dr. Carlos Mendoza',
        date: new Date('2024-01-16'),
        changes: 'Versión inicial con estructura básica',
        size: '42 KB'
      },
      {
        id: '5',
        version: '1.0',
        author: 'Dr. Carlos Mendoza',
        date: new Date('2024-01-15'),
        changes: 'Creación inicial del documento',
        size: '40 KB'
      }
    ];
    setVersionHistory(mockHistory);
    setShowVersionHistory(true);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'docx':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'txt':
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFiles = getCurrentDirectory().filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

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
              <span className="text-xl font-bold text-gray-900">Avocat - Repositorio de Documentos</span>
            </div>
            
            <UserMenu user={user} currentPlan="Abogados" />
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <DashboardNavigation currentPlan="Abogados" />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-purple-800">
                {t('dashboard.repository.title')}
              </h1>
              <p className="text-sm text-purple-700">
                {t('dashboard.repository.subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/analisis-caso"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            ← {t('dashboard.repository.backToAnalysis')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - File Explorer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Toolbar */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  {/* Breadcrumb */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBackClick}
                      disabled={currentPath.length <= 1}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      {currentPath.map((segment, index) => (
                        <div key={index} className="flex items-center">
                          {index > 0 && <span className="mx-1">/</span>}
                          <span className={index === currentPath.length - 1 ? 'font-medium text-gray-900' : ''}>
                            {segment}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View Controls */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={t('dashboard.repository.searchFiles')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">{t('dashboard.repository.allTypes')}</option>
                    <option value="folder">{t('dashboard.repository.folders')}</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word</option>
                    <option value="txt">{t('dashboard.repository.text')}</option>
                    <option value="image">{t('dashboard.repository.images')}</option>
                  </select>
                </div>
              </div>

              {/* File List */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentPath[currentPath.length - 1]} ({filteredFiles.length} elementos)
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {filteredFiles.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-gray-600">No se encontraron archivos</p>
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                                {file.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span>v{file.version}</span>
                              <span>{file.size}</span>
                              <span>{file.lastModified.toLocaleDateString()}</span>
                              <span>{file.author}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - File Details and Version History */}
            <div className="space-y-6">
              {/* File Details */}
              {selectedFile && (
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Archivo</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(selectedFile.type)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{selectedFile.name}</h4>
                        <p className="text-xs text-gray-500">{selectedFile.type.toUpperCase()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tamaño:</span>
                        <span className="text-gray-900">{selectedFile.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Versión:</span>
                        <span className="text-gray-900">v{selectedFile.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Autor:</span>
                        <span className="text-gray-900">{selectedFile.author}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Modificado:</span>
                        <span className="text-gray-900">{selectedFile.lastModified.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFile.status)}`}>
                          {selectedFile.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                          Descargar
                        </button>
                        <button className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Version History */}
              {selectedFile && selectedFile.type !== 'folder' && (
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Historial de Versiones</h3>
                    <button
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {showVersionHistory ? 'Ocultar' : 'Ver todo'}
                    </button>
                  </div>
                  
                  {showVersionHistory ? (
                    <div className="space-y-3">
                      {versionHistory.map((version) => (
                        <div key={version.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">v{version.version}</span>
                            <span className="text-xs text-gray-500">{version.size}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{version.changes}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{version.author}</span>
                            <span>{version.date.toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versionHistory.slice(0, 3).map((version) => (
                        <div key={version.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <span className="text-sm font-medium text-gray-900">v{version.version}</span>
                            <p className="text-xs text-gray-500">{version.changes}</p>
                          </div>
                          <span className="text-xs text-gray-500">{version.date.toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                
                <div className="space-y-3">
                  <button className="w-full flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Subir Nuevo Archivo
                  </button>
                  
                  <button className="w-full flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Crear Nueva Carpeta
                  </button>
                  
                  <button className="w-full flex items-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Sincronizar Repositorio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
