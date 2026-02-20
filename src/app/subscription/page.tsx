'use client';

import { useDashboardAuth } from '@/contexts/DashboardAuthContext';
import { useI18n } from '@/hooks/useI18n';

const PLANS = [
  { id: 'students', key: 'students' as const },
  { id: 'reclamacion', key: 'reclamacion' as const },
  { id: 'tutela', key: 'tutela' as const },
  { id: 'lawyers', key: 'lawyers' as const },
] as const;

export default function SubscriptionPage() {
  const user = useDashboardAuth();
  const { t } = useI18n();

  const handleCancelPlan = () => {
    // TODO: implement cancel plan flow
  };

  const handleUpgrade = () => {
    // TODO: implement upgrade flow
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-2">{t('subscription.title')}</h1>
        <p className="text-body text-text-secondary mb-8">{t('subscription.subtitle')}</p>

        {/* Plans description cards */}
        <div className="space-y-4">
          {PLANS.map(({ id, key }) => (
            <div
              key={id}
              className="bg-card overflow-hidden shadow rounded-lg border border-border"
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-surface-muted/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-text-primary font-bold text-lg">
                      {key === 'students' && 'E'}
                      {key === 'reclamacion' && 'R'}
                      {key === 'tutela' && 'T'}
                      {key === 'lawyers' && 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-h3 text-text-primary">
                      {t(`pricing.${key}.title`)}
                    </h3>
                    <p className="text-text-secondary mt-1">
                      {t(`pricing.${key}.description`)}
                    </p>
                    <p className="text-sm text-text-secondary mt-2 font-medium">
                      {t(`pricing.${key}.price`)} {t(`pricing.${key}.period`)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating circle buttons */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <div className="relative group">
          <button
            onClick={handleCancelPlan}
            title={t('subscription.cancelSubscription')}
            className="w-14 h-14 rounded-full bg-surface-muted/30 border border-border text-text-primary shadow-lg flex items-center justify-center hover:bg-surface-muted/50 transition-all"
            aria-label={t('subscription.cancelSubscription')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sidebar text-text-on-dark text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t('subscription.cancelSubscription')}
          </span>
        </div>
        <div className="relative group">
          <button
            onClick={handleUpgrade}
            title={t('subscription.updatePlan')}
            className="w-14 h-14 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-all"
            aria-label={t('subscription.updatePlan')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sidebar text-text-on-dark text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t('subscription.updatePlan')}
          </span>
        </div>
      </div>
    </div>
  );
}
