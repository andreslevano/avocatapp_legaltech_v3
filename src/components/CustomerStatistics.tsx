'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SpainMap from './SpainMap';

interface CustomerStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  clientsByCity: { city: string; count: number; percentage: number; x: number; y: number }[];
  clientsByProcedure: { procedure: string; count: number; percentage: number }[];
  averageCasesPerClient: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'red' | 'green' | 'orange' | 'purple';
  icon: React.ReactNode;
  percentage?: number;
  onClick?: () => void;
}

export default function CustomerStatistics() {
  const router = useRouter();
  const [stats, setStats] = useState<CustomerStats>({
    totalClients: 0,
    activeClients: 0,
    newClientsThisMonth: 0,
    clientsByCity: [],
    clientsByProcedure: [],
    averageCasesPerClient: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerStats = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data representing customer statistics in Spain
        setStats({
          totalClients: 156,
          activeClients: 89,
          newClientsThisMonth: 12,
          averageCasesPerClient: 2.3,
          clientsByCity: [
            { city: 'Madrid', count: 67, percentage: 42.9, x: 200, y: 120 },
            { city: 'Barcelona', count: 34, percentage: 21.8, x: 240, y: 100 },
            { city: 'Valencia', count: 28, percentage: 17.9, x: 220, y: 140 },
            { city: 'Sevilla', count: 15, percentage: 9.6, x: 180, y: 180 },
            { city: 'Otras', count: 12, percentage: 7.7, x: 160, y: 150 }
          ],
          clientsByProcedure: [
            { procedure: 'Derecho Civil', count: 45, percentage: 28.8 },
            { procedure: 'Derecho Laboral', count: 38, percentage: 24.4 },
            { procedure: 'Derecho Comercial', count: 32, percentage: 20.5 },
            { procedure: 'Derecho Penal', count: 25, percentage: 16.0 },
            { procedure: 'Derecho Familiar', count: 16, percentage: 10.3 }
          ]
        });
      } catch (error) {
        console.error('Error fetching customer statistics:', error);
        // Fallback data for Spain
        setStats({
          totalClients: 150,
          activeClients: 85,
          newClientsThisMonth: 10,
          averageCasesPerClient: 2.2,
          clientsByCity: [
            { city: 'Madrid', count: 65, percentage: 43.3, x: 200, y: 120 },
            { city: 'Barcelona', count: 32, percentage: 21.3, x: 240, y: 100 },
            { city: 'Valencia', count: 26, percentage: 17.3, x: 220, y: 140 },
            { city: 'Sevilla', count: 15, percentage: 10.0, x: 180, y: 180 },
            { city: 'Otras', count: 12, percentage: 8.0, x: 160, y: 150 }
          ],
          clientsByProcedure: [
            { procedure: 'Derecho Civil', count: 42, percentage: 28.0 },
            { procedure: 'Derecho Laboral', count: 36, percentage: 24.0 },
            { procedure: 'Derecho Comercial', count: 30, percentage: 20.0 },
            { procedure: 'Derecho Penal', count: 24, percentage: 16.0 },
            { procedure: 'Derecho Familiar', count: 18, percentage: 12.0 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerStats();
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
      },
      purple: {
        bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
        border: 'border-purple-200',
        text: 'text-purple-600',
        iconBg: 'bg-purple-100',
        progress: 'bg-purple-500'
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
          {percentage && (
            <div className="text-right">
              <div className={`text-sm font-medium ${colors.text} mb-1`}>
                {percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">activos</div>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            ) : (
              value
            )}
          </div>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>

        {percentage && (
          <>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`${colors.progress} h-2 rounded-full transition-all duration-1000 ease-out`}
                style={{ width: loading ? '0%' : `${percentage}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-gray-500">
              Progreso del total de clientes
            </div>
          </>
        )}
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
          Estadísticas de Clientes
        </h2>
        <p className="text-gray-600">
          Análisis detallado de la base de clientes y distribución geográfica
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Clientes"
          value={stats.totalClients}
          subtitle="En la base de datos"
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM7 10a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
          onClick={() => router.push('/dashboard/directorio-clientes')}
        />

        <StatCard
          title="Clientes Activos"
          value={stats.activeClients}
          subtitle="Con casos en curso"
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          percentage={calculatePercentage(stats.activeClients, stats.totalClients)}
        />

        <StatCard
          title="Nuevos Clientes"
          value={stats.newClientsThisMonth}
          subtitle="Este mes"
          color="purple"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        />

        <StatCard
          title="Promedio de Casos"
          value={`${stats.averageCasesPerClient}`}
          subtitle="Por cliente"
          color="orange"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Distribución por Ciudad</h3>
            <p className="text-sm text-gray-600">Clientes por ubicación geográfica en España</p>
          </div>

          {/* Desktop/Tablet Map View */}
          <div className="hidden md:block">
            <SpainMap cities={stats.clientsByCity} loading={loading} />
          </div>

          {/* Mobile Chart View */}
          <div className="md:hidden">
            <div className="space-y-4">
              {stats.clientsByCity.map((city, index) => (
                <div key={city.city} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-orange-500' :
                      index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">{city.city}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-bold text-gray-900">
                      {loading ? '...' : city.count}
                    </div>
                    <div className="text-sm text-gray-500 w-12 text-right">
                      {loading ? '...' : `${city.percentage.toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* City Bar Chart */}
            <div className="mt-6 space-y-2">
              {stats.clientsByCity.map((city, index) => (
                <div key={`bar-${city.city}`} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-600 text-right">{city.city}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-orange-500' :
                        index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                      style={{ width: loading ? '0%' : `${city.percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-8 text-xs text-gray-500 text-right">
                    {loading ? '...' : city.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Procedure Type Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipos de Procedimiento</h3>
            <p className="text-sm text-gray-600">Distribución por área legal</p>
          </div>

          <div className="space-y-4">
            {stats.clientsByProcedure.map((procedure, index) => (
              <div key={procedure.procedure} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-red-500' :
                    index === 1 ? 'bg-blue-500' :
                    index === 2 ? 'bg-green-500' :
                    index === 3 ? 'bg-orange-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">{procedure.procedure}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-bold text-gray-900">
                    {loading ? '...' : procedure.count}
                  </div>
                  <div className="text-sm text-gray-500 w-12 text-right">
                    {loading ? '...' : `${procedure.percentage.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Procedure Donut Chart */}
          <div className="mt-6 flex justify-center">
            <div className="relative w-48 h-48">
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
                
                {/* Procedure Segments */}
                {stats.clientsByProcedure.map((procedure, index) => {
                  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f97316', '#8b5cf6'];
                  const startAngle = stats.clientsByProcedure.slice(0, index).reduce((acc, p) => acc + p.percentage, 0);
                  const endAngle = startAngle + procedure.percentage;
                  
                  return (
                    <circle
                      key={procedure.procedure}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={colors[index]}
                      strokeWidth="8"
                      strokeDasharray={`${procedure.percentage * 2.51} 251`}
                      strokeDashoffset={`-${startAngle * 2.51}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  );
                })}
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-12 rounded mx-auto"></div>
                    ) : (
                      stats.totalClients
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Clientes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : calculatePercentage(stats.activeClients, stats.totalClients).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Clientes Activos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : stats.newClientsThisMonth}
            </div>
            <div className="text-sm text-gray-600">Nuevos Este Mes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : stats.averageCasesPerClient}
            </div>
            <div className="text-sm text-gray-600">Casos por Cliente</div>
          </div>
        </div>
      </div>
    </div>
  );
}
