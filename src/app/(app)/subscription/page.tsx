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
    color: 'text-avocat-gold',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    description: '44+ modelos de escritos académicos en 8 áreas del derecho español. Pago por documento.',
    color: 'text-emerald-400',
  },
  Autoservicio: {
    label: 'Plan Autoservicio',
    price: '€50 / mes',
    description: 'Agente IA en lenguaje llano + 100 créditos/mes para herramientas de análisis, generación y extracción.',
    color: 'text-blue-400',
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
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-6">
            <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
              Plan actual
            </p>

            {planInfo ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <h2 className={`font-display text-2xl font-semibold ${planInfo.color}`}>
                    {planInfo.label}
                  </h2>
                  <span className="text-[13px] font-sans text-[#6b6050]">{planInfo.price}</span>
                </div>
                <p className="text-[13px] font-sans text-[#9a9a9a] leading-relaxed">
                  {planInfo.description}
                </p>

                {/* Credit balance — Autoservicio only */}
                {plan === 'Autoservicio' && typeof credits === 'number' && (
                  <div className="mt-4 bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-0.5">
                        Créditos disponibles
                      </p>
                      <p className={`text-[22px] font-display font-semibold ${credits <= 5 ? 'text-amber-400' : 'text-[#e8d4a0]'}`}>
                        {credits}
                        <span className="text-[12px] font-sans text-[#6b6050] ml-1">este mes</span>
                      </p>
                    </div>
                    {credits <= 10 && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Saldo bajo — recarga desde Herramientas
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#6b6050]">Sin plan activo. Completa el onboarding para activar tu cuenta.</p>
            )}
          </div>

          {/* Portal card */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-6 space-y-4">
            <div>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">
                Portal de facturación (Stripe)
              </p>
              <p className="text-[13px] text-[#9a9a9a] leading-relaxed">
                Desde el portal puedes cancelar tu suscripción, cambiar de plan, actualizar el método de pago y descargar facturas.
              </p>
            </div>

            {error && (
              <p className="text-[12px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="BtnGold"
                size="md"
                loading={loading}
                onClick={openPortal}
              >
                Gestionar suscripción
              </Button>
              <Button
                variant="BtnOutlineDark"
                size="md"
                loading={loading}
                onClick={openPortal}
              >
                Cancelar plan
              </Button>
            </div>

            <p className="text-[11px] text-[#3a3630] leading-relaxed">
              Serás redirigido al portal seguro de Stripe. Tras completar los cambios, volverás automáticamente a esta página.
            </p>
          </div>

          {/* Contact */}
          <p className="text-[11px] text-[#6b6050] text-center">
            ¿Problemas con tu suscripción?{' '}
            <a href="mailto:hola@avocatapp.com" className="text-avocat-gold hover:underline">
              hola@avocatapp.com
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
