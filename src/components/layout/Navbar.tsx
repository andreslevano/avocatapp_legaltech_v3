'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

// Avocat DS v4 Navbar — spec: design-system/v4/components/Navbar.md. One item list for every public page.
const NAV_LINKS = [
  { href: '/productos/gestion-abogados', label: 'Abogados' },
  { href: '/productos/autoservicio', label: 'Particulares' },
  { href: '/productos/material-estudiantes', label: 'Estudiantes' },
  { href: '/#precios', label: 'Precios' },
  { href: '/acerca-de', label: 'Nosotros' },
];
const TRIAL_HREF = '/signup?plan=abogados';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isCurrent = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(href + '/'));

  return (
    <header data-theme="dark" className="sticky top-0 z-nav bg-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Avocat — inicio">
            <Logo variant="symbol" theme="gold" size={36} href="" />
            <span className="font-display text-h3 font-semibold text-accent-text tracking-[0.14em] leading-none">AVOCAT</span>
          </Link>

          <nav aria-label="Principal" className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const current = isCurrent(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`text-small font-medium transition-colors duration-fast py-1 border-b-2 ${
                    current ? 'text-text-heading border-accent' : 'text-text border-transparent hover:text-text-heading'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button href="/login" variant="ghost" size="sm" className="hidden md:inline-flex">Iniciar sesión</Button>
            <Button href={TRIAL_HREF} variant="accent" size="sm">Probar 14 días gratis</Button>
            <IconButton
              ref={triggerRef}
              icon={menuOpen ? X : Menu}
              label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="public-nav-drawer"
              className="md:hidden"
              onClick={() => setMenuOpen(v => !v)}
            />
          </div>
        </div>
      </div>

      {menuOpen && (
        <div id="public-nav-drawer" className="md:hidden bg-surface border-t border-border px-4 pb-4 pt-2 space-y-1">
          <nav aria-label="Principal (móvil)">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href) ? 'page' : undefined}
                className="block px-3 py-2.5 min-h-touch text-body text-text hover:bg-surface-raised rounded-md aria-[current=page]:text-text-heading"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="pt-3">
            <Button href="/login" variant="secondary" size="lg" block>Iniciar sesión</Button>
          </div>
        </div>
      )}
    </header>
  );
}
