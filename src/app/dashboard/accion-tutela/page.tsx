'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavigation from '@/components/DashboardNavigation';

interface TutelaFormData {
  vulnerador: string;
  hechos: string;
  derecho: string;
  peticiones: string;
  medidasProvisionales: boolean;
  anexos: string[];
  ciudad: string;
}

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

export default function AccionTutelaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<TutelaFormData>({
    vulnerador: '',
    hechos: '',
    derecho: '',
    peticiones: '',
    medidasProvisionales: false,
    anexos: [],
    ciudad: 'Bogotá'
  });
  
  const [anexoInput, setAnexoInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para OCR
  const [ocrFiles, setOcrFiles] = useState<OCRFile[]>([]);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [useOcrData, setUseOcrData] = useState(false);

  const handleInputChange = (field: keyof TutelaFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAnexo = () => {
    if (anexoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        anexos: [...prev.anexos, anexoInput.trim()]
      }));
      setAnexoInput('');
    }
  };

  const removeAnexo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, i) => i !== index)
    }));
  };

  // Funciones para OCR
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        setSuccess(`Se procesaron ${result.data.files.length} archivo(s) correctamente`);
      } else {
        throw new Error('Error en el procesamiento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const removeOcrFile = (id: string) => {
    setOcrFiles(prev => prev.filter(file => file.id !== id));
    if (ocrFiles.length === 1) {
      setUseOcrData(false);
    }
  };

  const applyOcrData = async () => {
    if (ocrFiles.length === 0) return;

    // Extraer datos del primer archivo procesado
    const firstFile = ocrFiles[0];
    const extractedText = firstFile.extractedText;

    // Simulación de extracción de datos (en producción usarías NLP)
    const mockExtractedData = {
      vulnerador: 'Entidad extraída del documento',
      hechos: 'Hechos extraídos del documento PDF mediante OCR',
      derecho: 'salud', // Derecho más común
      peticiones: 'Peticiones extraídas del documento'
    };

    setFormData(prev => ({
      ...prev,
      vulnerador: mockExtractedData.vulnerador,
      hechos: mockExtractedData.hechos,
      derecho: mockExtractedData.derecho,
      peticiones: mockExtractedData.peticiones
    }));

    setSuccess('Datos aplicados desde el documento procesado');

    // Analizar éxito con ChatGPT
    try {
      console.log('🔍 Analizando éxito de Acción de Tutela con datos OCR...');
      
      const response = await fetch('/api/analisis-exito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datosOCR: {
            documentos: ocrFiles.map(file => ({
              nombre: file.originalName,
              tipo: 'Documento legal',
              contenido: file.extractedText,
              fecha: new Date().toISOString(),
              relevancia: 'Alta',
              confianza: file.confidence
            })),
            resumen: [`Datos extraídos de ${ocrFiles.length} documento(s)`],
            completitud: Math.min(100, ocrFiles.length * 25)
          },
          tipoDocumento: 'Acción de Tutela',
          userId: 'demo_user'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Análisis de éxito completado:', result.data.analisis.analisis?.porcentajeExito + '%');
        
        // Mostrar resultado en un alert por ahora
        alert(`Análisis de Éxito: ${result.data.analisis.analisis?.porcentajeExito}% de probabilidad de éxito\nNivel: ${result.data.analisis.analisis?.nivelConfianza}`);
      }
    } catch (error) {
      console.error('❌ Error en análisis de éxito:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/accion-tutela', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: 'demo_user',
          userEmail: 'demo@example.com', // TODO: Obtener del usuario autenticado
          ocrFiles: useOcrData ? ocrFiles : []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error generando la tutela');
      }

      const result = await response.json();
      
      if (result.ok && result.downloadUrl) {
        // Descargar el PDF
        const pdfResponse = await fetch(result.downloadUrl);
        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accion-tutela-${formData.derecho}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccess('¡Acción de Tutela generada exitosamente! El PDF se ha descargado.');
      } else {
        throw new Error('No se pudo generar la tutela');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Acción de Tutela
            </h1>
            <p className="text-gray-600">
              Genera una acción de tutela profesional conforme a la Constitución Política (art. 86) y el Decreto 2591 de 1991.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{success}</p>
              <button
                onClick={() => router.push('/dashboard/accion-tutela/history')}
                className="mt-2 text-green-600 hover:text-green-800 underline"
              >
                Ver en historial
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección de Carga de PDF con OCR */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                📄 Cargar Documentos PDF (Opcional)
              </h3>
              <p className="text-blue-700 mb-4">
                Sube documentos PDF para extraer automáticamente los datos y completar el formulario.
              </p>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    id="pdf-files"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 10MB por archivo. Se permiten múltiples archivos PDF.
                  </p>
                </div>

                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="flex space-x-2">
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
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {ocrFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Archivos Procesados:</h4>
                    <div className="space-y-2">
                      {ocrFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{file.originalName}</p>
                            <p className="text-xs text-gray-500">
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
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
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
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                      >
                        {useOcrData ? '✓ Usando datos OCR' : 'Usar datos OCR'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (ocrFiles.length === 0) {
                            alert('Primero procesa algunos documentos con OCR');
                            return;
                          }
                          
                          try {
                            console.log('🔍 Analizando éxito de Acción de Tutela...');
                            
                            const response = await fetch('/api/analisis-exito', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                datosOCR: {
                                  documentos: ocrFiles.map(file => ({
                                    nombre: file.originalName,
                                    tipo: 'Documento legal',
                                    contenido: file.extractedText,
                                    fecha: new Date().toISOString(),
                                    relevancia: 'Alta',
                                    confianza: file.confidence
                                  })),
                                  resumen: [`Datos extraídos de ${ocrFiles.length} documento(s)`],
                                  completitud: Math.min(100, ocrFiles.length * 25)
                                },
                                tipoDocumento: 'Acción de Tutela',
                                userId: 'demo_user'
                              }),
                            });

                            if (response.ok) {
                              const result = await response.json();
                              console.log('✅ Análisis de éxito completado:', result.data.analisis.analisis?.porcentajeExito + '%');
                              
                              alert(`Análisis de Éxito: ${result.data.analisis.analisis?.porcentajeExito}% de probabilidad de éxito\nNivel: ${result.data.analisis.analisis?.nivelConfianza}`);
                            }
                          } catch (error) {
                            console.error('❌ Error en análisis de éxito:', error);
                            alert('Error analizando la probabilidad de éxito');
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Analizar Éxito</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vulnerador */}
            <div>
              <label htmlFor="vulnerador" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de persona o entidad que vulnera el derecho *
              </label>
              <input
                type="text"
                id="vulnerador"
                value={formData.vulnerador}
                onChange={(e) => handleInputChange('vulnerador', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Alcaldía de Bogotá, Empresa XYZ, etc."
                required
              />
            </div>

            {/* Hechos */}
            <div>
              <label htmlFor="hechos" className="block text-sm font-medium text-gray-700 mb-2">
                Relato detallado de los hechos *
              </label>
              <textarea
                id="hechos"
                value={formData.hechos}
                onChange={(e) => handleInputChange('hechos', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe detalladamente qué sucedió, cuándo, dónde y cómo se vulneró el derecho..."
                required
              />
            </div>

            {/* Derecho */}
            <div>
              <label htmlFor="derecho" className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué derecho piensa que ha sido vulnerado? *
              </label>
              <select
                id="derecho"
                value={formData.derecho}
                onChange={(e) => handleInputChange('derecho', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Peticiones */}
            <div>
              <label htmlFor="peticiones" className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué se solicita? (órdenes concretas) *
              </label>
              <textarea
                id="peticiones"
                value={formData.peticiones}
                onChange={(e) => handleInputChange('peticiones', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Especifique claramente qué órdenes solicita al juez..."
                required
              />
            </div>

            {/* Medidas Provisionales */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medidasProvisionales}
                  onChange={(e) => handleInputChange('medidasProvisionales', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Solicitar medidas provisionales
                </span>
              </label>
            </div>

            {/* Anexos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anexos (documentos de apoyo)
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={anexoInput}
                  onChange={(e) => setAnexoInput(e.target.value)}
                  placeholder="Ej: Certificado médico, contrato, etc."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addAnexo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
              {formData.anexos.length > 0 && (
                <div className="space-y-1">
                  {formData.anexos.map((anexo, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{anexo}</span>
                      <button
                        type="button"
                        onClick={() => removeAnexo(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ciudad */}
            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bogotá"
              />
            </div>

            {/* Botón de envío */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generando Tutela (IA)...' : 'Generar Tutela (IA)'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}