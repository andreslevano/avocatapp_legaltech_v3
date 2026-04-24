'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

const NAV_LINKS = [
  { href: '/productos/gestion-abogados', label: 'Abogados' },
  { href: '/productos/autoservicio', label: 'Particulares' },
  { href: '/productos/material-estudiantes', label: 'Estudiantes' },
  { href: '/acerca-de', label: 'Nosotros' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-avocat-black border-b border-ds-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo variant="signature" theme="light" size={32} />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-small font-sans font-medium text-ds-text hover:text-avocat-gold-l transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="BtnGhost" size="sm" className="text-ds-text hover:text-white hover:bg-ds-card">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="BtnGold" size="sm">
                Comenzar gratis
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-ds-text hover:text-white"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Abrir menú"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-ds-card border-t border-ds-border px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 text-body text-ds-text hover:text-white hover:bg-ds-card2 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="BtnOutlineGold" size="md" fullWidth>
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)}>
              <Button variant="BtnGold" size="md" fullWidth>
                Comenzar gratis
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
