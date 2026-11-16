'use client';

// "Avísame cuando esté disponible" — email + country (+ plan) → POST /api/waitlist (D6).
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { COUNTRIES, type CountryCode, type PricingPlanId } from '@/lib/pricing';
import { trackPricing } from '@/lib/pricing-analytics';

export default function WaitlistForm({ country, plan, compact = false }: { country: CountryCode; plan?: PricingPlanId; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const id = `waitlist-${plan ?? 'general'}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending'); setMessage('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, country, plan: plan ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'No se pudo guardar. Intenta de nuevo.');
      setState('done');
      trackPricing('waitlist_submit', { country, plan: plan ?? 'general' });
    } catch (err) {
      setState('error'); setMessage((err as Error).message);
    }
  };

  if (state === 'done') {
    return <p role="status" className="text-small text-success-text">Listo. Te escribiremos cuando abramos en {COUNTRIES[country].name}.</p>;
  }
  return (
    <form onSubmit={submit} className="space-y-2" noValidate={false}>
      <label htmlFor={id} className={compact ? 'sr-only' : 'block text-caption text-text-muted'}>
        Tu email para avisarte cuando esté disponible en {COUNTRIES[country].name}
      </label>
      <div className="flex gap-2">
        <input id={id} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 min-w-0 min-h-touch sm:min-h-0 bg-bg border border-border-strong rounded-lg px-3 py-2 text-small text-text" />
        <Button type="submit" variant="secondary" size="sm" loading={state === 'sending'}>Avísame</Button>
      </div>
      {state === 'error' && <p role="alert" className="text-caption text-danger-text">{message}</p>}
    </form>
  );
}
