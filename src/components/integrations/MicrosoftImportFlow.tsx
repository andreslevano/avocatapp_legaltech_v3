'use client';

// Entry point for "Importar desde OneDrive / SharePoint": explainer → Microsoft sign-in (first time
// or reconnect) → File Picker → import options + progress (ImportOptionsSheet).

import { useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { microsoftInfo, startMicrosoftConnect } from '@/lib/integrations/microsoft/client';
import MicrosoftConnectModal from './MicrosoftConnectModal';
import MicrosoftPicker, { type PickedItem } from './MicrosoftPicker';
import ImportOptionsSheet from './ImportOptionsSheet';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import type { DocumentRecord } from '@/lib/storage-client';

interface Props {
  returnTo: string;          // relative path to come back to after sign-in
  folderId?: string | null;
  caseId?: string | null;
  folderLabel?: string;
  cases?: CaseDoc[];
  clients?: ClientDoc[];
  onImported?: (docs: DocumentRecord[]) => void;
  onClose: () => void;
}

export default function MicrosoftImportFlow({ returnTo, folderId, caseId, folderLabel, cases = [], clients = [], onImported, onClose }: Props) {
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

  return (
    <ImportOptionsSheet
      items={picked.map(p => ({ driveId: p.parentReference.driveId, itemId: p.id }))}
      folderId={folderId}
      folderLabel={folderLabel}
      caseId={caseId}
      cases={cases}
      clients={clients}
      onBack={() => { setPicked([]); setStep('picker'); }}
      onClose={onClose}
      onImported={docs => onImported?.(docs)}
    />
  );
}
