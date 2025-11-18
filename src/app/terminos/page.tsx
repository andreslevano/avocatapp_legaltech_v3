'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Términos de Servicio
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Aceptación de los Términos</h2>
                <p className="text-gray-700 mb-4">
                  Al acceder y utilizar los servicios de Avocat LegalTech ("la Plataforma"), usted acepta estar 
                  sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, 
                  no debe utilizar nuestros servicios.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Descripción del Servicio</h2>
                <p className="text-gray-700 mb-4">
                  Avocat LegalTech es una plataforma de tecnología legal que ofrece herramientas de inteligencia 
                  artificial para asistir en la generación de documentos legales, análisis de casos y gestión de 
                  expedientes. Nuestros servicios incluyen:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Generación automatizada de documentos legales</li>
                  <li>Análisis de documentos con inteligencia artificial</li>
                  <li>Gestión de casos y clientes</li>
                  <li>Material educativo para estudiantes de derecho</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cuentas de Usuario</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. Registro</h3>
                <p className="text-gray-700 mb-4">
                  Para utilizar ciertos servicios, debe crear una cuenta proporcionando información precisa y completa. 
                  Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Responsabilidades del Usuario</h3>
                <p className="text-gray-700 mb-4">
                  Usted es responsable de:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Mantener la seguridad de su cuenta</li>
                  <li>Todas las actividades que ocurran bajo su cuenta</li>
                  <li>Proporcionar información precisa y actualizada</li>
                  <li>Cumplir con todas las leyes y regulaciones aplicables</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Uso Aceptable</h2>
                <p className="text-gray-700 mb-4">
                  Usted se compromete a no:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Utilizar el servicio para fines ilegales o no autorizados</li>
                  <li>Intentar acceder a áreas restringidas de la plataforma</li>
                  <li>Interferir con el funcionamiento del servicio</li>
                  <li>Transmitir virus, malware o código malicioso</li>
                  <li>Violar derechos de propiedad intelectual</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Propiedad Intelectual</h2>
                <p className="text-gray-700 mb-4">
                  Todos los contenidos, funcionalidades y materiales de la plataforma son propiedad de Avocat LegalTech 
                  o sus licenciantes y están protegidos por leyes de propiedad intelectual. Los documentos generados 
                  mediante nuestros servicios son propiedad del usuario, sujeto a estos términos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Pagos y Facturación</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1. Precios</h3>
                <p className="text-gray-700 mb-4">
                  Los precios de nuestros servicios se muestran en la plataforma y pueden cambiar con previo aviso. 
                  Todos los precios están expresados en euros (€) o la moneda indicada.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2. Facturación</h3>
                <p className="text-gray-700 mb-4">
                  Los pagos se procesan mediante proveedores de servicios de pago seguros. Usted autoriza a Avocat 
                  LegalTech a cobrar el método de pago asociado a su cuenta.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3. Reembolsos</h3>
                <p className="text-gray-700 mb-4">
                  Las políticas de reembolso se aplican según el plan de suscripción seleccionado. Los reembolsos 
                  se evalúan caso por caso.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitación de Responsabilidad</h2>
                <p className="text-gray-700 mb-4">
                  Avocat LegalTech proporciona los servicios "tal cual" y "según disponibilidad". No garantizamos que 
                  el servicio sea ininterrumpido, seguro o libre de errores. No seremos responsables por daños indirectos, 
                  incidentales o consecuentes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Modificaciones del Servicio</h2>
                <p className="text-gray-700 mb-4">
                  Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio 
                  en cualquier momento, con o sin previo aviso.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Terminación</h2>
                <p className="text-gray-700 mb-4">
                  Podemos terminar o suspender su acceso al servicio inmediatamente, sin previo aviso, por cualquier 
                  motivo, incluyendo el incumplimiento de estos términos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Ley Aplicable</h2>
                <p className="text-gray-700 mb-4">
                  Estos términos se rigen por las leyes de España. Cualquier disputa será resuelta en los tribunales 
                  competentes de España.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contacto</h2>
                <p className="text-gray-700 mb-4">
                  Para preguntas sobre estos Términos de Servicio, contacte:
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

