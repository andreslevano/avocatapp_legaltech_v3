/**
 * Client-side helper: deducts 1 credit from an Autoservicio subscriber before a tool operation.
 * Returns { ok: true, remaining: N } on success, { ok: false } when credits are exhausted.
 * Non-Autoservicio users always receive { ok: true, remaining: -1 } (unlimited).
 */
export async function consumirCredito(
  idToken: string,
  descripcion: string,
): Promise<{ ok: boolean; remaining: number; error?: string }> {
  try {
    const res = await fetch('/api/creditos/consumir', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ descripcion }),
    });
    return await res.json();
  } catch {
    // Network error — fail open so a transient outage doesn't block the tool
    return { ok: true, remaining: -1 };
  }
}
