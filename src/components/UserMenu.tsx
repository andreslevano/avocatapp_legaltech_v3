'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

interface UserMenuProps {
  user?: User | null;
  currentPlan?: string;
  onSignOut?: () => void;
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user?.uid || !db) return;
    const firestore = db;
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const name = data.displayName ?? data.profile?.displayName ?? '';
          if (name) setDisplayName(name);
        }
      } catch {
        // ignore
      }
    };
    loadProfile();
  }, [user?.uid]);

  if (!user) {
    return null;
  }
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
      // Check if auth is properly initialized
      if (auth && typeof auth.signOut === 'function') {
        await signOut(auth as any);
        if (onSignOut) {
          onSignOut();
        }
        router.push('/');
      } else {
        console.error('Firebase auth not properly initialized');
        if (onSignOut) {
          onSignOut();
        }
        router.push('/');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const getUserInitials = (email: string, name?: string | null) => {
    if (name?.trim()) return name.trim().charAt(0).toUpperCase();
    return email?.charAt(0)?.toUpperCase() || 'A';
  };

  const userName = displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 bg-sidebar rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-border transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sidebar focus:ring-offset-2 focus:ring-offset-card"
        aria-label="User menu"
      >
        <span className="text-text-on-dark font-bold text-lg">
          {getUserInitials(user.email || '', userName)}
        </span>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-surface-muted border-2 border-card rounded-full"></div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="bg-surface-muted/30 p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-sidebar rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-text-on-dark font-bold text-2xl">
                  {getUserInitials(user.email || '', userName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-h3 text-text-primary truncate">
                  {userName}
                </h3>
                <p className="text-small text-text-secondary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <div className="px-4 py-2">
              <h4 className="text-small font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Cuenta
              </h4>
            </div>

            <Link
              href="/profile"
              className="flex items-center px-4 py-3 text-text-primary hover:bg-hover/30 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-surface-muted/50 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-body font-medium">Mi Perfil</p>
                <p className="text-small text-text-secondary">Información personal y configuración</p>
              </div>
            </Link>

            <Link
              href="/subscription"
              className="flex items-center px-4 py-3 text-text-primary hover:bg-hover/30 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-surface-muted/50 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-body font-medium">Suscripción</p>
                <p className="text-small text-text-secondary">Plan actual y facturación</p>
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full flex items-center px-4 py-3 text-text-primary hover:bg-hover/30 transition-colors duration-200 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-surface-muted/50 rounded-lg flex items-center justify-center mr-3">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-border border-t-sidebar rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-body font-medium">
                  {isLoading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </p>
                <p className="text-small text-text-secondary">Salir de tu cuenta</p>
              </div>
            </button>
          </div>

          <div className="bg-app px-4 py-3 border-t border-border">
            <p className="text-small text-text-secondary text-center">
              Avocat LegalTech v3.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}