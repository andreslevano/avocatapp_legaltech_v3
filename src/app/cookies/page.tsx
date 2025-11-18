'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Política de Cookies
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. ¿Qué son las Cookies?</h2>
                <p className="text-gray-700 mb-4">
                  Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. 
                  Estas cookies permiten que el sitio web recuerde sus acciones y preferencias durante un período de tiempo, 
                  por lo que no tiene que volver a configurarlas cada vez que regresa al sitio o navega de una página a otra.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Cómo Utilizamos las Cookies</h2>
                <p className="text-gray-700 mb-4">
                  Avocat LegalTech utiliza cookies para:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Mantener su sesión activa cuando está autenticado</li>
                  <li>Recordar sus preferencias de idioma y configuración</li>
                  <li>Mejorar la funcionalidad y el rendimiento del sitio</li>
                  <li>Analizar cómo los usuarios interactúan con nuestra plataforma</li>
                  <li>Proporcionar contenido personalizado</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Tipos de Cookies que Utilizamos</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. Cookies Esenciales</h3>
                <p className="text-gray-700 mb-4">
                  Estas cookies son necesarias para el funcionamiento básico del sitio web. Incluyen cookies de sesión 
                  que permiten que usted navegue por el sitio y utilice sus funciones esenciales.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Cookies de Funcionalidad</h3>
                <p className="text-gray-700 mb-4">
                  Estas cookies permiten que el sitio web recuerde las elecciones que hace (como su idioma preferido) 
                  y proporcionan características mejoradas y más personales.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3. Cookies Analíticas</h3>
                <p className="text-gray-700 mb-4">
                  Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web, proporcionando 
                  información sobre las áreas visitadas, el tiempo de permanencia y cualquier problema encontrado.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4. Cookies de Marketing</h3>
                <p className="text-gray-700 mb-4">
                  Estas cookies se utilizan para hacer seguimiento de los visitantes a través de diferentes sitios web 
                  con la intención de mostrar anuncios relevantes y atractivos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookies de Terceros</h2>
                <p className="text-gray-700 mb-4">
                  Algunas cookies son colocadas por servicios de terceros que aparecen en nuestras páginas. Estos incluyen:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Google Analytics:</strong> Para analizar el uso del sitio web</li>
                  <li><strong>Firebase:</strong> Para autenticación y almacenamiento de datos</li>
                  <li><strong>Stripe:</strong> Para procesamiento de pagos</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Gestión de Cookies</h2>
                <p className="text-gray-700 mb-4">
                  Puede controlar y/o eliminar las cookies como desee. Puede eliminar todas las cookies que ya están en 
                  su dispositivo y puede configurar la mayoría de los navegadores para evitar que se coloquen.
                </p>
                <p className="text-gray-700 mb-4">
                  Sin embargo, si hace esto, es posible que tenga que ajustar manualmente algunas preferencias cada vez 
                  que visite un sitio y algunos servicios y funcionalidades pueden no funcionar.
                </p>
                <p className="text-gray-700 mb-4">
                  Para obtener más información sobre cómo gestionar las cookies, visite:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Safari</a></li>
                  <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2d9461b58be0" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Microsoft Edge</a></li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Consentimiento</h2>
                <p className="text-gray-700 mb-4">
                  Al continuar utilizando nuestro sitio web, usted consiente el uso de cookies de acuerdo con esta política. 
                  Si no está de acuerdo con nuestro uso de cookies, debe configurar su navegador en consecuencia o no 
                  utilizar nuestro sitio web.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cambios a esta Política</h2>
                <p className="text-gray-700 mb-4">
                  Podemos actualizar esta Política de Cookies ocasionalmente. Le recomendamos que revise esta página 
                  periódicamente para estar informado sobre cómo utilizamos las cookies.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contacto</h2>
                <p className="text-gray-700 mb-4">
                  Si tiene preguntas sobre nuestra Política de Cookies, puede contactarnos en:
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

