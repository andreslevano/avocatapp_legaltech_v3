'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';

/** Pre-redirect explainer (F1 Stage 1). Copy is fixed by the plan. */
export default function MicrosoftConnectModal({ onContinue, onClose, reconnect = false }: {
  onContinue: () => Promise<void>;
  onClose: () => void;
  reconnect?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    setLoading(true); setError('');
    try { await onContinue(); }
    catch { setError('No pudimos conectar con Microsoft'); setLoading(false); }
  };

  return (
    <ModalShell title={reconnect ? 'Reconecta tu cuenta de Microsoft' : 'Conectar con Microsoft'} onClose={onClose}>
      <p className="text-[13px] text-[#c8c0ac]">Avocat abrirá el inicio de sesión de Microsoft.</p>
      <ul className="space-y-1.5 text-[12px] text-[#c8c0ac]">
        <li className="flex gap-2"><span className="text-emerald-400">✓</span>Solo importamos los archivos que tú selecciones</li>
        <li className="flex gap-2"><span className="text-emerald-400">✓</span>Nunca modificamos ni borramos nada en tu OneDrive</li>
        <li className="flex gap-2"><span className="text-emerald-400">✓</span>Puedes desconectar cuando quieras.</li>
      </ul>
      <p className="text-[11px] text-[#6b6050] leading-relaxed">
        Microsoft te pedirá permiso para «leer los archivos a los que tienes acceso»: es necesario para que puedas elegirlos desde Avocat.
      </p>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="BtnGold" size="sm" loading={loading} onClick={go}>Continuar</Button>
      </div>
    </ModalShell>
  );
}
