// URL helpers shared by OAuth integrations (Microsoft F1, DocuSign). Pure — client and server.

/** Only same-site relative paths ("/documents?folder=x"). Anything else → fallback. */
export function sanitizeReturnTo(raw: string | null | undefined, fallback = '/documents'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, 'https://placeholder.invalid');
    if (u.origin !== 'https://placeholder.invalid') return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** Appends query params to a relative path (keeps existing ones). */
export function withParams(path: string, params: Record<string, string>): string {
  const u = new URL(path, 'https://placeholder.invalid');
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname + u.search + u.hash;
}
