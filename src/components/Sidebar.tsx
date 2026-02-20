'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarProps {
  user?: User | null;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

function isPathActive(pathname: string | null, href: string, childHrefs?: string[]): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (childHrefs?.some((c) => pathname === c || pathname.startsWith(c + '/'))) return true;
  return false;
}

// Heroicons outline style - stroke 2, 24x24
const Icons = {
  briefcase: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  grid: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  folder: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  users: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  academicCap: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  cog: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  documentText: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  shield: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  search: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  database: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  mail: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  clipboard: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  chevronDown: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  menu: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  x: (className?: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function Sidebar({ user, isOpen: controlledOpen, onToggle, onClose, isCollapsed = false, onCollapseToggle }: SidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const closeSidebar = () => (onClose ? onClose() : onToggle ? onToggle() : setInternalOpen(false));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    abogados: true,
    autoservicio: false,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.uid) {
        setAdminChecked(true);
        return;
      }
      const firestore = db;
      if (!firestore) {
        setAdminChecked(true);
        return;
      }
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin === true);
          const name = userData.displayName ?? userData.profile?.displayName ?? '';
          if (name) setDisplayName(name);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setAdminChecked(true);
      }
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!pathname) return;
    if (pathname?.startsWith('/dashboard/autoservicio') || pathname?.includes('/dashboard/generar-escritos') || pathname?.includes('/dashboard/analisis-caso')) {
      setExpandedSections({ abogados: false, autoservicio: true });
    } else if (pathname.startsWith('/dashboard/casos') || pathname.startsWith('/dashboard/directorio') || pathname === '/dashboard') {
      setExpandedSections({ abogados: true, autoservicio: false });
    }
  }, [pathname]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const isExpanding = !prev[key];
      if (isExpanding && (key === 'abogados' || key === 'autoservicio')) {
        return { ...prev, abogados: key === 'abogados', autoservicio: key === 'autoservicio', [key]: true };
      }
      return { ...prev, [key]: false };
    });
  };

  const iconCls = 'w-5 h-5 flex-shrink-0 text-text-on-dark';
  const getLinkClasses = (href: string, isChild = false) => {
    const active = pathname ? (pathname === href || (isChild && pathname.startsWith(href + '/'))) : false;
    return `flex items-center px-4 py-2.5 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark ${
      active ? 'bg-hover/30 border-l-4 border-l-text-on-dark' : 'hover:bg-hover/20'
    }`;
  };

  return (
    <>
      {!onToggle && (
        <div className="lg:hidden">
          <button
            onClick={() => setInternalOpen(!internalOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-text-on-dark hover:bg-hover/20"
            aria-label="Open menu"
          >
            {Icons.menu('h-6 w-6')}
          </button>
        </div>
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 bg-sidebar shadow-lg transition-all duration-300 ease-in-out lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/50 shrink-0">
            <Link href="/dashboard" className="flex items-center min-w-0" onClick={closeSidebar}>
              <Image
                src="/images/avocat-logo-white-v1.png"
                alt="Avocat"
                width={32}
                height={32}
                className="h-8 w-8 flex-shrink-0"
              />
              {!isCollapsed && (
                <span className="ml-3 text-2xl font-bold tracking-wide text-text-on-dark whitespace-nowrap overflow-hidden">
                  AVOCAT
                </span>
              )}
            </Link>
            {onCollapseToggle && (
              <button
                onClick={onCollapseToggle}
                className="hidden lg:flex p-2 rounded-md text-text-on-dark hover:bg-hover/20"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? Icons.menu('h-5 w-5') : Icons.x('h-5 w-5')}
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {/* Abogados */}
            <div className="space-y-1">
              {isCollapsed ? (
                <Link
                  href="/dashboard"
                  className={`flex items-center justify-center w-full px-2 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark hover:bg-hover/20 ${
                    isPathActive(pathname, '/dashboard', ['/dashboard/casos', '/dashboard/directorio-clientes']) ? 'bg-hover/30' : ''
                  }`}
                  onClick={closeSidebar}
                  title="Abogados"
                >
                  {Icons.briefcase(iconCls)}
                </Link>
              ) : (
              <button
                onClick={() => toggleSection('abogados')}
                className={`flex items-center w-full px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark ${
                  isPathActive(pathname, '/dashboard', ['/dashboard/casos', '/dashboard/directorio-clientes'])
                    ? 'bg-hover/30'
                    : 'hover:bg-hover/20'
                }`}
              >
                {Icons.briefcase(iconCls)}
                <div className="flex-1 text-left ml-3">
                  <div className="font-medium">Abogados</div>
                </div>
                {Icons.chevronDown(`w-5 h-5 transition-transform ${expandedSections.abogados ? 'rotate-180' : ''}`)}
              </button>
              )}
              {expandedSections.abogados && !isCollapsed && (
                <div className="pl-4 space-y-1">
                  <Link href="/dashboard" className={`block ${getLinkClasses('/dashboard', true)}`} onClick={closeSidebar}>
                    {Icons.grid('w-4 h-4 mr-3')}
                    Dashboard
                  </Link>
                  <Link href="/dashboard/casos" className={`block ${getLinkClasses('/dashboard/casos', true)}`} onClick={closeSidebar}>
                    {Icons.folder('w-4 h-4 mr-3')}
                    Casos
                  </Link>
                  <Link href="/dashboard/directorio-clientes" className={`block ${getLinkClasses('/dashboard/directorio-clientes', true)}`} onClick={closeSidebar}>
                    {Icons.users('w-4 h-4 mr-3')}
                    Clientes
                  </Link>
                </div>
              )}
            </div>

            {/* Estudiantes */}
            <Link
              href="/dashboard/estudiantes"
              className={`flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark ${
                pathname?.includes('/dashboard/estudiantes') ? 'bg-hover/30 border-l-4 border-l-text-on-dark' : 'hover:bg-hover/20'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              onClick={closeSidebar}
              title={isCollapsed ? 'Estudiantes' : undefined}
            >
              {Icons.academicCap(iconCls)}
              {!isCollapsed && (
                <div className="flex-1 min-w-0 ml-3">
                  <div className="font-medium">Estudiantes</div>
                </div>
              )}
            </Link>

            {/* Autoservicio */}
            <div className="space-y-1">
              {isCollapsed ? (
                <Link
                  href="/dashboard/autoservicio/revision-email"
                  className={`flex items-center justify-center w-full px-2 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark hover:bg-hover/20 ${
                    pathname?.startsWith('/dashboard/autoservicio') || pathname?.includes('/dashboard/generar-escritos') || pathname?.includes('/dashboard/analisis-caso') ? 'bg-hover/30' : ''
                  }`}
                  onClick={closeSidebar}
                  title="Autoservicio"
                >
                  {Icons.clipboard(iconCls)}
                </Link>
              ) : (
              <button
                onClick={() => toggleSection('autoservicio')}
                className={`flex items-center w-full px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark ${
                  pathname?.startsWith('/dashboard/autoservicio') || pathname?.includes('/dashboard/generar-escritos') || pathname?.includes('/dashboard/analisis-caso')
                    ? 'bg-hover/30'
                    : 'hover:bg-hover/20'
                }`}
              >
                {Icons.clipboard(iconCls)}
                <div className="flex-1 text-left ml-3">
                  <div className="font-medium">Autoservicio</div>
                </div>
                {Icons.chevronDown(`w-5 h-5 transition-transform ${expandedSections.autoservicio ? 'rotate-180' : ''}`)}
              </button>
              )}
              {expandedSections.autoservicio && !isCollapsed && (
                <div className="pl-4 space-y-1">
                  <Link href="/dashboard/autoservicio/revision-email" className={`block ${getLinkClasses('/dashboard/autoservicio/revision-email', true)}`} onClick={closeSidebar}>
                    {Icons.mail('w-4 h-4 mr-3')}
                    Revisión de email
                  </Link>
                  <Link href="/dashboard/autoservicio/extraccion-datos" className={`block ${getLinkClasses('/dashboard/autoservicio/extraccion-datos', true)}`} onClick={closeSidebar}>
                    {Icons.database('w-4 h-4 mr-3')}
                    Extracción de datos
                  </Link>
                  <Link href="/dashboard/analisis-caso" className={`block ${getLinkClasses('/dashboard/analisis-caso', true)}`} onClick={closeSidebar}>
                    {Icons.search('w-4 h-4 mr-3')}
                    Análisis de documentos
                  </Link>
                  <Link href="/dashboard/autoservicio/generacion-escritos" className={`block ${getLinkClasses('/dashboard/autoservicio/generacion-escritos', true)}`} onClick={closeSidebar}>
                    {Icons.documentText('w-4 h-4 mr-3')}
                    Generación de Escritos
                  </Link>
                </div>
              )}
            </div>

            {isAdmin && adminChecked && (
              <Link
                href="/dashboard/administrador"
                className={`flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 text-text-on-dark ${
                  pathname?.includes('/dashboard/administrador') ? 'bg-hover/30 border-l-4 border-l-text-on-dark' : 'hover:bg-hover/20'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                onClick={closeSidebar}
                title={isCollapsed ? 'Administrador' : undefined}
              >
                {Icons.cog(iconCls)}
                {!isCollapsed && (
                <div className="flex-1 min-w-0 ml-3">
                  <div className="font-medium">Administrador</div>
                  <div className="text-sm text-text-on-dark">Panel de administración</div>
                </div>
                )}
              </Link>
            )}
          </nav>

          {user && (
            <div className={`p-4 border-t border-border/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-surface-muted rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-text-primary font-medium text-sm">
                    {(displayName || user.displayName)?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-on-dark truncate">
                      {displayName || user.displayName || user.email?.split('@')[0] || 'Usuario'}
                    </div>
                    <div className="text-xs text-text-on-dark truncate">{user.email}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-text-primary/50 lg:hidden" onClick={closeSidebar} aria-hidden="true" />
      )}
    </>
  );
}
