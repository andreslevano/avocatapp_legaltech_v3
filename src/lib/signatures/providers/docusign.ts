// DocuSign behind the SignatureProvider interface (secondary provider). Behaviour unchanged from
// before the abstraction: the same API calls, in the same places (go-live constraints D13b —
// envelope GET only in fetchStatus (manual refresh), combined download only in downloadSigned (filing)).

import { randomToken, sha256Base64Url } from '@/lib/integrations/crypto';
import { allowedEmbedOrigin, dsServerConfig, focusedViewHosts } from '@/lib/docusign/config';
import { buildEnvelopeDefinition, webhookUrlFor } from '@/lib/docusign/envelope';
import {
  createEnvelope, createRecipientView, DocusignApiError, downloadCombinedPdf, getEnvelopeWithRecipients,
  updateSignerAndResend, voidEnvelope,
} from '@/lib/docusign/api';
import { getValidAccessToken } from '@/lib/docusign/tokens';
import { recipientKey } from '../recipients';
import type { FocusedViewInfo } from '../types';
import type { SignatureProvider } from './types';

const fail = (message: string, code: string, status: number) => new DocusignApiError(message, code, status);

/** Recipient-view extras for Focused View when the page asked for it from an allowed origin. */
function focusedOptions(embedOrigin?: string | null) {
  const cfg = dsServerConfig();
  const origin = allowedEmbedOrigin(embedOrigin, cfg.appUrl);
  if (!origin) return { view: {}, focused: null as FocusedViewInfo | null };
  const hosts = focusedViewHosts(cfg.oauthBase);
  return {
    view: { frameAncestors: [origin, hosts.messageOrigin], messageOrigins: [hosts.messageOrigin] },
    focused: { integrationKey: cfg.integrationKey, bundleUrl: hosts.bundleUrl },
  };
}

const returnUrl = (requestId: string) => `${dsServerConfig().appUrl}/signatures/return?rid=${encodeURIComponent(requestId)}`;

export const docusignProvider: SignatureProvider = {
  id: 'docusign',

  async resolveOwner(uid) {
    const creds = await getValidAccessToken(uid);
    if (!creds.userEmail) throw fail('Reconecta tu cuenta de DocuSign.', 'reconnect_required', 409);
    return { name: creds.userName || creds.userEmail, email: creds.userEmail };
  },

  async createAndSend(c) {
    const creds = await getValidAccessToken(c.uid);
    const webhookToken = randomToken(32);
    const webhookUrl = webhookUrlFor(process.env.DOCUSIGN_WEBHOOK_BASE_URL, webhookToken);
    const { envelopeId } = await createEnvelope(creds, buildEnvelopeDefinition({
      html: c.html,
      documentName: c.title,
      subject: c.subject,
      message: c.message,
      owner: { ...c.owner, clientUserId: c.uid },
      signers: c.signers,
      cc: c.cc,
      signingOrder: c.signingOrder,
      options: c.options,
      requestId: c.requestId,
      webhookUrl,
    }));
    return { accountId: creds.accountId, envelopeId, webhookTokenHash: webhookUrl ? sha256Base64Url(webhookToken) : null };
  },

  async abandon(uid, refs, reason) {
    if (!refs.envelopeId) return;
    const creds = await getValidAccessToken(uid);
    await voidEnvelope(creds, refs.envelopeId, reason);
  },

  async ownerSigningSession(r, embedOrigin) {
    const creds = await getValidAccessToken(r.userId);
    const owner = r.recipients.find(x => x.role === 'owner');
    if (!owner || !r.envelopeId) throw fail('Solicitud de firma no válida.', 'invalid', 500);
    const fv = focusedOptions(embedOrigin);
    const { url } = await createRecipientView(creds, r.envelopeId, {
      name: owner.name, email: owner.email, clientUserId: r.userId, returnUrl: returnUrl(r.id), ...fv.view,
    });
    return { signingUrl: url, focused: fv.focused };
  },

  async remind(r, pending) {
    const creds = await getValidAccessToken(r.userId);
    await updateSignerAndResend(creds, r.envelopeId!,
      pending.map(c => ({ recipientId: String(recipientKey(c)), name: c.name, email: c.email })));
  },

  async updateSignerEmail(r, c, email, name) {
    const creds = await getValidAccessToken(r.userId);
    await updateSignerAndResend(creds, r.envelopeId!, [{ recipientId: String(recipientKey(c)), name, email }]);
    return 'updated';
  },

  async void(r, reason) {
    const creds = await getValidAccessToken(r.userId);
    await voidEnvelope(creds, r.envelopeId!, reason);
  },

  async fetchStatus(r) {
    const creds = await getValidAccessToken(r.userId);
    return getEnvelopeWithRecipients(creds, r.envelopeId!);
  },

  async downloadSigned(r) {
    const creds = await getValidAccessToken(r.userId);
    return { signedPdf: await downloadCombinedPdf(creds, r.envelopeId!), auditTrails: [] };
  },
};
