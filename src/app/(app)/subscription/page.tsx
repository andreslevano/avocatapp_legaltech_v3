'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getBillingPortalEndpoint } from '@/lib/api-endpoints';

const PLAN_INFO: Record<string, { label: string; price: string; description: string; color: string }> = {
  Abogados: {
    label: 'Plan Abogados',
    price: '€75 / mes',
    description: 'Dashboard KPIs, gestión ilimitada de casos y clientes, generación ilimitada de escritos con IA.',
    color: 'text-accent-text',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    description: '44+ modelos de escritos académicos en 8 áreas del derecho español. Pago por documento.',
    color: 'text-success-text',
  },
  Autoservicio: {
    label: 'Plan Autoservicio',
    price: '€50 / mes',
    description: 'Agente IA en lenguaje llano + 100 créditos/mes para herramientas de análisis, generación y extracción.',
    color: 'text-info-text',
  },
};

export default function SubscriptionPage() {
  const { user, userDoc } = useAppAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = userDoc.plan;
  const planInfo = plan ? PLAN_INFO[plan] : null;
  const credits = userDoc.creditos_disponibles;

  async function openPortal() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(getBillingPortalEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          returnUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else if (data.error === 'no_stripe_customer') {
        setError('Tu cuenta fue activada manualmente. Para cancelar o cambiar el plan, escríbenos a hola@avocatapp.com.');
      } else {
        setError(data.error ?? 'Error al abrir el portal. Inténtalo de nuevo.');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Mi suscripción" subtitle="Gestiona tu plan, método de pago y facturas" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Current plan card */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-3">
              Plan actual
            </p>

            {planInfo ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <h2 className={`font-display text-2xl font-semibold ${planInfo.color}`}>
                    {planInfo.label}
                  </h2>
                  <span className="text-small font-sans text-text-muted">{planInfo.price}</span>
                </div>
                <p className="text-small font-sans text-text-muted leading-relaxed">
                  {planInfo.description}
                </p>

                {/* Credit balance — Autoservicio only */}
                {plan === 'Autoservicio' && typeof credits === 'number' && (
                  <div className="mt-4 bg-bg border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-0.5">
                        Créditos disponibles
                      </p>
                      <p className={`text-h3 font-display font-semibold ${credits <= 5 ? 'text-warning-text' : 'text-text-heading'}`}>
                        {credits}
                        <span className="text-caption font-sans text-text-muted ml-1">este mes</span>
                      </p>
                    </div>
                    {credits <= 10 && (
                      <span className="text-caption px-2 py-1 rounded-full bg-warning-subtle text-warning-text border border-status-proximo-border">
                        Saldo bajo — recarga desde Herramientas
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-small text-text-muted">Sin plan activo. Completa el onboarding para activar tu cuenta.</p>
            )}
          </div>

          {/* Portal card */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1">
                Portal de facturación (Stripe)
              </p>
              <p className="text-small text-text-muted leading-relaxed">
                Desde el portal puedes cancelar tu suscripción, cambiar de plan, actualizar el método de pago y descargar facturas.
              </p>
            </div>

            {error && (
              <p className="text-caption text-danger-text bg-danger-subtle border border-status-urgente-border rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="accent"
                size="md"
                loading={loading}
                onClick={openPortal}
              >
                Gestionar suscripción
              </Button>
              <Button
                variant="secondary"
                size="md"
                loading={loading}
                onClick={openPortal}
              >
                Cancelar plan
              </Button>
            </div>

            <p className="text-caption text-text-muted leading-relaxed">
              Serás redirigido al portal seguro de Stripe. Tras completar los cambios, volverás automáticamente a esta página.
            </p>
          </div>

          {/* Contact */}
          <p className="text-caption text-text-muted text-center">
            ¿Problemas con tu suscripción?{' '}
            <a href="mailto:hola@avocatapp.com" className="text-accent-text hover:underline">
              hola@avocatapp.com
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
