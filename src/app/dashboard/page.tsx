'use client';

import IndicatorCards from '@/components/IndicatorCards';
import CaseStatistics from '@/components/CaseStatistics';
import CustomerStatistics from '@/components/CustomerStatistics';
import { useI18n } from '@/hooks/useI18n';

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome Card */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-h3 text-text-primary mb-2">
              {t('dashboard.welcome')}
            </h3>
            <p className="text-body text-text-secondary">
              {t('dashboard.welcomeMessage')}
            </p>
          </div>
        </div>

        {/* Indicator Cards */}
        <IndicatorCards />

        {/* Case Statistics */}
        <CaseStatistics />

        {/* Customer Statistics */}
        <CustomerStatistics />
      </div>
    </div>
  );
}
