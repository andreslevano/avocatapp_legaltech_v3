'use client';

import { useDashboardAuth } from '@/contexts/DashboardAuthContext';
import ReclamacionProcessSimple from '@/components/ReclamacionProcessSimple';
import PurchaseHistoryComponent from '@/components/PurchaseHistory';

export default function AutoservicioReclamacionPage() {
  const user = useDashboardAuth();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-8">
          Panel de Reclamación de Cantidades
        </h1>
        <div className="bg-card overflow-hidden shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-h3 text-text-primary mb-2">¡Bienvenido a Avocat para Reclamaciones!</h3>
            <p className="text-body text-text-secondary">
              Gestiona tus reclamaciones de cantidades de manera eficiente con herramientas especializadas en derecho mercantil y civil.
            </p>
          </div>
        </div>
        <ReclamacionProcessSimple userId={user?.uid} userEmail={user?.email || undefined} />
        <div className="mt-12">
          <PurchaseHistoryComponent userId={user?.uid || 'demo_user'} documentType="reclamacion_cantidades" />
        </div>
      </div>
    </div>
  );
}
