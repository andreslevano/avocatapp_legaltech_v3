import Link from 'next/link';
import Logo from '@/components/brand/Logo';

const FOOTER_LINKS = {
  Producto: [
    { href: '/productos/gestion-abogados', label: 'Para abogados' },
    { href: '/productos/autoservicio', label: 'Para particulares' },
    { href: '/productos/material-estudiantes', label: 'Para estudiantes' },
  ],
  Empresa: [
    { href: '/acerca-de', label: 'Nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ],
  Legal: [
    { href: '/privacidad', label: 'Privacidad' },
    { href: '/terminos', label: 'Términos' },
    { href: '/cookies', label: 'Cookies' },
    { href: '/gdpr', label: 'GDPR' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-avocat-black border-t border-ds-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Logo variant="signature" theme="light" size={28} href="/" />
            <p className="mt-4 text-small text-ds-text leading-relaxed">
              Plataforma LegalTech con IA para abogados, estudiantes y particulares.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-label font-sans font-semibold text-avocat-gold tracking-widest uppercase mb-3">
                {group}
              </h4>
              <ul className="space-y-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-small text-ds-text hover:text-avocat-gold-l transition-colors duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-ds-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-small text-avocat-gray9">
            © {new Date().getFullYear()} Avocat LegalTech. Todos los derechos reservados.
          </p>
          <p className="text-small text-avocat-gray9">
            Hecho con IA · avocatapp.com
          </p>
        </div>
      </div>
    </footer>
  );
}
