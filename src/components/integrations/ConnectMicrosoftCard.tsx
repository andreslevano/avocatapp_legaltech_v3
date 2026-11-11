'use client';

// Perfil → Integraciones → Microsoft (F1 stage 6): account, organisation, imported files,
// Cambiar de cuenta / Desconectar. Disconnecting keeps every imported file in Avocat.

import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { disconnectMicrosoft, microsoftInfo, startMicrosoftConnect } from '@/lib/integrations/microsoft/client';

const fmt = (ts: unknown) => {
  const s = (ts as { seconds?: number } | null)?.seconds;
  const d = s ? new Date(s * 1000) : typeof ts === 'string' ? new Date(ts) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
};

export default function ConnectMicrosoftCard() {
  const { user, userDoc } = useAppAuth();
  const info = microsoftInfo(userDoc);
  const [imported, setImported] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | 'connect' | 'disconnect'>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const ms = new URLSearchParams(window.location.search).get('ms');
    if (ms === 'connected') setNotice({ kind: 'ok', text: 'Cuenta de Microsoft conectada.' });
    else if (ms === 'cancelled') setNotice({ kind: 'ok', text: 'Conexión cancelada.' });
    else if (ms === 'error') setNotice({ kind: 'err', text: 'No pudimos conectar con Microsoft. Inténtalo de nuevo.' });
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    getCountFromServer(query(collection(db, 'documents'), where('userId', '==', user.uid), where('source', '==', 'microsoft')))
      .then(s => setImported(s.data().count)).catch(() => setImported(null));
  }, [user, info?.email]);

  const connect = async () => {
    if (!user) return;
    setBusy('connect');
    try { await startMicrosoftConnect(user, { returnTo: '/settings/perfil', intent: 'connect' }); }
    catch (e) { setNotice({ kind: 'err', text: (e as Error).message }); setBusy(null); }
  };
  const disconnect = async () => {
    if (!user) return;
    setBusy('disconnect');
    try {
      await disconnectMicrosoft(user);
      setConfirming(false);
      setNotice({ kind: 'ok', text: 'Cuenta desconectada. Los archivos importados siguen en Avocat.' });
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-bg border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-small font-sans font-semibold text-text-heading">Microsoft OneDrive / SharePoint</p>
          <p className="text-caption font-sans text-text-muted mt-0.5">
            Importa documentos de tu OneDrive o de SharePoint. Solo lectura: Avocat nunca modifica ni borra nada allí.
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

      {notice && <p className={`text-caption font-sans ${notice.kind === 'ok' ? 'text-success-text' : 'text-danger-text'}`}>{notice.text}</p>}

      {!info ? (
        <Button variant="accent" size="sm" loading={busy === 'connect'} onClick={connect}>Conectar con Microsoft</Button>
      ) : (
        <>
          <div className="text-caption font-sans text-text space-y-0.5">
            <p>{info.email}{info.accountType === 'work' && info.tenantName ? ` · ${info.tenantName} (Microsoft 365)` : info.accountType === 'personal' ? ' · cuenta personal' : ''}</p>
            <p className="text-caption text-text-muted">
              {fmt(info.connectedAt) ? `Conectado el ${fmt(info.connectedAt)}` : 'Conectado'}
              {imported !== null ? ` · ${imported} ${imported === 1 ? 'archivo importado' : 'archivos importados'}` : ''}
            </p>
          </div>
          {confirming ? (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-caption text-text">
                {imported ? `Los ${imported} archivos importados seguirán en Avocat. ` : ''}Ya no podrás importar desde OneDrive o SharePoint hasta que vuelvas a conectar.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" loading={busy === 'disconnect'} onClick={disconnect}>Desconectar</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant={info.status === 'reauth_required' ? 'accent' : 'secondary'} size="sm" loading={busy === 'connect'} onClick={connect}>
                {info.status === 'reauth_required' ? 'Reconectar' : 'Cambiar de cuenta'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>Desconectar</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
