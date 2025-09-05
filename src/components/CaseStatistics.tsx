'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CaseStats {
  totalCases: number;
  urgentCases: number; // Less than 5 days
  onTimeCases: number;
  expiredCases: number;
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'red' | 'green' | 'orange';
  icon: React.ReactNode;
  percentage: number;
  onClick?: () => void;
}

export default function CaseStatistics() {
  const router = useRouter();
  const [stats, setStats] = useState<CaseStats>({
    totalCases: 0,
    urgentCases: 0,
    onTimeCases: 0,
    expiredCases: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseStats = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data representing case statistics
        setStats({
          totalCases: 1247,
          urgentCases: 89, // Cases with less than 5 days deadline
          onTimeCases: 1089, // Cases on time
          expiredCases: 69 // Cases that already expired
        });
      } catch (error) {
        console.error('Error fetching case statistics:', error);
        // Fallback data
        setStats({
          totalCases: 1200,
          urgentCases: 85,
          onTimeCases: 1050,
          expiredCases: 65
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCaseStats();
  }, []);

  const StatCard = ({ title, value, subtitle, color, icon, percentage, onClick }: StatCardProps) => {
    const colorClasses = {
      blue: {
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-600',
        iconBg: 'bg-blue-100',
        progress: 'bg-blue-500'
      },
      red: {
        bg: 'bg-gradient-to-br from-red-50 to-red-100',
        border: 'border-red-200',
        text: 'text-red-600',
        iconBg: 'bg-red-100',
        progress: 'bg-red-500'
      },
      green: {
        bg: 'bg-gradient-to-br from-green-50 to-green-100',
        border: 'border-green-200',
        text: 'text-green-600',
        iconBg: 'bg-green-100',
        progress: 'bg-green-500'
      },
      orange: {
        bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
        border: 'border-orange-200',
        text: 'text-orange-600',
        iconBg: 'bg-orange-100',
        progress: 'bg-orange-500'
      }
    };

    const colors = colorClasses[color];

    return (
      <div 
        className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
            {icon}
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${colors.text} mb-1`}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">del total</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            ) : (
              value.toLocaleString()
            )}
          </div>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`${colors.progress} h-2 rounded-full transition-all duration-1000 ease-out`}
            style={{ width: loading ? '0%' : `${percentage}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          Progreso del total de casos
        </div>
      </div>
    );
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Estadísticas de Casos
        </h2>
        <p className="text-gray-600">
          Resumen completo del estado de todos los casos en el sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Casos"
          value={stats.totalCases}
          subtitle="En el sistema"
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
          percentage={100}
        />

        <StatCard
          title="Casos Urgentes"
          value={stats.urgentCases}
          subtitle="Menos de 5 días"
          color="red"
          icon={
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          percentage={calculatePercentage(stats.urgentCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos-urgentes')}
        />

        <StatCard
          title="Casos a Tiempo"
          value={stats.onTimeCases}
          subtitle="En plazo normal"
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          percentage={calculatePercentage(stats.onTimeCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos-a-tiempo')}
        />

        <StatCard
          title="Casos Vencidos"
          value={stats.expiredCases}
          subtitle="Ya expirados"
          color="orange"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          percentage={calculatePercentage(stats.expiredCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos-vencidos')}
        />
      </div>

      {/* Visual Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Distribución de Casos</h3>
            <p className="text-sm text-gray-600">Visualización del estado actual</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
              ) : (
                stats.totalCases.toLocaleString()
              )}
            </div>
            <div className="text-sm text-gray-500">Total de casos</div>
          </div>
        </div>

        {/* Donut Chart Representation */}
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-1/2 mb-6 lg:mb-0">
            <div className="relative w-64 h-64 mx-auto">
              {/* Donut Chart SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                
                {/* On Time Cases (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.onTimeCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset="0"
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Urgent Cases (Red) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.urgentCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset={`-${calculatePercentage(stats.onTimeCases, stats.totalCases) * 2.51}`}
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Expired Cases (Orange) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.expiredCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset={`-${(calculatePercentage(stats.onTimeCases, stats.totalCases) + calculatePercentage(stats.urgentCases, stats.totalCases)) * 2.51}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-16 rounded mx-auto"></div>
                    ) : (
                      stats.totalCases.toLocaleString()
                    )}
                  </div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Casos a Tiempo</span>
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? '...' : stats.onTimeCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {loading ? '...' : calculatePercentage(stats.onTimeCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Casos Urgentes</span>
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? '...' : stats.urgentCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {loading ? '...' : calculatePercentage(stats.urgentCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Casos Vencidos</span>
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? '...' : stats.expiredCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {loading ? '...' : calculatePercentage(stats.expiredCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {loading ? '...' : calculatePercentage(stats.onTimeCases, stats.totalCases).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Eficiencia</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {loading ? '...' : calculatePercentage(stats.urgentCases + stats.expiredCases, stats.totalCases).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Atención Requerida</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
