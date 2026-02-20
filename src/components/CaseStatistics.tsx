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
        bg: 'bg-surface-muted/20',
        border: 'border-border',
        text: 'text-text-primary',
        iconBg: 'bg-surface-muted/50',
        progress: 'bg-sidebar'
      },
      red: {
        bg: 'bg-surface-muted/25',
        border: 'border-border',
        text: 'text-text-primary',
        iconBg: 'bg-surface-muted/60',
        progress: 'bg-text-primary'
      },
      green: {
        bg: 'bg-surface-muted/15',
        border: 'border-border',
        text: 'text-text-primary',
        iconBg: 'bg-surface-muted/40',
        progress: 'bg-text-secondary'
      },
      orange: {
        bg: 'bg-surface-muted/30',
        border: 'border-border',
        text: 'text-text-primary',
        iconBg: 'bg-surface-muted/55',
        progress: 'bg-hover'
      }
    };

    const colors = colorClasses[color];

    return (
      <div 
        className={`${colors.bg} ${colors.border} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center text-text-primary`}>
            {icon}
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${colors.text} mb-1`}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-text-secondary">del total</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium text-text-secondary mb-2">{title}</h3>
          <div className="text-3xl font-bold text-text-primary mb-1">
            {loading ? (
              <div className="animate-pulse bg-surface-muted h-8 w-20 rounded"></div>
            ) : (
              value.toLocaleString()
            )}
          </div>
          <p className="text-sm text-text-secondary">{subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-muted/50 rounded-full h-2 mb-2">
          <div 
            className={`${colors.progress} h-2 rounded-full transition-all duration-1000 ease-out`}
            style={{ width: loading ? '0%' : `${percentage}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-text-secondary">
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
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Estadísticas de Casos
        </h2>
        <p className="text-text-secondary">
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
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          percentage={calculatePercentage(stats.urgentCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos?expand=urgent')}
        />

        <StatCard
          title="Casos a Tiempo"
          value={stats.onTimeCases}
          subtitle="En plazo normal"
          color="green"
          icon={
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          percentage={calculatePercentage(stats.onTimeCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos?expand=on-time')}
        />

        <StatCard
          title="Casos Vencidos"
          value={stats.expiredCases}
          subtitle="Ya expirados"
          color="orange"
          icon={
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          percentage={calculatePercentage(stats.expiredCases, stats.totalCases)}
          onClick={() => router.push('/dashboard/casos?expand=expired')}
        />
      </div>

      {/* Visual Chart Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Distribución de Casos</h3>
            <p className="text-sm text-text-secondary">Visualización del estado actual</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
              ) : (
                stats.totalCases.toLocaleString()
              )}
            </div>
            <div className="text-sm text-text-secondary">Total de casos</div>
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
                  stroke="#E8E8E8"
                  strokeWidth="8"
                />
                
                {/* On Time Cases */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#1E1E1E"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.onTimeCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset="0"
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Urgent Cases */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#5F5F5F"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.urgentCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset={`-${calculatePercentage(stats.onTimeCases, stats.totalCases) * 2.51}`}
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Expired Cases */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#9A9A9A"
                  strokeWidth="8"
                  strokeDasharray={`${calculatePercentage(stats.expiredCases, stats.totalCases) * 2.51} 251`}
                  strokeDashoffset={`-${(calculatePercentage(stats.onTimeCases, stats.totalCases) + calculatePercentage(stats.urgentCases, stats.totalCases)) * 2.51}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    {loading ? (
                      <div className="animate-pulse bg-surface-muted h-6 w-16 rounded mx-auto"></div>
                    ) : (
                      stats.totalCases.toLocaleString()
                    )}
                  </div>
                  <div className="text-sm text-text-secondary">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-text-primary rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-secondary">Casos a Tiempo</span>
                  <span className="text-sm font-bold text-text-primary">
                    {loading ? '...' : stats.onTimeCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  {loading ? '...' : calculatePercentage(stats.onTimeCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-text-secondary rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-secondary">Casos Urgentes</span>
                  <span className="text-sm font-bold text-text-primary">
                    {loading ? '...' : stats.urgentCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  {loading ? '...' : calculatePercentage(stats.urgentCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-border rounded-full"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-secondary">Casos Vencidos</span>
                  <span className="text-sm font-bold text-text-primary">
                    {loading ? '...' : stats.expiredCases.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  {loading ? '...' : calculatePercentage(stats.expiredCases, stats.totalCases).toFixed(1)}% del total
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-text-primary">
                    {loading ? '...' : calculatePercentage(stats.onTimeCases, stats.totalCases).toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-secondary">Eficiencia</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-text-primary">
                    {loading ? '...' : calculatePercentage(stats.urgentCases + stats.expiredCases, stats.totalCases).toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-secondary">Atención Requerida</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
