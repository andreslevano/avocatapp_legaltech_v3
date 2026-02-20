'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import LanguageSelector from './LanguageSelector';
import ProductsDropdown from './ProductsDropdown';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { t } = useI18n();

  return (
    <header className="bg-sidebar shadow-sm border-b border-border/50 sticky top-0 z-[10000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <div className="flex-shrink-0 min-w-0">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/images/avocat-logo-white-v1.png"
                alt="Avocat logo"
                width={32}
                height={32}
                className="h-8 w-8"
                priority
              />
              <span className="text-2xl font-bold tracking-wide text-text-on-dark">
                AVOCAT
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <ProductsDropdown />
            <Link href="#caracteristicas" className="text-text-on-dark hover:text-text-on-dark transition-colors">
              {t('navigation.features')}
            </Link>
            <Link href="#precios" className="text-text-on-dark hover:text-text-on-dark transition-colors">
              {t('navigation.pricing')}
            </Link>
            <Link href="/acerca-de" className="text-text-on-dark hover:text-text-on-dark transition-colors">
              {t('navigation.about')}
            </Link>
            <Link href="/contacto" className="text-text-on-dark hover:text-text-on-dark transition-colors">
              {t('navigation.contact')}
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="hidden" aria-hidden="true"><LanguageSelector /></div>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="btn-secondary">
                  {t('navigation.dashboard')}
                </Link>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="text-text-on-dark/90 hover:text-text-on-dark transition-colors"
                >
                  {t('navigation.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-text-on-dark font-medium hover:opacity-90 transition-opacity">
                  {t('navigation.login')}
                </Link>
                <Link href="/signup" className="btn-primary">
                  {t('navigation.signup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex-shrink-0 order-last">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="flex items-center justify-center w-11 h-11 -mr-1 text-white hover:text-white/90 transition-colors rounded-lg hover:bg-white/10 active:bg-white/20"
              type="button"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <svg className="h-7 w-7 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-sidebar border-t border-border/50">
            <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3 max-h-[70vh] overflow-y-auto overscroll-contain">
              <div className="hidden px-3 py-2" aria-hidden="true">
                <LanguageSelector />
              </div>
              <div className="px-3 py-2 border-b border-border/50 mb-2">
                <p className="text-small font-semibold text-white/80 uppercase tracking-wider mb-2">Productos</p>
                <Link href="/productos/gestion-abogados" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                  <span className="flex items-center space-x-2">
                    <span>Gestión para Abogados</span>
                    <span className="text-xs bg-surface-muted text-text-primary px-2 py-0.5 rounded">Beta</span>
                  </span>
                </Link>
                <Link href="/productos/material-estudiantes" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                  Material para Estudiantes
                </Link>
                <Link href="/productos/autoservicio" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                  Autoservicio
                </Link>
              </div>
              <Link href="#caracteristicas" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                {t('navigation.features')}
              </Link>
              <Link href="#precios" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                {t('navigation.pricing')}
              </Link>
              <Link href="/acerca-de" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                {t('navigation.about')}
              </Link>
              <Link href="/contacto" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                {t('navigation.contact')}
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                    {t('navigation.dashboard')}
                  </Link>
                  <button
                    onClick={() => { setIsLoggedIn(false); setIsMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md"
                  >
                    {t('navigation.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white font-medium hover:bg-white/10 transition-colors rounded-md">
                    {t('navigation.login')}
                  </Link>
                  <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2.5 text-white hover:text-white hover:bg-white/10 transition-colors rounded-md">
                    {t('navigation.signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
