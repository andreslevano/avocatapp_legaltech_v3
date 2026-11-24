// The assistant's long calls (digest, reply) go straight to Cloud Run from the browser to avoid
// Firebase Hosting's ~60 s proxy limit (same pattern as /api/agent-v2). Auth is the ID token.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export function withCors<T extends Response>(res: T): T {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}
