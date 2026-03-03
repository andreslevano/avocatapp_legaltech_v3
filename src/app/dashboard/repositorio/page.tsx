'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, Auth } from 'firebase/auth';
import Link from 'next/link';

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
      loadVersionHistory(file.id);
    }
  };

  const handleBackClick = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const loadVersionHistory = (fileId: string) => {
    setShowVersionHistory(false);
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
  };

  const getFileIcon = (type: string) => {
    const iconClass = 'w-5 h-5 text-text-secondary';
    switch (type) {
      case 'folder':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'docx':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'txt':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'image':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-surface-muted/40 text-text-primary border border-border';
      case 'archived': return 'bg-surface-muted/30 text-text-primary border border-border';
      case 'draft': return 'bg-surface-muted/30 text-text-secondary border border-border';
      default: return 'bg-surface-muted/30 text-text-primary border border-border';
    }
  };

  const filteredFiles = getCurrentDirectory().filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

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

  const fabClass = 'group relative w-12 h-12 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-colors';
  const fabLabelClass = 'absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-sidebar text-text-on-dark text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none';

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      {/* Floating Action Buttons - top right, circular like analisis-caso */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-2">
        <Link href="/dashboard/analisis-caso" className={fabClass} title="Volver al Análisis">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className={fabLabelClass}>Volver al Análisis</span>
        </Link>
        <button type="button" className={fabClass} title="Subir Nuevo Archivo">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className={fabLabelClass}>Subir Archivo</span>
        </button>
        <button type="button" className={fabClass} title="Crear Nueva Carpeta">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className={fabLabelClass}>Crear Carpeta</span>
        </button>
        <button type="button" className={fabClass} title="Sincronizar Repositorio">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className={fabLabelClass}>Sincronizar</span>
        </button>
        {selectedFile && selectedFile.type !== 'folder' && (
          <>
            <button type="button" className={fabClass} title="Descargar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className={fabLabelClass}>Descargar</span>
            </button>
            <button type="button" className={fabClass} title="Editar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className={fabLabelClass}>Editar</span>
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-h1 text-text-primary mb-2">Repositorio de Documentos del Caso</h1>
            <p className="text-body text-text-secondary">
              Gestiona y controla versiones de todos los documentos del caso
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - File Explorer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Toolbar */}
              <div className="bg-card shadow-sm rounded-lg border border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  {/* Breadcrumb */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBackClick}
                      disabled={currentPath.length <= 1}
                      className="p-2 rounded-full text-text-secondary hover:bg-surface-muted/30 hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center space-x-1 text-sm text-text-secondary">
                      {currentPath.map((segment, index) => (
                        <div key={index} className="flex items-center">
                          {index > 0 && <span className="mx-1">/</span>}
                          <span className={index === currentPath.length - 1 ? 'font-medium text-text-primary' : ''}>
                            {segment}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View Controls */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-surface-muted/30 text-text-primary' : 'text-text-secondary hover:bg-surface-muted/20 hover:text-text-primary'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-surface-muted/30 text-text-primary' : 'text-text-secondary hover:bg-surface-muted/20 hover:text-text-primary'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
                      placeholder="Buscar archivos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="folder">Carpetas</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word</option>
                    <option value="txt">Texto</option>
                    <option value="image">Imágenes</option>
                  </select>
                </div>
              </div>

              {/* File List */}
              <div className="bg-card shadow-sm rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {currentPath[currentPath.length - 1]} ({filteredFiles.length} elementos)
                  </h2>
                </div>
                
                <div className="divide-y divide-border">
                  {filteredFiles.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-text-secondary">No se encontraron archivos</p>
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        className="p-4 hover:bg-app cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-text-primary truncate">
                                {file.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                                {file.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-text-secondary">
                              <span>v{file.version}</span>
                              <span>{file.size}</span>
                              <span>{file.lastModified.toLocaleDateString()}</span>
                              <span>{file.author}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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
              {!selectedFile && (
                <div className="bg-card shadow-sm rounded-lg border border-border p-8 text-center">
                  <svg className="mx-auto h-10 w-10 text-text-secondary mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-text-secondary">Selecciona un archivo para ver detalles</p>
                </div>
              )}
              {/* File Details */}
              {selectedFile && (
                <div className="bg-card shadow-sm rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Detalles del Archivo</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(selectedFile.type)}
                      <div>
                        <h4 className="text-sm font-medium text-text-primary">{selectedFile.name}</h4>
                        <p className="text-xs text-text-secondary">{selectedFile.type.toUpperCase()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Tamaño:</span>
                        <span className="text-text-primary">{selectedFile.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Versión:</span>
                        <span className="text-text-primary">v{selectedFile.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Autor:</span>
                        <span className="text-text-primary">{selectedFile.author}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Modificado:</span>
                        <span className="text-text-primary">{selectedFile.lastModified.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFile.status)}`}>
                          {selectedFile.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Version History - collapsible, hidden by default */}
              {selectedFile && selectedFile.type !== 'folder' && (
                <div className="bg-card shadow-sm rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-muted/20 transition-colors"
                  >
                    <span className="text-sm font-medium text-text-primary">Historial de versiones</span>
                    <span className="text-xs text-text-secondary">
                      {versionHistory.length} versiones
                    </span>
                    <svg
                      className={`w-5 h-5 text-text-secondary transition-transform ${showVersionHistory ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showVersionHistory && (
                    <div className="border-t border-border p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {versionHistory.map((version) => (
                          <div key={version.id} className="border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-text-primary">v{version.version}</span>
                              <span className="text-xs text-text-secondary">{version.size}</span>
                            </div>
                            <p className="text-xs text-text-secondary mb-2">{version.changes}</p>
                            <div className="flex items-center justify-between text-xs text-text-secondary">
                              <span>{version.author}</span>
                              <span>{version.date.toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
