'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PlanCards from '@/components/auth/PlanCards';
import type { Plan } from '@/components/auth/PlanCards';
import { Button } from '@/components/ui/Button';

const PLAN_DASHBOARDS: Record<Plan, string> = {
  Abogados: '/dashboard',
  Estudiantes: '/dashboard/estudiantes',
  Autoservicio: '/dashboard/autoservicio/revision-email',
};

interface OnboardingStepProps {
  uid: string;
  displayName: string;
}

export default function OnboardingStep({ uid, displayName }: OnboardingStepProps) {
  const [plan, setPlan] = useState<Plan | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleConfirm = async () => {
    if (!plan) return setError('Selecciona un plan para continuar.');
    setError('');
    setIsLoading(true);

    try {
      if (db) {
        await updateDoc(doc(db, 'users', uid), {
          plan,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        });
      }
      router.push(PLAN_DASHBOARDS[plan]);
    } catch (err) {
      console.error('Error saving plan:', err);
      setError('Error al guardar el plan. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-avocat-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-avocat-gold font-sans font-medium text-small mb-2">Bienvenido, {displayName}</p>
          <h1 className="font-display text-h2 text-avocat-black">¿Cómo usarás Avocat?</h1>
          <p className="text-small text-avocat-gray5 mt-2">
            Elige el plan que mejor se adapte a ti. Podrás cambiarlo más adelante.
          </p>
        </div>

        <div className="space-y-4">
          <PlanCards selected={plan} onChange={setPlan} />

          {error && (
            <p className="text-small text-red-600">{error}</p>
          )}

          <Button
            variant="BtnGold"
            size="lg"
            fullWidth
            loading={isLoading}
            onClick={handleConfirm}
            disabled={!plan}
          >
            {isLoading ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
