'use client';

import { useEffect, useState } from 'react';

interface IndicatorCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  source: 'avocat' | 'web';
}

interface WebData {
  activeCases: number;
  newCasesToday: number;
  averageResolutionTime: number;
}

export default function IndicatorCards() {
  const [webData, setWebData] = useState<WebData>({
    activeCases: 0,
    newCasesToday: 0,
    averageResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);

  // Mock data for Avocat statistics
  const avocatStats = {
    totalDocuments: 47,
    activeCases: 12,
    clientsServed: 28
  };

  // Simulate fetching web data about legal cases in Colombia
  useEffect(() => {
    const fetchWebData = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data representing current legal landscape in Colombia
        setWebData({
          activeCases: 1247, // Active legal cases in the system
          newCasesToday: 23, // New cases filed today
          averageResolutionTime: 18 // Average resolution time in months
        });
      } catch (error) {
        console.error('Error fetching web data:', error);
        // Fallback data
        setWebData({
          activeCases: 1200,
          newCasesToday: 20,
          averageResolutionTime: 18
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWebData();
  }, []);

  const IndicatorCard = ({ title, value, subtitle, icon, color, trend, source }: IndicatorCardProps) => {
    return (
      <div className="bg-card rounded-lg border-2 border-border text-text-primary p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-muted/50 flex items-center justify-center text-text-secondary">
                {icon}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-small font-medium text-text-secondary uppercase tracking-wide">
                  {title}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  source === 'avocat' 
                    ? 'bg-surface-muted text-text-primary' 
                    : 'bg-hover/50 text-text-primary'
                }`}>
                  {source === 'avocat' ? 'Avocat' : 'Web'}
                </span>
              </div>
            </div>
            <div className="text-h2 font-bold text-text-primary mb-1">
              {loading && source === 'web' ? (
                <div className="animate-pulse bg-surface-muted h-8 w-16 rounded"></div>
              ) : (
                value
              )}
            </div>
            {subtitle && (
              <p className="text-body text-text-secondary">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span className="text-small font-medium text-text-primary">
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-small text-text-secondary ml-1">vs mes anterior</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* Avocat Data Cards */}
      <IndicatorCard
        title="Documentos Analizados"
        value={avocatStats.totalDocuments}
        subtitle="Total procesados con IA"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        color="blue"
        trend={{ value: 12, isPositive: true }}
        source="avocat"
      />

      <IndicatorCard
        title="Casos Activos"
        value={avocatStats.activeCases}
        subtitle="En seguimiento actual"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        }
        color="green"
        trend={{ value: 8, isPositive: true }}
        source="avocat"
      />

      <IndicatorCard
        title="Tiempo Promedio"
        value={`${webData.averageResolutionTime} meses`}
        subtitle="Resolución de casos"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="purple"
        source="web"
      />
    </div>
  );
}
