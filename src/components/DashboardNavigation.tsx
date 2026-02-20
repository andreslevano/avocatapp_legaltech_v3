'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const checkAdminStatus = async () => {
      if (!user?.uid) {
        setIsAdmin(false);
        setAdminChecked(true);
        return;
      }

      try {
        console.log(`🔐 Checking admin status for UID: ${user.uid}`);
        
        // Query Firestore users collection for the user's isAdmin attribute
        const userDocRef = doc(db as any, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isAdminUser = userData.isAdmin === true;
          
          console.log(`📊 User data from Firestore:`, userData);
          console.log(`🔐 Admin check result for ${user.uid}: ${isAdminUser}`);
          
          setIsAdmin(isAdminUser);
        } else {
          console.log(`❌ User document not found in Firestore for UID: ${user.uid}`);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ Error checking admin status from Firestore:', error);
        setIsAdmin(false);
      } finally {
        setAdminChecked(true);
      }
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

  const getColorClasses = (isActive: boolean) => {
    if (isActive) {
      return 'bg-sidebar text-text-on-dark border-sidebar shadow-lg';
    }
    return 'bg-surface-muted/40 text-text-primary border-border hover:bg-hover/40 hover:border-border';
  };

  const getActiveBorderClasses = () => 'border-sidebar';

  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 lg:space-x-4 overflow-x-auto scrollbar-hide">
          {filteredPlans.map((plan) => {
            const isActive = pathname === plan.path;
            const colorClasses = getColorClasses(isActive);
            const activeBorderClasses = getActiveBorderClasses();
            
            return (
              <Link
                key={plan.id}
                href={plan.path}
                className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-3 px-2 sm:px-3 lg:px-4 border-b-2 transition-all duration-200 min-w-[80px] sm:min-w-[120px] lg:min-w-[160px] ${
                  isActive 
                    ? `${activeBorderClasses} text-text-primary font-semibold` 
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className={`w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md flex items-center justify-center text-sm sm:text-xs font-bold border-2 transition-all duration-200 ${colorClasses}`}>
                  {plan.icon}
                </div>
                <div className="text-center sm:text-left">
                  <span className={`text-xs sm:text-sm font-medium block ${
                    isActive ? 'text-text-primary' : 'text-text-secondary'
                  }`}>
                    {plan.name}
                  </span>
                  <p className={`text-xs hidden lg:block ${
                    isActive ? 'text-text-secondary' : 'text-text-secondary/80'
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
