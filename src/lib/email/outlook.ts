// Outlook mail through Microsoft Graph (read-only: GET only, Mail.Read). Uses the existing Microsoft
// connection (src/lib/integrations/microsoft): one connection for OneDrive/SharePoint and mail. Server-only.

import { ReconnectRequiredError } from '@/lib/integrations/microsoft/errors';
import type { EmailMessage, EmailMessageFull } from './core';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export class OutlookMailNotGranted extends Error {
  code = 'mail_not_granted';
  constructor() { super('Tu conexión de Microsoft aún no tiene permiso para leer el correo.'); }
}

async function get<T>(token: string, path: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, { method: 'GET', headers: { Authorization: `Bearer ${token}`, ...headers }, cache: 'no-store' });
  if (res.status === 401) throw new ReconnectRequiredError();
  if (res.status === 403) throw new OutlookMailNotGranted();
  if (!res.ok) throw new Error(`Graph ${path.split('?')[0]} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface GraphAddress { emailAddress?: { name?: string; address?: string } }
interface GraphMessage {
  id: string; conversationId?: string; subject?: string; from?: GraphAddress; toRecipients?: GraphAddress[];
  receivedDateTime?: string; bodyPreview?: string; hasAttachments?: boolean; body?: { contentType?: string; content?: string };
}

const addr = (a?: GraphAddress) => {
  const n = a?.emailAddress?.name, e = a?.emailAddress?.address;
  return n && e && n !== e ? `${n} <${e}>` : e ?? n ?? '';
};

const SELECT = 'id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments';

function toMessage(m: GraphMessage): EmailMessage {
  return {
    id: m.id, threadId: m.conversationId ?? m.id, subject: m.subject || '(Sin asunto)', from: addr(m.from),
    to: (m.toRecipients ?? []).map(addr).join(', '), date: m.receivedDateTime ?? '', snippet: m.bodyPreview ?? '',
    hasAttachments: !!m.hasAttachments,
  };
}

/** `search`: a KQL string (outlookSearch) or null for the inbox, newest first. */
export async function searchOutlook(token: string, search: string | null, max = 20): Promise<EmailMessage[]> {
  const top = Math.min(Math.max(max, 1), 50);
  const path = search
    ? `/me/messages?$search=${encodeURIComponent(search)}&$top=${top}&$select=${SELECT}`
    : `/me/mailFolders/inbox/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${SELECT}`;
  const r = await get<{ value?: GraphMessage[] }>(token, path);
  return (r.value ?? []).map(toMessage);
}

const ID_RE = /^[A-Za-z0-9_=+/-]{10,400}$/;

export async function fetchOutlookMessage(token: string, id: string): Promise<EmailMessageFull> {
  if (!ID_RE.test(id)) throw new Error('Identificador de email no válido.');
  const enc = encodeURIComponent(id);
  const [m, att] = await Promise.all([
    get<GraphMessage>(token, `/me/messages/${enc}?$select=${SELECT},body`, { Prefer: 'outlook.body-content-type="text"' }),
    get<{ value?: { name?: string; contentType?: string; size?: number }[] }>(token, `/me/messages/${enc}/attachments?$select=name,contentType,size`)
      .catch(() => ({ value: [] })),
  ]);
  return {
    ...toMessage(m),
    bodyText: (m.body?.content ?? '').replace(/\r\n/g, '\n').trim(),
    attachments: (att.value ?? []).map(a => ({ name: a.name ?? 'adjunto', mimeType: a.contentType ?? 'application/octet-stream', size: a.size ?? 0 })),
  };
}
