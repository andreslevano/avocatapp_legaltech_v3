'use client';

// Profile → Integraciones → DocuSign (Phase 1). Display info comes from users/{uid}.integrations
// (live via the AppShell user snapshot); tokens never reach the browser.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { canUseDocusign } from '@/lib/docusign/config';
import {
  disconnectDocusign, docusignInfo, selectDocusignAccount, startDocusignConnect,
} from '@/lib/docusign/client';
import { formatDate } from '@/components/documents/helpers';

const OUTCOMES: Record<string, { kind: 'ok' | 'error'; text: string }> = {
  connected:  { kind: 'ok',    text: 'DocuSign conectado correctamente.' },
  cancelled:  { kind: 'ok',    text: 'Conexión cancelada.' },
  no_account: { kind: 'error', text: 'Tu usuario de DocuSign no tiene ninguna cuenta asociada.' },
  error:      { kind: 'error', text: 'No pudimos conectar con DocuSign. Inténtalo de nuevo.' },
};

export default function ConnectDocusignCard() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const info = docusignInfo(userDoc);
  const [busy, setBusy] = useState<'' | 'connect' | 'switch' | 'account' | 'disconnect'>('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Outcome of the OAuth round-trip (?ds=…) → message, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ds = params.get('ds');
    if (!ds) return;
    setNotice(OUTCOMES[ds] ?? OUTCOMES.error);
    params.delete('ds');
    router.replace(`${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
  }, [router]);

  if (!canUseDocusign(userDoc.plan, user)) return null;

  const run = async (kind: typeof busy, fn: () => Promise<unknown>) => {
    setBusy(kind); setNotice(null);
    try { await fn(); }
    catch (err) { setNotice({ kind: 'error', text: (err as Error).message || OUTCOMES.error.text }); }
    finally { setBusy(''); }
  };

  const connect = (switchUser = false) =>
    run(switchUser ? 'switch' : 'connect', () => startDocusignConnect(user, { returnTo: '/settings/perfil', switchUser }));

  return (
    <div className="bg-bg border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-small font-sans font-semibold text-text-heading">DocuSign</p>
          <p className="text-caption font-sans text-text-muted mt-0.5">
            Firma electrónica: envía documentos a firmar desde Avocat con tu cuenta de DocuSign.
          </p>
        </div>
        {info && (
          <span className={`flex-shrink-0 px-2 py-0.5 rounded text-caption font-medium border ${info.status === 'reauth_required'
            ? 'bg-warning-subtle text-warning-text border-status-proximo-border'
            : 'bg-success-subtle text-success-text border-status-a-tiempo-border'}`}>
            {info.status === 'reauth_required' ? 'Reconexión necesaria' : 'Conectado'}
          </span>
        )}
      </div>

      {notice && (
        <p className={`text-caption font-sans ${notice.kind === 'ok' ? 'text-success-text' : 'text-danger-text'}`}>{notice.text}</p>
      )}

      {!info ? (
        <div className="space-y-2">
          <p className="text-caption font-sans text-text-muted">
            Necesitas una cuenta de DocuSign. Los sobres se envían desde tu cuenta y cuentan en tu plan de DocuSign.
          </p>
          <Button variant="accent" size="sm" loading={busy === 'connect'} onClick={() => connect()}>
            Conectar DocuSign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {info.status === 'reauth_required' && (
            <div className="rounded-lg bg-warning-subtle border border-status-proximo-border px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-caption text-warning-text">La conexión con DocuSign ha caducado.</span>
              <Button variant="accent" size="sm" loading={busy === 'connect'} onClick={() => connect()}>Reconectar</Button>
            </div>
          )}

          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-caption font-sans">
            <dt className="text-text-muted">Conectado como</dt>
            <dd className="text-text truncate">{info.name ? `${info.name} · ` : ''}{info.email}</dd>
            <dt className="text-text-muted">Cuenta</dt>
            <dd className="text-text truncate">
              {info.accounts.length > 1 ? (
                <select
                  value={info.accountId}
                  disabled={busy === 'account'}
                  onChange={e => run('account', () => selectDocusignAccount(user, e.target.value))}
                  className="bg-surface border border-border rounded-md px-2 py-1 text-caption text-text  focus:border-accent-border max-w-full"
                >
                  {info.accounts.map(a => (
                    <option key={a.accountId} value={a.accountId} className="bg-bg">
                      {a.accountName}{a.isDefault ? ' (predeterminada)' : ''}
                    </option>
                  ))}
                </select>
              ) : info.accountName}
            </dd>
            <dt className="text-text-muted">Desde</dt>
            <dd className="text-text">{formatDate(info.connectedAt)}</dd>
          </dl>

          {confirmDisconnect ? (
            <div className="rounded-lg border border-status-urgente-border bg-danger-subtle px-3 py-2.5 space-y-2">
              <p className="text-caption text-text">
                ¿Desconectar DocuSign? Los documentos firmados y su historial se mantienen en Avocat;
                los sobres ya enviados siguen su curso en DocuSign.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(false)}>Cancelar</Button>
                <Button variant="destructive" size="sm" loading={busy === 'disconnect'}
                  onClick={() => run('disconnect', async () => { await disconnectDocusign(user); setConfirmDisconnect(false); })}>
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" loading={busy === 'switch'} onClick={() => connect(true)}>
                Cambiar de cuenta
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(true)}>Desconectar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
