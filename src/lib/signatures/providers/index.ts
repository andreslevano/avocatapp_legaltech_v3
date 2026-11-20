// Provider lookup. Server-only. Existing requests always use the provider they were created with.
import { docusignProvider } from './docusign';
import type { ProviderId, SignatureProvider } from './types';

const PROVIDERS: Partial<Record<ProviderId, SignatureProvider>> = { docusign: docusignProvider };

export function providerFor(id: ProviderId | undefined): SignatureProvider {
  const p = PROVIDERS[id ?? 'docusign'];
  if (!p) throw new Error(`Signature provider not available: ${id}`);
  return p;
}


export type { ProviderId, SignatureProvider } from './types';
