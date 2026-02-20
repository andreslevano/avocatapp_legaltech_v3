'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { deactivateUserAccount } from '@/lib/user-management';

interface AccountDeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

export default function AccountDeactivationModal({
  isOpen,
  onClose,
  user,
  onSuccess
}: AccountDeactivationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  const requiredConfirmText = 'ELIMINAR MI CUENTA';

  const handleDeactivate = async () => {
    if (confirmText !== requiredConfirmText || !confirmCheckbox) {
      setError('Debes confirmar la eliminación de tu cuenta');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deactivateUserAccount(user);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Error inesperado al desactivar la cuenta');
      console.error('Deactivation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setConfirmText('');
      setConfirmCheckbox(false);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-surface-muted/30 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Desactivar Cuenta</h3>
              <p className="text-sm text-text-secondary">Acción irreversible</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-text-secondary hover:text-text-secondary disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="bg-surface-muted/30 border border-border rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-text-primary">¿Estás seguro?</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    Esta acción desactivará tu cuenta y eliminará todos tus datos de forma permanente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">¿Qué sucederá?</h4>
              <ul className="text-sm text-text-secondary space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-text-secondary mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Tu cuenta será desactivada en el sistema de autenticación
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-text-secondary mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Se eliminarán todos tus documentos generados
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-text-secondary mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Se eliminará tu historial de casos y análisis
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-text-secondary mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Se eliminarán tus datos de analytics y estadísticas
                </li>
              </ul>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Para confirmar, escribe: <span className="font-bold text-text-primary">{requiredConfirmText}</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input-field w-full px-3 py-2"
                placeholder={requiredConfirmText}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="confirm-checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-1 h-4 w-4 text-sidebar focus:ring-sidebar border-border rounded"
                disabled={isLoading}
              />
              <label htmlFor="confirm-checkbox" className="ml-2 text-sm text-text-secondary">
                Entiendo que esta acción es irreversible y eliminará permanentemente todos mis datos.
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-surface-muted/30 border border-border rounded-md">
              <p className="text-sm text-text-primary">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeactivate}
            disabled={isLoading || confirmText !== requiredConfirmText || !confirmCheckbox}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Desactivando...
              </div>
            ) : (
              'Desactivar Cuenta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
