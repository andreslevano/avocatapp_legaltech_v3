'use client';

import { useAppAuth } from '@/contexts/AppAuthContext';
import AppHeader from '@/components/layout/AppHeader';
import ReclamacionProcessSimple from '@/components/ReclamacionProcessSimple';
import PurchaseHistoryComponent from '@/components/PurchaseHistory';

// Moved from /dashboard/autoservicio/reclamacion-cantidades (DS v4 Phase 9). Auth now comes from the
// app shell (the legacy page read DashboardAuthContext, which that layout never provided).
export default function ReclamacionCantidadPage() {
  const { user } = useAppAuth();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AppHeader title="Reclamación de cantidades" subtitle="Escrito para reclamar salarios o cantidades adeudadas" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-10">
          <ReclamacionProcessSimple userId={user.uid} userEmail={user.email || undefined} />
          <PurchaseHistoryComponent userId={user.uid} documentType="reclamacion_cantidades" />
        </div>
      </div>
    </div>
  );
}
