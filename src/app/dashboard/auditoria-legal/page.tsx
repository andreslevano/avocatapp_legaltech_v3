'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import Link from 'next/link';

// Países soportados
const PAISES = [
  { codigo: 'ES', nombre: 'España', moneda: 'EUR' },
  { codigo: 'MX', nombre: 'México', moneda: 'MXN' },
  { codigo: 'AR', nombre: 'Argentina', moneda: 'ARS' },
  { codigo: 'CL', nombre: 'Chile', moneda: 'CLP' },
  { codigo: 'CO', nombre: 'Colombia', moneda: 'COP' },
  { codigo: 'PE', nombre: 'Perú', moneda: 'PEN' }
];

// Áreas legales
const AREAS_LEGALES = [
  { codigo: 'civil', nombre: 'Civil' },
  { codigo: 'mercantil', nombre: 'Mercantil' },
  { codigo: 'laboral', nombre: 'Laboral' },
  { codigo: 'contencioso', nombre: 'Contencioso-Administrativo' },
  { codigo: 'penal', nombre: 'Penal' },
  { codigo: 'familia', nombre: 'Familia' }
];

// Procedimientos
const PROCEDIMIENTOS = {
  civil: ['monitorio', 'verbal', 'ordinario', 'ejecucion'],
  mercantil: ['monitorio', 'verbal', 'ordinario', 'ejecucion'],
  laboral: ['social'],
  contencioso: ['contencioso'],
  penal: ['penal_diligencias', 'penal_juicio_rapido'],
  familia: ['familia']
};

export default function AuditoriaLegal() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  
  // Formulario de auditoría
  const [formData, setFormData] = useState({
    perfilCliente: {
      paisISO: 'ES',
      region: '',
      idioma: 'es-ES',
      moneda: 'EUR',
      rol: 'demandante',
      sector: ''
    },
    contextoProcesal: {
      areaLegal: 'civil',
      procedimiento: 'ordinario',
      cuantia: '',
      documentos: ['']
    },
    textoBase: '',
    normasAdicionales: {
      articulos: [''],
      leyes: [''],
      jurisprudencia: ['']
    }
  });
  
  // Resultado de la auditoría
  const [resultadoAuditoria, setResultadoAuditoria] = useState<any>(null);
  
  const router = useRouter();

  // Verificar autenticación
  useEffect(() => {
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

  // Manejar cambio de país
  const handlePaisChange = (paisISO: string) => {
    const pais = PAISES.find(p => p.codigo === paisISO);
    setFormData(prev => ({
      ...prev,
      perfilCliente: {
        ...prev.perfilCliente,
        paisISO,
        moneda: pais?.moneda || 'EUR'
      }
    }));
  };

  // Manejar cambio de área legal
  const handleAreaLegalChange = (areaLegal: string) => {
    const procedimientosDisponibles = PROCEDIMIENTOS[areaLegal as keyof typeof PROCEDIMIENTOS] || ['ordinario'];
    setFormData(prev => ({
      ...prev,
      contextoProcesal: {
        ...prev.contextoProcesal,
        areaLegal,
        procedimiento: procedimientosDisponibles[0]
      }
    }));
  };

  // Realizar auditoría
  const realizarAuditoria = async () => {
    setIsAuditing(true);
    
    try {
      const response = await fetch('/api/legal-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          perfilCliente: formData.perfilCliente,
          contextoProcesal: formData.contextoProcesal,
          textoBase: formData.textoBase,
          normasAdicionales: formData.normasAdicionales
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResultadoAuditoria(data.data.resultado);
        } else {
          alert(`Error: ${data.error?.message || 'Error desconocido'}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error ${response.status}: ${errorData.error?.message || 'Error en la auditoría'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error realizando la auditoría');
    } finally {
      setIsAuditing(false);
    }
  };

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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <main>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-text-primary mb-8">
            Auditoría Legal de Documentos
          </h1>

          {/* Formulario de Auditoría */}
          <div className="bg-card overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                Configuración de la Auditoría
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Perfil del Cliente */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-text-secondary">Perfil del Cliente</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      País
                    </label>
                    <select
                      value={formData.perfilCliente.paisISO}
                      onChange={(e) => handlePaisChange(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    >
                      {PAISES.map((pais) => (
                        <option key={pais.codigo} value={pais.codigo}>
                          {pais.nombre} ({pais.moneda})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Región/Estado
                    </label>
                    <input
                      type="text"
                      value={formData.perfilCliente.region}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        perfilCliente: { ...prev.perfilCliente, region: e.target.value }
                      }))}
                      placeholder="Madrid, CDMX, Buenos Aires..."
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Rol en el Proceso
                    </label>
                    <select
                      value={formData.perfilCliente.rol}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        perfilCliente: { ...prev.perfilCliente, rol: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    >
                      <option value="demandante">Demandante</option>
                      <option value="demandado">Demandado</option>
                      <option value="querellante">Querellante</option>
                      <option value="denunciado">Denunciado</option>
                      <option value="actor">Actor</option>
                    </select>
                  </div>
                </div>

                {/* Contexto Procesal */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-text-secondary">Contexto Procesal</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Área Legal
                    </label>
                    <select
                      value={formData.contextoProcesal.areaLegal}
                      onChange={(e) => handleAreaLegalChange(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    >
                      {AREAS_LEGALES.map((area) => (
                        <option key={area.codigo} value={area.codigo}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Procedimiento
                    </label>
                    <select
                      value={formData.contextoProcesal.procedimiento}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        contextoProcesal: { ...prev.contextoProcesal, procedimiento: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    >
                      {PROCEDIMIENTOS[formData.contextoProcesal.areaLegal as keyof typeof PROCEDIMIENTOS]?.map((proc) => (
                        <option key={proc} value={proc}>
                          {proc.charAt(0).toUpperCase() + proc.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Cuantía
                    </label>
                    <input
                      type="text"
                      value={formData.contextoProcesal.cuantia}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        contextoProcesal: { ...prev.contextoProcesal, cuantia: e.target.value }
                      }))}
                      placeholder={`Ej: 1.500 ${formData.perfilCliente.moneda}`}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                    />
                  </div>
                </div>
              </div>

              {/* Texto Base */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Texto Base del Documento
                </label>
                <textarea
                  value={formData.textoBase}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    textoBase: e.target.value
                  }))}
                  rows={8}
                  placeholder="Pega aquí el borrador original del documento legal..."
                  className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sidebar focus:border-sidebar"
                />
              </div>

              {/* Botón de Auditoría */}
              <div className="mt-6">
                <button
                  onClick={realizarAuditoria}
                  disabled={isAuditing || !formData.textoBase.trim()}
                  className={`w-full px-4 py-2 rounded-md transition-colors font-medium ${
                    isAuditing || !formData.textoBase.trim()
                      ? 'bg-surface-muted text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isAuditing ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Realizando Auditoría...
                    </>
                  ) : (
                    '🔍 Realizar Auditoría Legal'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resultado de la Auditoría */}
          {resultadoAuditoria && (
            <div className="space-y-6">
              {/* Reporte de Auditoría */}
              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                    📊 Reporte de Auditoría
                  </h3>
                  <ul className="space-y-2">
                    {resultadoAuditoria.reporteAuditoria.map((item: string, index: number) => (
                      <li key={index} className="text-sm text-text-secondary">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Escrito Final */}
              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                    📄 Escrito Final
                  </h3>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-text-secondary bg-app p-4 rounded-md">
                      {resultadoAuditoria.escritoFinal}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Checklist Previa */}
              <div className="bg-card overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                    ✅ Checklist Previa
                  </h3>
                  <ul className="space-y-2">
                    {resultadoAuditoria.checklistPrevia.map((item: string, index: number) => (
                      <li key={index} className="text-sm text-text-secondary">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Variantes de Procedimiento */}
              {resultadoAuditoria.variantesProcedimiento && (
                <div className="bg-card overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                      🔄 Variantes de Procedimiento
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(resultadoAuditoria.variantesProcedimiento).map(([procedimiento, detalles]: [string, any]) => (
                        <div key={procedimiento} className="border border-border rounded-md p-4">
                          <h4 className="font-medium text-text-primary mb-2">
                            {procedimiento.toUpperCase()}
                          </h4>
                          <ul className="text-sm text-text-secondary space-y-1">
                            {detalles.cambios?.map((cambio: string, index: number) => (
                              <li key={index}>• {cambio}</li>
                            ))}
                          </ul>
                          {detalles.normas && (
                            <div className="mt-2">
                              <p className="text-xs text-text-secondary">Normas: {detalles.normas.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Campos Variables */}
              {resultadoAuditoria.camposVariables && (
                <div className="bg-card overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                      📝 Campos Variables
                    </h3>
                    <pre className="text-sm text-text-secondary bg-app p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(resultadoAuditoria.camposVariables, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
