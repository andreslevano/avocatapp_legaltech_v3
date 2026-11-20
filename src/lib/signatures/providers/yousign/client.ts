// Minimal Yousign v3 HTTP client (plain fetch, D2-style: no SDK). Server-only.
// Rate limits (sandbox 30/min · 200/h, prod 60/min · 1,200/h): no retries in loops, no polling.

import { DocusignApiError as ProviderApiError } from '@/lib/docusign/api';
import { ysConfig } from './config';

export { ProviderApiError };

function friendly(status: number, detail: string): ProviderApiError {
  if (status === 401 || status === 403) return new ProviderApiError('La firma electrónica no está bien configurada en Avocat (Yousign). Avísanos.', 'provider_auth', 502);
  if (status === 404) return new ProviderApiError('La solicitud de firma ya no existe en Yousign.', 'not_found', 404);
  if (status === 429) return new ProviderApiError('Demasiadas solicitudes de firma seguidas. Espera un minuto y vuelve a intentarlo.', 'rate_limited', 429);
  if (status === 400 || status === 422) return new ProviderApiError(`Yousign no aceptó la solicitud: ${detail}`.slice(0, 300), 'invalid_request', 422);
  return new ProviderApiError('No pudimos comunicar con Yousign. Inténtalo de nuevo en unos minutos.', 'provider_error', 502);
}

export async function ys<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const cfg = ysConfig();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${cfg.apiKey}`, ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), Accept: 'application/json' },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = '';
    try { const j = JSON.parse(text); detail = j.detail || j.title || j.message || ''; } catch { detail = text.slice(0, 200); }
    console.warn('[yousign]', method, path.replace(/[0-9a-f-]{36}/g, ':id'), res.status, detail.slice(0, 200));
    throw friendly(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Binary download (signed PDF, audit trail). */
export async function ysBinary(path: string): Promise<{ bytes: Buffer; contentType: string }> {
  const cfg = ysConfig();
  const res = await fetch(`${cfg.apiBase}${path}`, { headers: { Authorization: `Bearer ${cfg.apiKey}` }, cache: 'no-store' });
  if (!res.ok) {
    console.warn('[yousign] download', path.replace(/[0-9a-f-]{36}/g, ':id'), res.status);
    throw friendly(res.status, '');
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? '' };
}
