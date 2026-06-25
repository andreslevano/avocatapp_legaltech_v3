// Server-side Gmail OAuth2 + API helpers

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
  email: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

export function getOAuthUrl(nonce: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type:   'offline',
    prompt:        'consent',
    state:         nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  });
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number; error?: string };
  if (data.error) throw new Error(data.error);
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json() as { access_token: string; expires_in: number; error?: string };
  if (data.error) throw new Error(`refresh_failed: ${data.error}`);
  return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

export async function getGmailUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as { email?: string };
  return data.email ?? '';
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
}

export interface GmailMessageFull extends GmailMessage {
  bodyText: string;
  attachments: { name: string; mimeType: string; size: number }[];
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractBodyText(payload: GmailPayload): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBodyText(part);
      if (nested) return nested;
    }
  }
  return '';
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  filename?: string;
}

interface GmailApiMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailPayload[];
  };
}

export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults = 20,
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const listRes = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await listRes.json() as { messages?: { id: string; threadId: string }[]; error?: { message: string } };
  if (listData.error) throw new Error(listData.error.message);
  const ids = listData.messages ?? [];
  if (!ids.length) return [];

  const messages = await Promise.all(
    ids.slice(0, 20).map(async ({ id }) => {
      const msgRes = await fetch(`${GMAIL_API}/users/me/messages/${id}?format=METADATA&metadataHeaders=Subject,From,To,Date`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const msg = await msgRes.json() as GmailApiMessage;
      const headers = msg.payload?.headers ?? [];
      const hasAttachments = !!(msg.payload?.parts?.some(p => p.filename && p.filename.length > 0));
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader(headers, 'Subject') || '(Sin asunto)',
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        date: getHeader(headers, 'Date'),
        snippet: msg.snippet ?? '',
        hasAttachments,
      } satisfies GmailMessage;
    })
  );
  return messages;
}

export async function fetchFullMessage(accessToken: string, messageId: string): Promise<GmailMessageFull> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=FULL`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const msg = await res.json() as GmailApiMessage & {
    payload?: GmailApiMessage['payload'] & { parts?: (GmailPayload & { filename?: string; body?: { size?: number; data?: string }; mimeType?: string })[] };
  };
  const headers = msg.payload?.headers ?? [];
  const hasAttachments = !!(msg.payload?.parts?.some((p) => p.filename && p.filename.length > 0));
  const attachments = (msg.payload?.parts ?? [])
    .filter((p) => p.filename && p.filename.length > 0)
    .map((p) => ({
      name: p.filename!,
      mimeType: p.mimeType ?? 'application/octet-stream',
      size: p.body?.size ?? 0,
    }));

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: getHeader(headers, 'Subject') || '(Sin asunto)',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    date: getHeader(headers, 'Date'),
    snippet: msg.snippet ?? '',
    hasAttachments,
    bodyText: msg.payload ? extractBodyText(msg.payload as GmailPayload) : '',
    attachments,
  };
}
