'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import LanguageSelector from './LanguageSelector';
import ProductsDropdown from './ProductsDropdown';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { t } = useI18n();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Avocat</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <ProductsDropdown />
            <Link href="#caracteristicas" className="text-gray-600 hover:text-primary-600 transition-colors">
              {t('navigation.features')}
            </Link>
            <Link href="#precios" className="text-gray-600 hover:text-primary-600 transition-colors">
              {t('navigation.pricing')}
            </Link>
            <Link href="#acerca-de" className="text-gray-600 hover:text-primary-600 transition-colors">
              {t('navigation.about')}
            </Link>
            <Link href="/contacto" className="text-gray-600 hover:text-primary-600 transition-colors">
              {t('navigation.contact')}
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="btn-secondary">
                  {t('navigation.dashboard')}
                </Link>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t('navigation.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-gray-600 hover:text-primary-600 transition-colors">
                  {t('navigation.login')}
                </Link>
                <Link href="/signup" className="btn-primary">
                  {t('navigation.signup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <div className="px-3 py-2">
                <LanguageSelector />
              </div>
              <div className="px-3 py-2 border-b border-gray-200 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Productos</p>
                <Link href="/productos/gestion-abogados" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors rounded-md hover:bg-gray-50">
                  <span className="flex items-center space-x-2">
                    <span>Gestión para Abogados</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Beta</span>
                  </span>
                </Link>
                <Link href="/productos/material-estudiantes" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors rounded-md hover:bg-gray-50">
                  Material para Estudiantes
                </Link>
                <Link href="/productos/autoservicio" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors rounded-md hover:bg-gray-50">
                  Autoservicio
                </Link>
              </div>
              <Link href="#caracteristicas" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                {t('navigation.features')}
              </Link>
              <Link href="#precios" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                {t('navigation.pricing')}
              </Link>
              <Link href="#acerca-de" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                {t('navigation.about')}
              </Link>
              <Link href="/contacto" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                {t('navigation.contact')}
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                    {t('navigation.dashboard')}
                  </Link>
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    {t('navigation.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
                    {t('navigation.login')}
                  </Link>
                  <Link href="/signup" className="block px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors">
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
