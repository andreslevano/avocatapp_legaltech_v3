'use client';

// "Firmar y enviar" for a document already saved in Avocat (Phase 5a: /documents, case detail,
// generación, agent). No markdown: the server signs the saved .doc. Counterparty defaults to the
// linked client (directly or via the case).

import type { DocumentRecord } from '@/lib/storage-client';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import { signatureTitleFromName } from '@/lib/signatures/eligibility';
import SignAndSendSheet from './SignAndSendSheet';

interface Props {
  doc: Pick<DocumentRecord, 'id' | 'name' | 'caseId' | 'clientId'>;
  clients?: ClientDoc[];
  cases?: CaseDoc[];
  counterparty?: { name: string; email: string };
  onClose: () => void;
}

export default function SignDocumentSheet({ doc, clients = [], cases = [], counterparty, onClose }: Props) {
  const clientId = doc.clientId ?? cases.find(c => c.id === doc.caseId)?.clientId;
  const client = clientId ? clients.find(c => c.id === clientId) : undefined;
  return (
    <SignAndSendSheet
      documentId={doc.id}
      title={signatureTitleFromName(doc.name)}
      defaultCounterparty={counterparty ?? { name: client?.name ?? '', email: client?.email ?? '' }}
      language="es"
      returnTo="/documents"
      onClose={onClose}
    />
  );
}
