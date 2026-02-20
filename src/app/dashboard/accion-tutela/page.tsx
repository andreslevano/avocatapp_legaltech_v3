'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccionTutelaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/autoservicio/accion-tutela');
  }, [router]);
  return (
    <div className="min-h-screen bg-app flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar"></div>
    </div>
  );
}
