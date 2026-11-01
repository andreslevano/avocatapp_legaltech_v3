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

  if (!canUseDocusign(userDoc.plan, user?.email)) return null;

  const run = async (kind: typeof busy, fn: () => Promise<unknown>) => {
    setBusy(kind); setNotice(null);
    try { await fn(); }
    catch (err) { setNotice({ kind: 'error', text: (err as Error).message || OUTCOMES.error.text }); }
    finally { setBusy(''); }
  };

  const connect = (switchUser = false) =>
    run(switchUser ? 'switch' : 'connect', () => startDocusignConnect(user, { returnTo: '/profile', switchUser }));

  return (
    <div className="bg-[#161410] border border-[#2e2b20] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-sans font-semibold text-[#e8d4a0]">DocuSign</p>
          <p className="text-[11px] font-sans text-[#6b6050] mt-0.5">
            Firma electrónica: envía documentos a firmar desde Avocat con tu cuenta de DocuSign.
          </p>
        </div>
        {info && (
          <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${info.status === 'reauth_required'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {info.status === 'reauth_required' ? 'Reconexión necesaria' : 'Conectado'}
          </span>
        )}
      </div>

      {notice && (
        <p className={`text-[12px] font-sans ${notice.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{notice.text}</p>
      )}

      {!info ? (
        <div className="space-y-2">
          <p className="text-[11px] font-sans text-[#6b6050]">
            Necesitas una cuenta de DocuSign. Los sobres se envían desde tu cuenta y cuentan en tu plan de DocuSign.
          </p>
          <Button variant="BtnGold" size="sm" loading={busy === 'connect'} onClick={() => connect()}>
            Conectar DocuSign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {info.status === 'reauth_required' && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-[12px] text-amber-400">La conexión con DocuSign ha caducado.</span>
              <Button variant="BtnGold" size="sm" loading={busy === 'connect'} onClick={() => connect()}>Reconectar</Button>
            </div>
          )}

          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[12px] font-sans">
            <dt className="text-[#6b6050]">Conectado como</dt>
            <dd className="text-[#c8c0ac] truncate">{info.name ? `${info.name} · ` : ''}{info.email}</dd>
            <dt className="text-[#6b6050]">Cuenta</dt>
            <dd className="text-[#c8c0ac] truncate">
              {info.accounts.length > 1 ? (
                <select
                  value={info.accountId}
                  disabled={busy === 'account'}
                  onChange={e => run('account', () => selectDocusignAccount(user, e.target.value))}
                  className="bg-[#1e1c16] border border-[#2e2b20] rounded-md px-2 py-1 text-[12px] text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 max-w-full"
                >
                  {info.accounts.map(a => (
                    <option key={a.accountId} value={a.accountId} className="bg-[#161410]">
                      {a.accountName}{a.isDefault ? ' (predeterminada)' : ''}
                    </option>
                  ))}
                </select>
              ) : info.accountName}
            </dd>
            <dt className="text-[#6b6050]">Desde</dt>
            <dd className="text-[#c8c0ac]">{formatDate(info.connectedAt)}</dd>
          </dl>

          {confirmDisconnect ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 space-y-2">
              <p className="text-[12px] text-[#c8c0ac]">
                ¿Desconectar DocuSign? Los documentos firmados y su historial se mantienen en Avocat;
                los sobres ya enviados siguen su curso en DocuSign.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="BtnGhost" size="sm" onClick={() => setConfirmDisconnect(false)}>Cancelar</Button>
                <Button variant="BtnGold" size="sm" loading={busy === 'disconnect'}
                  className="!bg-red-500/80 hover:!bg-red-500 !border-red-500/30"
                  onClick={() => run('disconnect', async () => { await disconnectDocusign(user); setConfirmDisconnect(false); })}>
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="BtnOutlineGold" size="sm" loading={busy === 'switch'} onClick={() => connect(true)}>
                Cambiar de cuenta
              </Button>
              <Button variant="BtnGhost" size="sm" onClick={() => setConfirmDisconnect(true)}>Desconectar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
