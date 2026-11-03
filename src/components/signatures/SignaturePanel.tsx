'use client';

// Signature status, timeline and actions for one request (Phase 3) — shown in the /documents
// preview panel. Live via onSnapshot; DocuSign is only called on explicit button clicks.

import { useEffect, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getDocumentById } from '@/lib/storage-client';
import { Button } from '@/components/ui/Button';
import {
  correctSignatureEmail, getSigningUrl, openOwnerSigning, refreshSignature, remindSignature, voidSignature, watchSignatureRequest,
} from '@/lib/signatures/client';
import {
  EMAIL_RE, isActiveStatus, signatureEventLabel, SIGNATURE_STATUS_LABEL,
  type SignatureRecipient, type SignatureRequest,
} from '@/lib/signatures/types';
import { recipientKey } from '@/lib/signatures/recipients';

const RECIPIENT_LABEL: Record<SignatureRecipient['status'], string> = {
  created: 'En espera', sent: 'Enviado', delivered: 'Abierto', completed: 'Firmado', declined: 'Rechazado',
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

type Busy = null | 'refresh' | 'remind' | 'void' | 'email' | 'sign' | 'open';

export default function SignaturePanel({ requestId }: { requestId: string }) {
  const { user } = useAppAuth();
  const [r, setR] = useState<SignatureRequest | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<{ key: number; email: string } | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  useEffect(() => watchSignatureRequest(requestId, setR), [requestId]);
  useEffect(() => { setNotice(null); setEditing(null); setConfirmVoid(false); }, [requestId]);

  if (!r) return null;
  const active = isActiveStatus(r.status);
  const waitingOnOther = r.status === 'sent' || r.status === 'delivered';
  const pending = r.recipients.filter(x => x.role === 'signer' && (x.status === 'sent' || x.status === 'delivered'));
  const canCorrect = (x: SignatureRecipient) => waitingOnOther && x.role === 'signer' && x.status !== 'completed' && x.status !== 'declined';
  const needsFiling = r.status === 'completed' && !r.signedDocumentId;

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
    return needsFiling ? 'Reintentando guardar el PDF firmado…' : `Estado actualizado: ${SIGNATURE_STATUS_LABEL[res.status]}.`;
  });
  const onOpenSigned = () => run('open', async () => {
    // Open the tab synchronously (popup blockers), then point it at the file.
    const w = window.open('', '_blank');
    const rec = r.signedDocumentId ? await getDocumentById(r.signedDocumentId) : null;
    if (!rec) { w?.close(); throw new Error('No encontramos el PDF firmado.'); }
    if (w) w.location.href = rec.downloadUrl; else window.location.href = rec.downloadUrl;
  });
  const onRemind = () => run('remind', async () => {
    const res = await remindSignature(user!, r.id);
    return `Recordatorio enviado a ${(res.reminded ?? pending.map(x => x.email)).join(', ')}.`;
  });
  const onVoid = () => run('void', async () => {
    await voidSignature(user!, r.id);
    setConfirmVoid(false);
    return 'Solicitud anulada. El documento vuelve a ser editable.';
  });
  const onEmail = () => run('email', async () => {
    if (!editing) return;
    const email = editing.email.trim();
    if (!EMAIL_RE.test(email)) throw new Error('El email no es válido.');
    await correctSignatureEmail(user!, r.id, email, editing.key);
    setEditing(null);
    return `Email corregido. DocuSign enviará la solicitud a ${email}.`;
  });
  const onSign = () => run('sign', async () => {
    openOwnerSigning(r.id, await getSigningUrl(user!, r.id));
  });

  const events = [...(r.events ?? [])].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="border-t border-[#2e2b20] px-4 py-3 flex-shrink-0 bg-[#1a1812] space-y-2.5 max-h-[45vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[#3a3630] uppercase tracking-widest font-semibold text-[9px]">Firma DocuSign</p>
        {(active || needsFiling) && (
          <button onClick={onRefresh} disabled={busy !== null}
            className="text-[10px] text-[#6b6050] hover:text-avocat-gold disabled:opacity-50 transition-colors">
            {busy === 'refresh' ? 'Consultando…' : 'Actualizar estado'}
          </button>
        )}
      </div>

      {/* Signers + CC */}
      <ul className="space-y-1">
        {r.recipients.map(x => {
          const k = recipientKey(x);
          if (editing?.key === k) {
            return (
              <li key={`${x.role}-${k}`} className="space-y-1.5">
                <input type="email" value={editing.email} onChange={e => setEditing({ key: k, email: e.target.value })} autoFocus
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8c0ac] focus:outline-none focus:border-avocat-gold" />
                <div className="flex gap-2">
                  <Button variant="BtnGold" size="sm" fullWidth disabled={busy !== null} onClick={onEmail}>
                    {busy === 'email' ? 'Reenviando…' : 'Guardar y reenviar'}
                  </Button>
                  <Button variant="BtnGhost" size="sm" disabled={busy !== null} onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </li>
            );
          }
          return (
            <li key={`${x.role}-${k}`} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate text-[#c8c0ac]" title={x.email}>
                {x.role === 'cc' ? 'CC' : `${x.routingOrder}.`} {x.role === 'owner' ? 'Tú' : x.name}
                {x.accessCode && <span title="Con código de acceso"> 🔒</span>}
                <span className="text-[#6b6050]"> · {x.email}</span>
              </span>
              <span className="flex-shrink-0 flex items-center gap-2">
                {canCorrect(x) && editing === null && (
                  <button onClick={() => setEditing({ key: k, email: x.email })} disabled={busy !== null}
                    className="text-[10px] text-[#8a7f68] hover:text-avocat-gold transition-colors">Corregir</button>
                )}
                <span className={`text-[10px] ${x.status === 'completed' ? 'text-blue-400' : x.status === 'declined' ? 'text-red-400' : 'text-[#6b6050]'}`}>
                  {x.role === 'cc' ? 'En copia' : RECIPIENT_LABEL[x.status]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Actions */}
      {r.status === 'completed' && r.signedDocumentId && (
        <Button variant="BtnGold" size="sm" fullWidth disabled={busy !== null} onClick={onOpenSigned}>
          {busy === 'open' ? 'Abriendo…' : 'Abrir PDF firmado'}
        </Button>
      )}
      {needsFiling && (
        <p className="text-[11px] text-[#6b6050]">
          {r.filingError
            ? 'No se pudo guardar el PDF firmado en Avocat. Pulsa «Actualizar estado» para reintentarlo (DocuSign ya te lo envió por email).'
            : 'Guardando el PDF firmado en tus documentos…'}
        </p>
      )}
      {r.status === 'pending_owner' && (
        <Button variant="BtnGold" size="sm" fullWidth disabled={busy !== null} onClick={onSign}>
          {busy === 'sign' ? 'Abriendo DocuSign…' : 'Continuar firma'}
        </Button>
      )}
      {waitingOnOther && pending.length > 0 && editing === null && (
        <Button variant="BtnOutlineDark" size="sm" fullWidth disabled={busy !== null} onClick={onRemind}>
          {busy === 'remind' ? 'Enviando…' : pending.length > 1 ? `Recordar (${pending.length})` : 'Recordar'}
        </Button>
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
          className="block text-[10px] text-[#8a7f68] hover:text-red-400 transition-colors">
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
