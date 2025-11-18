'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function GDPRPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Cumplimiento GDPR
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introducción</h2>
                <p className="text-gray-700 mb-4">
                  Avocat LegalTech cumple con el Reglamento General de Protección de Datos (GDPR) de la Unión Europea. 
                  Esta página describe cómo cumplimos con nuestros obligaciones bajo el GDPR y cómo protegemos los 
                  derechos de los usuarios de la UE.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Base Legal para el Procesamiento</h2>
                <p className="text-gray-700 mb-4">
                  Procesamos sus datos personales basándonos en las siguientes bases legales:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Consentimiento:</strong> Cuando ha dado su consentimiento explícito</li>
                  <li><strong>Ejecución de contrato:</strong> Para proporcionar nuestros servicios</li>
                  <li><strong>Obligación legal:</strong> Para cumplir con obligaciones legales</li>
                  <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y seguridad</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Sus Derechos bajo el GDPR</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. Derecho de Acceso</h3>
                <p className="text-gray-700 mb-4">
                  Tiene derecho a acceder a sus datos personales y recibir información sobre cómo los procesamos.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Derecho de Rectificación</h3>
                <p className="text-gray-700 mb-4">
                  Puede solicitar la corrección de datos inexactos o incompletos.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3. Derecho de Supresión ("Derecho al Olvido")</h3>
                <p className="text-gray-700 mb-4">
                  Puede solicitar la eliminación de sus datos personales cuando ya no sean necesarios o cuando retire su consentimiento.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4. Derecho a la Limitación del Procesamiento</h3>
                <p className="text-gray-700 mb-4">
                  Puede solicitar que limitemos el procesamiento de sus datos en ciertas circunstancias.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.5. Derecho a la Portabilidad de Datos</h3>
                <p className="text-gray-700 mb-4">
                  Puede recibir sus datos personales en un formato estructurado y comúnmente utilizado, y transmitirlos a otro controlador.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.6. Derecho de Oposición</h3>
                <p className="text-gray-700 mb-4">
                  Puede oponerse al procesamiento de sus datos personales cuando se base en interés legítimo o marketing directo.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.7. Derecho a Retirar el Consentimiento</h3>
                <p className="text-gray-700 mb-4">
                  Puede retirar su consentimiento en cualquier momento cuando el procesamiento se base en consentimiento.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Ejercer sus Derechos</h2>
                <p className="text-gray-700 mb-4">
                  Para ejercer cualquiera de estos derechos, puede contactarnos en:
                </p>
                <p className="text-gray-700 mb-4">
                  Email: <a href="mailto:soporte@avocatapp.com" className="text-primary-600 hover:text-primary-700">soporte@avocatapp.com</a>
                </p>
                <p className="text-gray-700 mb-4">
                  Responderemos a su solicitud dentro de un mes. Si su solicitud es compleja o tiene muchas solicitudes, 
                  podemos extender este plazo hasta dos meses adicionales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Transferencias Internacionales</h2>
                <p className="text-gray-700 mb-4">
                  Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo (EEE). 
                  Cuando transferimos datos fuera del EEE, nos aseguramos de que existan salvaguardas adecuadas, como:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Cláusulas contractuales estándar aprobadas por la Comisión Europea</li>
                  <li>Decisiones de adecuación de la Comisión Europea</li>
                  <li>Otros mecanismos legales apropiados</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Medidas de Seguridad</h2>
                <p className="text-gray-700 mb-4">
                  Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales, incluyendo:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Cifrado de datos en tránsito y en reposo</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Monitoreo y auditoría regular</li>
                  <li>Capacitación del personal en protección de datos</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Retención de Datos</h2>
                <p className="text-gray-700 mb-4">
                  Conservamos sus datos personales solo durante el tiempo necesario para los fines para los que fueron 
                  recopilados, a menos que la ley requiera o permita un período de retención más largo.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Notificación de Violaciones de Datos</h2>
                <p className="text-gray-700 mb-4">
                  En caso de una violación de datos que pueda resultar en un alto riesgo para sus derechos y libertades, 
                  le notificaremos sin demora indebida, a más tardar 72 horas después de haber tomado conocimiento de la violación.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Autoridad Supervisora</h2>
                <p className="text-gray-700 mb-4">
                  Si considera que el procesamiento de sus datos personales viola el GDPR, tiene derecho a presentar una 
                  queja ante la autoridad supervisora de su país de residencia o ante la Agencia Española de Protección 
                  de Datos (AEPD).
                </p>
                <p className="text-gray-700 mb-4">
                  Agencia Española de Protección de Datos:<br />
                  <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">www.aepd.es</a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contacto</h2>
                <p className="text-gray-700 mb-4">
                  Para cualquier consulta relacionada con el GDPR, puede contactarnos en:
                </p>
                <p className="text-gray-700">
                  Email: <a href="mailto:soporte@avocatapp.com" className="text-primary-600 hover:text-primary-700">soporte@avocatapp.com</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

