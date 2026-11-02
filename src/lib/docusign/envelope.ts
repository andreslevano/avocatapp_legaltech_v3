// Envelope definition for "Firmar y enviar" (D5, D7, D8). Pure — unit tested.

import { dateAnchor, signatureAnchor } from '@/lib/doc-html';
import type { SignatureOptions } from '@/lib/signatures/types';
import { planRecipients, type SigningOrder } from '@/lib/signatures/recipients';

/** Anchor offsets calibrated in DocuSign's tagger in Phase 0 (Sign on "Firma:", Date on "Fecha:"). */
export const TAB_OFFSETS = {
  signHere: { x: 20, y: 16 },
  dateSigned: { x: 20, y: 6 },
} as const;

export interface EnvelopeParty { name: string; email: string }

export interface EnvelopeInput {
  html: string;                 // buildDocHtml(..., { forSignature: true })
  documentName: string;
  subject: string;
  message: string;
  owner: EnvelopeParty & { clientUserId: string };   // embedded signer, routing 1
  signers: (EnvelopeParty & { accessCode?: string })[];  // remote signers (DocuSign emails them) — planRecipients
  cc?: EnvelopeParty[];
  signingOrder?: SigningOrder;
  options: SignatureOptions;
  requestId: string;
  webhookUrl: string | null;    // null in dev without a public HTTPS tunnel (D13c)
}

const tabsFor = (n: number) => ({
  signHereTabs: [{
    anchorString: signatureAnchor(n), anchorUnits: 'pixels',
    anchorXOffset: String(TAB_OFFSETS.signHere.x), anchorYOffset: String(TAB_OFFSETS.signHere.y),
    anchorIgnoreIfNotPresent: 'false', anchorMatchWholeWord: 'true',
  }],
  dateSignedTabs: [{
    anchorString: dateAnchor(n), anchorUnits: 'pixels',
    anchorXOffset: String(TAB_OFFSETS.dateSigned.x), anchorYOffset: String(TAB_OFFSETS.dateSigned.y),
    anchorIgnoreIfNotPresent: 'true', anchorMatchWholeWord: 'true',
  }],
});

/** Only an absolute https URL may receive Connect webhooks (localhost can't — D13c). */
export function webhookUrlFor(base: string | undefined, token: string): string | null {
  const b = (base ?? '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^/]+/i.test(b)) return null;
  return `${b}/api/signatures/webhook/${token}`;
}

export function buildEnvelopeDefinition(i: EnvelopeInput) {
  const lang = i.options.language;
  const cc = i.cc ?? [];
  const plan = planRecipients(i.signers.length, cc.length, i.signingOrder ?? 'sequential');
  const notice = {
    emailSubject: i.subject.trim().slice(0, 100),
    emailBody: i.message.trim().slice(0, 2000),
    supportedLanguage: lang,
  };
  const def: Record<string, unknown> = {
    status: 'sent',
    emailSubject: i.subject.trim().slice(0, 100),
    emailBlurb: i.message.trim().slice(0, 2000),
    documents: [{
      documentId: '1',
      name: i.documentName.slice(0, 100),
      fileExtension: 'html',
      documentBase64: Buffer.from(i.html, 'utf8').toString('base64'),
    }],
    recipients: {
      signers: [
        {
          recipientId: '1', routingOrder: '1',
          name: i.owner.name, email: i.owner.email,
          clientUserId: i.owner.clientUserId,           // embedded: DocuSign doesn't email the owner
          tabs: tabsFor(1),
        },
        ...i.signers.map((p, k) => ({
          recipientId: String(plan.signers[k].recipientId), routingOrder: String(plan.signers[k].routingOrder),
          name: p.name.trim(), email: p.email.trim(),
          tabs: tabsFor(plan.signers[k].recipientId),
          ...(p.accessCode ? { accessCode: p.accessCode } : {}),
          emailNotification: notice,
        })),
      ],
      carbonCopies: cc.map((p, j) => ({
        recipientId: String(plan.cc[j].recipientId), routingOrder: String(plan.cc[j].routingOrder),
        name: p.name.trim() || p.email.trim(), email: p.email.trim(),
        emailNotification: notice,
      })),
    },
    notification: {
      useAccountDefaults: 'false',
      reminders: {
        reminderEnabled: 'true',
        reminderDelay: String(i.options.reminderDelayDays),
        reminderFrequency: String(i.options.reminderFrequencyDays),
      },
      expirations: {
        expireEnabled: 'true',
        expireAfter: String(i.options.expireAfterDays),
        expireWarn: String(Math.min(3, Math.max(0, i.options.expireAfterDays - 1))),
      },
    },
    customFields: {
      textCustomFields: [{ name: 'avocatRequestId', value: i.requestId, show: 'false', required: 'false' }],
    },
  };
  if (i.webhookUrl) {
    // D8: envelope-level Connect; payload carries recipients so Phase 3 never re-fetches (D13b).
    def.eventNotification = {
      url: i.webhookUrl,
      requireAcknowledgment: 'true',
      loggingEnabled: 'true',
      deliveryMode: 'SIM',
      events: [
        'envelope-sent', 'envelope-delivered', 'envelope-completed', 'envelope-declined', 'envelope-voided',
        'recipient-delivered', 'recipient-completed', 'recipient-declined',
      ],
      eventData: { version: 'restv2.1', format: 'json', includeData: ['recipients'] },
    };
  }
  return def;
}
