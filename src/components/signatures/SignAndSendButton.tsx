'use client';

import { useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { canUseDocusign } from '@/lib/docusign/config';
import SignAndSendSheet, { type SignAndSendSheetProps } from './SignAndSendSheet';

type Props = Omit<SignAndSendSheetProps, 'onClose'> & { autoOpen?: boolean; disabled?: boolean };

/** Plan/preview-gated entry point (D10); renders nothing for users without DocuSign. */
export default function SignAndSendButton({ autoOpen = false, disabled, ...sheet }: Props) {
  const { user, userDoc } = useAppAuth();
  const [open, setOpen] = useState(autoOpen);
  if (!canUseDocusign(userDoc.plan, user?.email)) return null;
  return (
    <>
      <Button variant="BtnGold" size="sm" disabled={disabled} onClick={() => setOpen(true)}>Firmar y enviar</Button>
      {open && <SignAndSendSheet {...sheet} onClose={() => setOpen(false)} />}
    </>
  );
}
