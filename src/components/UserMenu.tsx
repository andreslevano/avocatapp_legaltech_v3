'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut, User } from 'firebase/auth';
import Link from 'next/link';

interface UserMenuProps {
  user: User;
  currentPlan?: string;
  onSignOut?: () => void;
}

export default function UserMenu({ user, currentPlan = 'Abogados', onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      if (onSignOut) {
        onSignOut();
      }
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Estudiantes':
        return 'bg-green-500';
      case 'Reclamación de Cantidades':
        return 'bg-orange-500';
      case 'Acción de Tutela':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'Estudiantes':
        return '🎓';
      case 'Reclamación de Cantidades':
        return '💰';
      case 'Acción de Tutela':
        return '⚖️';
      default:
        return '👨‍💼';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="User menu"
      >
        <span className="text-white font-bold text-lg">
          {getUserInitials(user.email || '')}
        </span>
        
        {/* Online Status Indicator */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {getUserInitials(user.email || '')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 truncate">
                  {user.displayName || 'Usuario'}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {user.email}
                </p>
                <div className="flex items-center mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getPlanColor(currentPlan)}`}>
                    {getPlanIcon(currentPlan)} {currentPlan}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile Section */}
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Cuenta
              </h4>
            </div>
            
            <Link
              href="/profile"
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Mi Perfil</p>
                <p className="text-xs text-gray-500">Información personal y configuración</p>
              </div>
            </Link>

            <Link
              href="/subscription"
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Suscripción</p>
                <p className="text-xs text-gray-500">Plan actual y facturación</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Configuración</p>
                <p className="text-xs text-gray-500">Preferencias y privacidad</p>
              </div>
            </Link>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Support Section */}
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Soporte
              </h4>
            </div>

            <Link
              href="/help"
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Centro de Ayuda</p>
                <p className="text-xs text-gray-500">Preguntas frecuentes y soporte</p>
              </div>
            </Link>

            <Link
              href="/contact"
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Contactar Soporte</p>
                <p className="text-xs text-gray-500">Envíanos un mensaje</p>
              </div>
            </Link>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Danger Zone */}
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Cuenta
              </h4>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Implement close account functionality
                alert('Función de cerrar cuenta en desarrollo');
              }}
              className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Cerrar Cuenta</p>
                <p className="text-xs text-red-500">Eliminar permanentemente tu cuenta</p>
              </div>
            </button>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isLoading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </p>
                <p className="text-xs text-gray-500">Salir de tu cuenta</p>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Avocat LegalTech v3.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}