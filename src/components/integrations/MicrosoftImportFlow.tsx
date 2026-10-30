'use client';

// Entry point for "Importar desde OneDrive / SharePoint": explainer → Microsoft sign-in (first time
// or reconnect) → File Picker → (step 3: import options sheet). Spike: shows what was picked.

import { useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { microsoftInfo, startMicrosoftConnect } from '@/lib/integrations/microsoft/client';
import MicrosoftConnectModal from './MicrosoftConnectModal';
import MicrosoftPicker, { type PickedItem } from './MicrosoftPicker';

interface Props {
  returnTo: string;          // relative path to come back to after sign-in
  folderId?: string | null;
  caseId?: string | null;
  onClose: () => void;
}

export default function MicrosoftImportFlow({ returnTo, folderId, caseId, onClose }: Props) {
  const { user, userDoc } = useAppAuth();
  const info = microsoftInfo(userDoc);
  const needsConnect = !info || info.status === 'reauth_required';
  const [step, setStep] = useState<'connect' | 'picker' | 'picked'>(needsConnect ? 'connect' : 'picker');
  const [reconnect, setReconnect] = useState(info?.status === 'reauth_required');
  const [picked, setPicked] = useState<PickedItem[]>([]);

  const connect = () => startMicrosoftConnect(user, { returnTo, intent: 'import', folderId, caseId });

  if (step === 'connect' || !info) {
    return <MicrosoftConnectModal reconnect={reconnect} onContinue={connect} onClose={onClose} />;
  }

  if (step === 'picker') {
    return (
      <MicrosoftPicker
        info={info}
        onClose={onClose}
        onReconnect={() => { setReconnect(true); setStep('connect'); }}
        onPick={items => {
          if (process.env.NODE_ENV !== 'production') console.info('[ms-picker] picked', items);
          setPicked(items); setStep('picked');
        }}
      />
    );
  }

  // TODO(F1 step 3): replace with ImportOptionsSheet (preview route, destination, structure, duplicates).
  return (
    <ModalShell title={`${picked.length} elemento${picked.length !== 1 ? 's' : ''} seleccionado${picked.length !== 1 ? 's' : ''}`} onClose={onClose} sheetOnMobile>
      <ul className="max-h-[50vh] overflow-y-auto space-y-1 text-[12px]">
        {picked.map(p => (
          <li key={`${p.parentReference.driveId}:${p.id}`} className="flex items-center gap-2 text-[#c8c0ac]">
            <span>{p.folder ? '📁' : '📄'}</span>
            <span className="truncate flex-1">{p.name ?? p.id}</span>
            <span className="text-[10px] text-[#3a3630] truncate max-w-[40%]">{p['@sharePoint.endpoint'] ?? 'onedrive'}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[#6b6050]">La importación se añade en el siguiente paso.</p>
      <div className="flex justify-end gap-2">
        <Button variant="BtnGhost" size="sm" onClick={() => setStep('picker')}>Volver al selector</Button>
        <Button variant="BtnGold" size="sm" onClick={onClose}>Cerrar</Button>
      </div>
    </ModalShell>
  );
}
