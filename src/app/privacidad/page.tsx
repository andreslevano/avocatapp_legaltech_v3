'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Política de Privacidad
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introducción</h2>
                <p className="text-gray-700 mb-4">
                  Avocat LegalTech ("nosotros", "nuestro" o "la Plataforma") se compromete a proteger la privacidad 
                  de sus usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y 
                  protegemos su información personal cuando utiliza nuestros servicios.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Información que Recopilamos</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1. Información Personal</h3>
                <p className="text-gray-700 mb-4">
                  Recopilamos información que usted nos proporciona directamente, incluyendo:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Nombre completo y datos de contacto (correo electrónico, número de teléfono)</li>
                  <li>Información de facturación y pago</li>
                  <li>Documentos legales que sube a la plataforma</li>
                  <li>Comunicaciones que mantiene con nuestro equipo de soporte</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2. Información de Uso</h3>
                <p className="text-gray-700 mb-4">
                  Automáticamente recopilamos información sobre cómo utiliza nuestros servicios:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Datos de navegación y actividad en la plataforma</li>
                  <li>Direcciones IP y datos de dispositivo</li>
                  <li>Cookies y tecnologías similares</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cómo Utilizamos su Información</h2>
                <p className="text-gray-700 mb-4">
                  Utilizamos la información recopilada para:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Proporcionar, mantener y mejorar nuestros servicios</li>
                  <li>Procesar transacciones y gestionar su cuenta</li>
                  <li>Enviar comunicaciones relacionadas con el servicio</li>
                  <li>Personalizar su experiencia en la plataforma</li>
                  <li>Cumplir con obligaciones legales y prevenir fraudes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Compartir Información</h2>
                <p className="text-gray-700 mb-4">
                  No vendemos su información personal. Podemos compartir información en las siguientes circunstancias:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Con proveedores de servicios que nos ayudan a operar la plataforma</li>
                  <li>Cuando sea requerido por ley o para proteger nuestros derechos</li>
                  <li>Con su consentimiento explícito</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Seguridad de los Datos</h2>
                <p className="text-gray-700 mb-4">
                  Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal 
                  contra acceso no autorizado, alteración, divulgación o destrucción.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Sus Derechos</h2>
                <p className="text-gray-700 mb-4">
                  Usted tiene derecho a:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Acceder a su información personal</li>
                  <li>Rectificar datos inexactos</li>
                  <li>Solicitar la eliminación de sus datos</li>
                  <li>Oponerse al procesamiento de sus datos</li>
                  <li>Portabilidad de datos</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Retención de Datos</h2>
                <p className="text-gray-700 mb-4">
                  Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos 
                  descritos en esta política, a menos que la ley requiera o permita un período de retención más largo.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cambios a esta Política</h2>
                <p className="text-gray-700 mb-4">
                  Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos sobre cambios 
                  significativos publicando la nueva política en esta página y actualizando la fecha de "Última actualización".
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contacto</h2>
                <p className="text-gray-700 mb-4">
                  Si tiene preguntas sobre esta Política de Privacidad, puede contactarnos en:
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

