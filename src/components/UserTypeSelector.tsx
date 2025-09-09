'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UserTypeSelectorProps {
  currentType?: string;
}

export default function UserTypeSelector({ currentType = 'abogados' }: UserTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState(currentType);

  const userTypes = [
    {
      id: 'abogados',
      name: 'Abogados',
      description: 'Panel completo para profesionales del derecho',
      icon: '👨‍💼',
      color: 'blue',
      href: '/dashboard'
    },
    {
      id: 'estudiantes',
      name: 'Estudiantes',
      description: 'Plataforma de aprendizaje legal',
      icon: '🎓',
      color: 'green',
      href: '/dashboard/estudiantes'
    },
    {
      id: 'reclamacion',
      name: 'Reclamación de Cantidades',
      description: 'Herramientas para reclamaciones monetarias',
      icon: '💰',
      color: 'orange',
      href: '/dashboard/reclamacion-cantidades'
    },
    {
      id: 'accion-tutela',
      name: 'Acción de Tutela',
      description: 'Gestión de tutelas en Colombia',
      icon: '⚖️',
      color: 'red',
      href: '/dashboard/accion-tutela'
    }
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    const baseClasses = 'border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer';
    
    if (isSelected) {
      switch (color) {
        case 'blue':
          return `${baseClasses} border-blue-500 bg-blue-50 shadow-lg`;
        case 'green':
          return `${baseClasses} border-green-500 bg-green-50 shadow-lg`;
        case 'orange':
          return `${baseClasses} border-orange-500 bg-orange-50 shadow-lg`;
        case 'red':
          return `${baseClasses} border-red-500 bg-red-50 shadow-lg`;
        default:
          return `${baseClasses} border-gray-500 bg-gray-50 shadow-lg`;
      }
    } else {
      return `${baseClasses} border-gray-200 bg-white hover:border-gray-300`;
    }
  };

  const getIconBgColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'orange':
        return 'bg-orange-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona tu Área de Trabajo</h2>
        <p className="text-gray-600">Elige el tipo de usuario que mejor se adapte a tus necesidades</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userTypes.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <Link
              key={type.id}
              href={type.href}
              className={getColorClasses(type.color, isSelected)}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="text-center">
                <div className={`w-16 h-16 ${getIconBgColor(type.color)} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <span className="text-white text-2xl">{type.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                
                {isSelected && (
                  <div className="mt-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ✓ Seleccionado
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 text-sm">ℹ️</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">¿No estás seguro?</h4>
            <p className="text-sm text-gray-600 mt-1">
              Puedes cambiar tu tipo de usuario en cualquier momento desde tu perfil. 
              Cada área tiene herramientas especializadas para diferentes necesidades legales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
