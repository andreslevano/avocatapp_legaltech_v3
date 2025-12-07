'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarProps {
  user?: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const pathname = usePathname();

  // Check admin status
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
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setAdminChecked(true);
      }
    };

    checkAdminStatus();
  }, [user]);

  const navigationItems = [
    {
      name: 'Abogados',
      href: '/dashboard',
      icon: 'A',
      iconColor: 'bg-blue-600',
      description: 'Panel completo para profesionales'
    },
    {
      name: 'Estudiantes',
      href: '/dashboard/estudiantes',
      icon: 'E',
      iconColor: 'bg-green-600',
      description: 'Plataforma de aprendizaje legal'
    },
    {
      name: 'Reclamación de Cantidades',
      href: '/dashboard/reclamacion-cantidades',
      icon: 'R',
      iconColor: 'bg-orange-600',
      description: 'Herramientas para reclamaciones'
    },
    {
      name: 'Acción de Tutela',
      href: '/dashboard/accion-tutela',
      icon: 'T',
      iconColor: 'bg-red-600',
      description: 'Gestión de tutelas en Colombia'
    }
  ];

  // Add Administrador if user is admin
  if (isAdmin && adminChecked) {
    navigationItems.push({
      name: 'Administrador',
      href: '/dashboard/administrador',
      icon: 'A',
      iconColor: 'bg-purple-600',
      description: 'Panel de administración del sistema'
    });
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        >
          <span className="sr-only">Open main menu</span>
          <svg
            className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Avocat</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={`w-8 h-8 ${item.iconColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                    <span className="text-white font-bold text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User profile */}
          {user && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                  <span className="text-gray-600 font-medium text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
