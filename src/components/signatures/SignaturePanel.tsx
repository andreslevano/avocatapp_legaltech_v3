'use client';

// Signature status, timeline and actions for one request (Phase 3) — shown in the /documents
// preview panel. Live via onSnapshot; DocuSign is only called on explicit button clicks.

import { useEffect, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import {
  correctSignatureEmail, getSigningUrl, refreshSignature, remindSignature, voidSignature, watchSignatureRequest,
} from '@/lib/signatures/client';
import {
  EMAIL_RE, isActiveStatus, signatureEventLabel, SIGNATURE_STATUS_LABEL,
  type SignatureRecipient, type SignatureRequest,
} from '@/lib/signatures/types';

const RECIPIENT_LABEL: Record<SignatureRecipient['status'], string> = {
  created: 'En espera', sent: 'Enviado', delivered: 'Abierto', completed: 'Firmado', declined: 'Rechazado',
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

type Busy = null | 'refresh' | 'remind' | 'void' | 'email' | 'sign';

export default function SignaturePanel({ requestId }: { requestId: string }) {
  const { user } = useAppAuth();
  const [r, setR] = useState<SignatureRequest | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  useEffect(() => watchSignatureRequest(requestId, setR), [requestId]);
  useEffect(() => { setNotice(null); setEditEmail(null); setConfirmVoid(false); }, [requestId]);

  if (!r) return null;
  const active = isActiveStatus(r.status);
  const waitingOnOther = r.status === 'sent' || r.status === 'delivered';
  const counterparty = r.recipients.find(x => x.role === 'signer');

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<string | void>) => {
    if (!user) return;
    setBusy(kind); setNotice(null);
    try {
      const msg = await fn();
      if (msg) setNotice({ kind: 'ok', text: msg });
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message || 'No se pudo completar la acción.' });
    } finally {
      setBusy(null);
    }
  };

  const onRefresh = () => run('refresh', async () => {
    const res = await refreshSignature(user!, r.id);
    if (res.throttled && res.nextRefreshAt) {
      const mins = Math.max(1, Math.ceil((Date.parse(res.nextRefreshAt) - Date.now()) / 60000));
      return `Estado consultado hace poco. Podrás volver a consultarlo en ${mins} min (los cambios llegan solos).`;
    }
    return `Estado actualizado: ${SIGNATURE_STATUS_LABEL[res.status]}.`;
  });
  const onRemind = () => run('remind', async () => {
    await remindSignature(user!, r.id);
    return `Recordatorio enviado a ${counterparty?.email}.`;
  });
  const onVoid = () => run('void', async () => {
    await voidSignature(user!, r.id);
    setConfirmVoid(false);
    return 'Solicitud anulada. El documento vuelve a ser editable.';
  });
  const onEmail = () => run('email', async () => {
    const email = (editEmail ?? '').trim();
    if (!EMAIL_RE.test(email)) throw new Error('El email no es válido.');
    await correctSignatureEmail(user!, r.id, email);
    setEditEmail(null);
    return `Email corregido. DocuSign ha reenviado la solicitud a ${email}.`;
  });
  const onSign = () => run('sign', async () => {
    const { signingUrl } = await getSigningUrl(user!, r.id);
    window.location.href = signingUrl;
  });

  const events = [...(r.events ?? [])].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="border-t border-[#2e2b20] px-4 py-3 flex-shrink-0 bg-[#1a1812] space-y-2.5 max-h-[45vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[#3a3630] uppercase tracking-widest font-semibold text-[9px]">Firma DocuSign</p>
        {active && (
          <button onClick={onRefresh} disabled={busy !== null}
            className="text-[10px] text-[#6b6050] hover:text-avocat-gold disabled:opacity-50 transition-colors">
            {busy === 'refresh' ? 'Consultando…' : 'Actualizar estado'}
          </button>
        )}
      </div>

      {/* Signers */}
      <ul className="space-y-1">
        {r.recipients.filter(x => x.role !== 'cc').map(x => (
          <li key={x.routingOrder} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-[#c8c0ac]" title={x.email}>
              {x.routingOrder}. {x.role === 'owner' ? 'Tú' : x.name} <span className="text-[#6b6050]">· {x.email}</span>
            </span>
            <span className={`flex-shrink-0 text-[10px] ${x.status === 'completed' ? 'text-blue-400' : x.status === 'declined' ? 'text-red-400' : 'text-[#6b6050]'}`}>
              {RECIPIENT_LABEL[x.status]}
            </span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      {r.status === 'pending_owner' && (
        <Button variant="BtnGold" size="sm" fullWidth disabled={busy !== null} onClick={onSign}>
          {busy === 'sign' ? 'Abriendo DocuSign…' : 'Continuar firma'}
        </Button>
      )}
      {waitingOnOther && editEmail === null && (
        <div className="flex gap-2">
          <Button variant="BtnOutlineDark" size="sm" fullWidth disabled={busy !== null} onClick={onRemind}>
            {busy === 'remind' ? 'Enviando…' : 'Recordar'}
          </Button>
          <Button variant="BtnOutlineDark" size="sm" fullWidth disabled={busy !== null} onClick={() => setEditEmail(counterparty?.email ?? '')}>
            Corregir email
          </Button>
        </div>
      )}
      {editEmail !== null && (
        <div className="space-y-1.5">
          <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} autoFocus
            className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8c0ac] focus:outline-none focus:border-avocat-gold" />
          <div className="flex gap-2">
            <Button variant="BtnGold" size="sm" fullWidth disabled={busy !== null} onClick={onEmail}>
              {busy === 'email' ? 'Reenviando…' : 'Guardar y reenviar'}
            </Button>
            <Button variant="BtnGhost" size="sm" disabled={busy !== null} onClick={() => setEditEmail(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      {active && (confirmVoid ? (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#c8c0ac] flex-1">¿Anular la solicitud? Nadie podrá firmarla.</span>
          <button onClick={onVoid} disabled={busy !== null} className="text-red-400 hover:text-red-300 font-medium">
            {busy === 'void' ? 'Anulando…' : 'Anular'}
          </button>
          <button onClick={() => setConfirmVoid(false)} className="text-[#6b6050] hover:text-[#c8c0ac]">No</button>
        </div>
      ) : (
        <button onClick={() => setConfirmVoid(true)} disabled={busy !== null}
          className="block text-[10px] text-[#3a3630] hover:text-red-400 transition-colors">
          Anular solicitud de firma
        </button>
      ))}

      {notice && (
        <p className={`text-[11px] ${notice.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{notice.text}</p>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <ol className="space-y-1 border-l border-[#2e2b20] pl-2.5">
          {events.map((e, i) => (
            <li key={`${e.type}-${e.at}-${i}`} className="text-[10px] leading-snug">
              <span className="text-[#c8c0ac]">{signatureEventLabel(e)}</span>
              <span className="text-[#3a3630]"> · {fmt(e.at)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
