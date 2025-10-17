'use client';

import { useRouter } from 'next/navigation';

interface LawyerToolbarProps {
  position?: 'top' | 'bottom';
}

export default function LawyerToolbar({ position = 'top' }: LawyerToolbarProps) {
  const router = useRouter();

  const handleCreateCase = () => {
    router.push('/dashboard/crear-caso');
  };

  return (
    <div className={`w-full ${position === 'top' ? 'mb-8' : 'mt-8'}`}>
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Herramientas Profesionales
                  </h3>
                  <p className="text-sm text-blue-100">
                    Gestiona tus casos de manera eficiente
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={handleCreateCase}
                className="group relative bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                
                {/* Button content */}
                <div className="relative flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span>Crear Caso</span>
                </div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 -top-1 -left-1 w-6 h-6 bg-white/20 rounded-full transform scale-0 group-hover:scale-150 transition-transform duration-500"></div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>
    </div>
  );
}
