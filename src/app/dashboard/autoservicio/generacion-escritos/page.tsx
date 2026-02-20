'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Legal areas and document types (same structure as Estudiantes)
const legalAreas: Record<string, { name: string; price: number }[]> = {
  'Derecho Constitucional': [
    { name: 'Recurso de amparo ante el Tribunal Constitucional', price: 3.0 },
    { name: 'Recurso de inconstitucionalidad (modelo orientativo)', price: 3.0 },
    { name: 'Escrito de acción de protección de derechos fundamentales (ej. derecho de reunión, libertad de expresión)', price: 3.0 },
  ],
  'Derecho Civil y Procesal Civil': [
    { name: 'Demanda de reclamación de cantidad (juicio ordinario / juicio verbal / monitorio)', price: 3.0 },
    { name: 'Escrito de oposición a juicio monitorio', price: 3.0 },
    { name: 'Demanda de desahucio por falta de pago', price: 3.0 },
    { name: 'Escrito de medidas cautelares', price: 3.0 },
    { name: 'Recurso de apelación en proceso civil', price: 3.0 },
    { name: 'Demanda de responsabilidad contractual / extracontractual', price: 3.0 },
    { name: 'Escrito de ejecución de sentencia (ej. embargo de bienes)', price: 3.0 },
  ],
  'Derecho Penal y Procesal Penal': [
    { name: 'Denuncia y querella criminal', price: 3.0 },
    { name: 'Escrito de acusación particular', price: 3.0 },
    { name: 'Escrito de defensa', price: 3.0 },
    { name: 'Solicitud de medidas cautelares (ej. prisión preventiva, alejamiento)', price: 3.0 },
    { name: 'Recurso de reforma y subsidiario de apelación', price: 3.0 },
    { name: 'Escrito de personación como acusación particular', price: 3.0 },
    { name: 'Recurso de casación penal (modelo académico)', price: 3.0 },
  ],
  'Derecho Laboral (Jurisdicción Social)': [
    { name: 'Demanda por despido improcedente', price: 3.0 },
    { name: 'Demanda por reclamación de salarios', price: 3.0 },
    { name: 'Demanda por modificación sustancial de condiciones de trabajo', price: 3.0 },
    { name: 'Escrito de impugnación de sanción disciplinaria', price: 3.0 },
    { name: 'Escrito de ejecución de sentencia laboral', price: 3.0 },
  ],
  'Derecho Administrativo y Contencioso-Administrativo': [
    { name: 'Recurso administrativo de alzada', price: 3.0 },
    { name: 'Recurso potestativo de reposición', price: 3.0 },
    { name: 'Demanda contencioso-administrativa', price: 3.0 },
    { name: 'Medidas cautelares en vía contenciosa', price: 3.0 },
    { name: 'Escrito de personación en procedimiento contencioso', price: 3.0 },
    { name: 'Recurso de apelación en lo contencioso-administrativo', price: 3.0 },
  ],
  'Derecho Mercantil': [
    { name: 'Demanda de impugnación de acuerdos sociales', price: 3.0 },
    { name: 'Solicitud de concurso voluntario', price: 3.0 },
    { name: 'Demanda por competencia desleal', price: 3.0 },
    { name: 'Demanda por incumplimiento contractual mercantil', price: 3.0 },
    { name: 'Demanda cambiaria (ejecutiva)', price: 3.0 },
  ],
  'Recursos procesales transversales': [
    { name: 'Recurso de reposición', price: 3.0 },
    { name: 'Recurso de apelación', price: 3.0 },
    { name: 'Recurso de casación', price: 3.0 },
    { name: 'Recurso de queja', price: 3.0 },
    { name: 'Incidente de nulidad de actuaciones', price: 3.0 },
  ],
  'Derecho de Familia': [
    { name: 'Demanda de divorcio contencioso', price: 3.0 },
    { name: 'Demanda de medidas paternofiliales', price: 3.0 },
    { name: 'Solicitud de modificación de medidas', price: 3.0 },
    { name: 'Solicitud de guarda y custodia', price: 3.0 },
    { name: 'Demanda de alimentos', price: 3.0 },
    { name: 'Escrito de ejecución por impago de pensión alimenticia', price: 3.0 },
  ],
};

export default function GeneracionEscritosPage() {
  const router = useRouter();
  const [selectedLegalArea, setSelectedLegalArea] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');

  const handleContinuar = () => {
    if (selectedLegalArea && selectedDocumentType) {
      router.push('/dashboard/generar-escritos');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-8">
          Generación de Escritos
        </h1>

        {/* Escritos más frecuentes */}
        <div className="mb-10">
          <h2 className="text-h2 text-text-primary mb-6">
            Escritos más frecuentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/dashboard/autoservicio/reclamacion-cantidades"
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-hover group"
            >
              <div className="flex items-start">
                <div className="w-12 h-12 bg-surface-muted/50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-surface-muted flex-shrink-0">
                  <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-text-secondary transition-colors">
                    Reclamación de cantidades
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Demanda para reclamar cantidades en juicio ordinario, verbal o monitorio
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/autoservicio/accion-tutela"
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-hover group"
            >
              <div className="flex items-start">
                <div className="w-12 h-12 bg-surface-muted/50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-surface-muted flex-shrink-0">
                  <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-text-secondary transition-colors">
                    Acción de tutela
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Acción de tutela para protección de derechos fundamentales
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Otros escritos */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-h2 text-text-primary mb-4">
              Otros escritos
            </h2>
            <p className="text-body text-text-secondary mb-6">
              Selecciona un área legal y el tipo de escrito que necesitas generar
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="legal-area" className="block text-sm font-medium text-text-primary mb-2">
                  Área Legal
                </label>
                <select
                  id="legal-area"
                  value={selectedLegalArea}
                  onChange={(e) => {
                    setSelectedLegalArea(e.target.value);
                    setSelectedDocumentType('');
                  }}
                  className="input-field"
                >
                  <option value="">Selecciona un área legal</option>
                  {Object.keys(legalAreas).map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="document-type" className="block text-sm font-medium text-text-primary mb-2">
                  Tipo de Escrito
                </label>
                <select
                  id="document-type"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  disabled={!selectedLegalArea}
                  className="input-field disabled:bg-surface-muted/30 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedLegalArea ? 'Selecciona un tipo de escrito' : 'Primero selecciona un área legal'}
                  </option>
                  {selectedLegalArea &&
                    legalAreas[selectedLegalArea]?.map((docType) => (
                      <option key={docType.name} value={docType.name}>
                        {docType.name} - €{docType.price.toFixed(2)}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-text-secondary mb-2">
                País / Jurisdicción: <span className="font-medium text-text-primary">España</span>
              </p>
              <p className="text-xs text-text-secondary">
                Actualmente generamos automáticamente los escritos adaptados a la legislación española.
              </p>
            </div>

            {selectedLegalArea && selectedDocumentType && (
              <div className="mt-6">
                <button onClick={handleContinuar} className="btn-primary">
                  Continuar a generar escrito
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
