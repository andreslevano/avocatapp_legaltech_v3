'use client';

// Failed payment, still inside the 7-day grace: a warning on every app page with a way to fix it.
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { UserDoc } from '@/lib/auth';
import { accessForUserDoc } from '@/lib/billing/access';

export default function PaymentGraceBanner({ userDoc }: { userDoc: UserDoc }) {
  const a = accessForUserDoc(userDoc as unknown as Record<string, unknown>);
  if (!a.allowed || !a.grace) return null;
  const until = new Date(a.grace.until).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 bg-warning-subtle border-b border-border text-body-sm text-warning-text">
      <AlertTriangle size={16} aria-hidden className="shrink-0" />
      <span>No pudimos cobrar tu suscripción. Actualiza tu método de pago antes del <strong>{until}</strong> para no perder el acceso.</span>
      <Link href="/settings/suscripcion" className="font-medium underline underline-offset-2">Actualizar pago</Link>
    </div>
  );
}
