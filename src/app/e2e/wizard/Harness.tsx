'use client';

import { useSearchParams } from 'next/navigation';
import ReclamacionProcessSimple from '@/components/ReclamacionProcessSimple';
import TutelaProcessSimple from '@/components/TutelaProcessSimple';

export default function WizardHarness() {
  const q = useSearchParams();
  const theme = q?.get('theme') === 'light' ? 'light' : 'dark';
  return (
    <div data-theme={theme} className="min-h-screen bg-bg p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {q?.get('proc') === 'tutela' ? <TutelaProcessSimple /> : <ReclamacionProcessSimple />}
      </div>
    </div>
  );
}
