'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CrearCasoRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cases/new');
  }, [router]);
  return (
    <div className="min-h-screen bg-[#161410] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
    </div>
  );
}
