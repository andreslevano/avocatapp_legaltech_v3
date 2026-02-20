'use client';

import { useState } from 'react';

interface AccountReactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  isLoading?: boolean;
}

export default function AccountReactivationModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  isLoading = false
}: AccountReactivationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-border w-96 shadow-lg rounded-md bg-card">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-surface-muted/30">
            <svg className="h-6 w-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mt-4">
            Cuenta Inactiva Encontrada
          </h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-text-secondary">
              Ya existe una cuenta con el email <strong>{userEmail}</strong>, pero está desactivada.
            </p>
            <div className="mt-4 p-4 bg-surface-muted/20 rounded-lg border border-border">
              <h4 className="text-sm font-medium text-text-primary mb-2">
                ¿Qué puedes hacer?
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-text-secondary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Reactivar tu cuenta existente
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-text-secondary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Mantener tu historial y datos
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-text-secondary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Acceder inmediatamente al dashboard
                </li>
              </ul>
            </div>
          </div>
          <div className="items-center px-4 py-3">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="btn-secondary px-4 py-2 text-base disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="btn-primary px-4 py-2 text-base disabled:opacity-50"
              >
                {isLoading ? 'Reactivando...' : 'Reactivar Cuenta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







