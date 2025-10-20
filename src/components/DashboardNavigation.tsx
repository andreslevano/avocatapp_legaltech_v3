'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';

interface DashboardNavigationProps {
  currentPlan: string;
  user?: User | null;
}

export default function DashboardNavigation({ currentPlan, user }: DashboardNavigationProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = () => {
      if (!user?.uid) {
        setIsAdmin(false);
        setAdminChecked(true);
        return;
      }

      // For now, hardcode admin UIDs since API routes don't work with static export
      const adminUIDs = [
        'jdwWMhOqVCggIRjLVBtxbvhOwPq1', // Your UID from Firestore
        'demo_admin_user'
      ];
      
      const isAdminUser = adminUIDs.includes(user.uid);
      setIsAdmin(isAdminUser);
      setAdminChecked(true);
      
      console.log(`🔐 Client-side admin check for ${user.uid}: ${isAdminUser}`);
    };

    checkAdminStatus();
  }, [user?.uid]);

  const plans = [
    {
      id: 'abogados',
      name: 'Abogados',
      path: '/dashboard',
      icon: 'A',
      color: 'primary',
      description: 'Panel completo para profesionales'
    },
    {
      id: 'estudiantes',
      name: 'Estudiantes',
      path: '/dashboard/estudiantes',
      icon: 'E',
      color: 'green',
      description: 'Plataforma de aprendizaje legal'
    },
    {
      id: 'reclamacion',
      name: 'Reclamación de Cantidades',
      path: '/dashboard/reclamacion-cantidades',
      icon: 'R',
      color: 'orange',
      description: 'Herramientas para reclamaciones'
    },
    {
      id: 'tutela',
      name: 'Acción de Tutela',
      path: '/dashboard/accion-tutela',
      icon: 'T',
      color: 'red',
      description: 'Gestión de tutelas en Colombia'
    },
    {
      id: 'administrador',
      name: 'Administrador',
      path: '/dashboard/administrador',
      icon: 'A',
      color: 'purple',
      description: 'Panel de administración del sistema'
    }
  ];

  // Filter plans based on admin status
  const filteredPlans = plans.filter(plan => {
    if (plan.id === 'administrador') {
      return isAdmin && adminChecked;
    }
    return true;
  });

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'primary':
          return 'bg-primary-600 text-white border-primary-600 shadow-lg';
        case 'green':
          return 'bg-green-600 text-white border-green-600 shadow-lg';
        case 'orange':
          return 'bg-orange-600 text-white border-orange-600 shadow-lg';
        case 'red':
          return 'bg-red-600 text-white border-red-600 shadow-lg';
        case 'purple':
          return 'bg-purple-600 text-white border-purple-600 shadow-lg';
        default:
          return 'bg-gray-600 text-white border-gray-600 shadow-lg';
      }
    } else {
      switch (color) {
        case 'primary':
          return 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:border-primary-300';
        case 'green':
          return 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300';
        case 'orange':
          return 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300';
        case 'red':
          return 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300';
        case 'purple':
          return 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 hover:border-purple-300';
        default:
          return 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300';
      }
    }
  };

  const getActiveBorderClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'border-primary-500';
      case 'green':
        return 'border-green-500';
      case 'orange':
        return 'border-orange-500';
      case 'red':
        return 'border-red-500';
      case 'purple':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 lg:space-x-4 overflow-x-auto scrollbar-hide">
          {filteredPlans.map((plan) => {
            const isActive = pathname === plan.path;
            const colorClasses = getColorClasses(plan.color, isActive);
            const activeBorderClasses = getActiveBorderClasses(plan.color);
            
            return (
              <Link
                key={plan.id}
                href={plan.path}
                className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-3 px-2 sm:px-3 lg:px-4 border-b-2 transition-all duration-200 min-w-[80px] sm:min-w-[120px] lg:min-w-[160px] ${
                  isActive 
                    ? `${activeBorderClasses} text-gray-900 font-semibold` 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className={`w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md flex items-center justify-center text-sm sm:text-xs font-bold border-2 transition-all duration-200 ${colorClasses}`}>
                  {plan.icon}
                </div>
                <div className="text-center sm:text-left">
                  <span className={`text-xs sm:text-sm font-medium block ${
                    isActive ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {plan.name}
                  </span>
                  <p className={`text-xs hidden lg:block ${
                    isActive ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {plan.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
