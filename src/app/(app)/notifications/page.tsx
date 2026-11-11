'use client';

// /notifications — contract expiry alerts (F3) with their actions:
// Renovar · Dejar vencer · Marcar como terminado · Posponer 7 días · Ver documento.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { canUseContracts } from '@/lib/contracts/config';
import { contractAction, markNotificationsRead, runAlertsNow, watchContracts, watchNotifications, type AppNotification } from '@/lib/contracts/client';
import { formatContractDate } from '@/lib/contracts/dates';
import { LIFECYCLE_LABEL, type Contract } from '@/lib/contracts/types';

const SEVERITY_DOT: Record<string, string> = { high: 'bg-red-400', medium: 'bg-avocat-gold', low: 'bg-[#6b6050]' };

type Act = 'snooze' | 'let_expire' | 'terminate';
const ACT_DONE: Record<Act, string> = {
  snooze: 'Pospuesto 7 días.',
  let_expire: 'No recibirás más avisos de este contrato.',
  terminate: 'Contrato marcado como terminado.',
};

export default function NotificationsPage() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const enabled = canUseContracts(userDoc.plan, user);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [contracts, setContracts] = useState<Map<string, Contract>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    const off1 = watchNotifications(user.uid, setItems, 100);
    const off2 = watchContracts(user.uid, cs => setContracts(new Map(cs.map(c => [c.id, c]))));
    return () => { off1(); off2(); };
  }, [enabled, user]);

  const unread = useMemo(() => (items ?? []).filter(n => !n.readAt), [items]);

  if (!enabled) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Avisos" />
        <p className="p-6 text-[13px] text-[#6b6050]">Los avisos de vencimiento de contratos no están disponibles en tu plan.</p>
      </div>
    );
  }

  const act = async (n: AppNotification, a: Act) => {
    if (!user) return;
    setBusy(`${n.id}:${a}`); setNotice(null);
    try {
      await contractAction(user, n.contractId, a);
      if (!n.readAt) await markNotificationsRead([n.id]).catch(() => {});
      setNotice({ kind: 'ok', text: ACT_DONE[a] });
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const open = (n: AppNotification, href: string) => {
    if (!n.readAt) markNotificationsRead([n.id]).catch(() => {});
    router.push(href);
  };

  const testNow = async () => {
    if (!user) return;
    setBusy('test'); setNotice(null);
    try {
      const r = await runAlertsNow(user, false);
      setNotice({ kind: 'ok', text: `Revisados ${r.scan.contracts} contratos · ${r.scan.notifications} avisos nuevos.` });
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Avisos"
        subtitle={unread.length ? `${unread.length} sin leer` : 'Vencimientos de tus contratos'}
        actions={unread.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => markNotificationsRead(unread.map(n => n.id))}>Marcar todo como leído</Button>
        ) : undefined}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {notice && <p className={`text-[12px] ${notice.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{notice.text}</p>}

          {items === null ? (
            <p className="text-[12px] text-[#6b6050]">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-5 py-10 text-center space-y-2">
              <p className="text-[13px] text-[#c8c0ac]">No tienes avisos.</p>
              <p className="text-[12px] text-[#6b6050]">
                Te avisaremos antes de que venzan tus NDAs. Los generados en Avocat se registran solos; para los subidos, usa
                «Analizar como contrato» en Documentos.
              </p>
            </div>
          ) : items.map(n => {
            if (n.type === 'legal_change') return <LegalChangeItem key={n.id} n={n} onOpen={open} />;
            const c = contracts.get(n.contractId);
            const closed = c && (c.lifecycle === 'terminated' || c.lifecycle === 'renewed' || c.lifecycle === 'superseded');
            return (
              <div key={n.id} className={`bg-[#1e1c16] border rounded-xl px-4 py-3 space-y-2 ${n.readAt ? 'border-[#2e2b20]' : 'border-avocat-gold/30'}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.low}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${n.readAt ? 'text-[#c8c0ac]' : 'text-[#e8d4a0] font-medium'}`}>{n.title}</p>
                    <p className="text-[12px] text-[#6b6050] mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-[#3a3630] mt-1">
                      {formatContractDate(n.dueDate)}{c ? ` · ${LIFECYCLE_LABEL[c.lifecycle]}` : ''}{c?.snoozedUntil && c.snoozedUntil > new Date().toISOString().slice(0, 10) ? ` · pospuesto hasta ${formatContractDate(c.snoozedUntil)}` : ''}
                    </p>
                  </div>
                  {!n.readAt && (
                    <button onClick={() => markNotificationsRead([n.id])} title="Marcar como leído"
                      className="text-[10px] text-[#6b6050] hover:text-[#c8c0ac] flex-shrink-0">Leído</button>
                  )}
                </div>
                {!closed && (
                  <div className="flex flex-wrap gap-2 pl-[18px]">
                    {c?.type === 'nda' && (
                      <Button variant="accent" size="sm" onClick={() => open(n, `/tools/nda?renew=${encodeURIComponent(n.contractId)}`)}>Renovar</Button>
                    )}
                    <Button variant="secondary" size="sm" disabled={!!busy} loading={busy === `${n.id}:snooze`} onClick={() => act(n, 'snooze')}>Posponer 7 días</Button>
                    <Button variant="secondary" size="sm" disabled={!!busy} loading={busy === `${n.id}:let_expire`} onClick={() => act(n, 'let_expire')}>Dejar vencer</Button>
                    <Button variant="secondary" size="sm" disabled={!!busy} loading={busy === `${n.id}:terminate`} onClick={() => act(n, 'terminate')}>Marcar como terminado</Button>
                    <Button variant="ghost" size="sm" onClick={() => open(n, `/documents?doc=${encodeURIComponent(n.documentId)}`)}>Ver documento</Button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-4 flex items-center justify-between gap-3 text-[11px] text-[#3a3630]">
            <span className="flex gap-4">
              <Link href="/profile#notificaciones" className="hover:text-avocat-gold">Configurar avisos</Link>
              {(userDoc as unknown as { isAdmin?: boolean }).isAdmin === true && (
                <Link href="/admin/legal-changes" className="hover:text-avocat-gold">Revisar cambios legales (admin)</Link>
              )}
            </span>
            <button onClick={testNow} disabled={!!busy} className="hover:text-avocat-gold disabled:opacity-50">
              {busy === 'test' ? 'Revisando…' : 'Revisar ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** F2: "Cambio normativo: N NDAs pueden requerir actualización". */
function LegalChangeItem({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification, href: string) => void }) {
  return (
    <div className={`bg-[#1e1c16] border rounded-xl px-4 py-3 space-y-2 ${n.readAt ? 'border-[#2e2b20]' : 'border-avocat-gold/30'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.low}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] leading-snug ${n.readAt ? 'text-[#c8c0ac]' : 'text-[#e8d4a0] font-medium'}`}>{n.title}</p>
          <p className="text-[12px] text-[#6b6050] mt-0.5">{n.body}</p>
          <p className="text-[10px] text-[#3a3630] mt-1">Cambio legal · en vigor {formatContractDate(n.dueDate)}</p>
        </div>
        {!n.readAt && (
          <button onClick={() => markNotificationsRead([n.id])} title="Marcar como leído"
            className="text-[10px] text-[#6b6050] hover:text-[#c8c0ac] flex-shrink-0">Leído</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pl-[18px]">
        <Button variant="accent" size="sm" onClick={() => onOpen(n, '/legal-changes')}>Ver NDAs afectados</Button>
        {n.url && (
          <a href={n.url} target="_blank" rel="noopener noreferrer" onClick={() => { if (!n.readAt) markNotificationsRead([n.id]).catch(() => {}); }}>
            <Button variant="ghost" size="sm">Texto oficial ↗</Button>
          </a>
        )}
      </div>
    </div>
  );
}
