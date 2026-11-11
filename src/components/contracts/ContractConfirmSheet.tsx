'use client';

// "Revisa los datos del contrato" (F0): the user verifies or edits what was extracted (or entered in
// the NDA form). Low-confidence fields are highlighted; alerts (F3) only run on confirmed records.
// Dates shown here are a live preview — the server recomputes them on save.

import { useMemo, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import { saveContract } from '@/lib/contracts/client';
import { computeDates, formatContractDate, isIsoDate } from '@/lib/contracts/dates';
import { LOW_CONFIDENCE } from '@/lib/contracts/extract';
import {
  CONTRACT_TYPE_LABEL, COUNTRIES,
  type Contract, type ContractParty, type ContractTerm, type ContractType, type NdaKind, type PartyRole,
} from '@/lib/contracts/types';

const FIELD = 'w-full bg-[#161410] border rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const LABEL = 'block text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1';
const ROLE_LABEL: Record<PartyRole, string> = { disclosing: 'Divulgante', receiving: 'Receptora', mutual: 'Mutua' };

const intOrNull = (s: string) => { const n = Number(s); return s.trim() && Number.isInteger(n) && n > 0 ? n : null; };

interface Props {
  contract: Contract;
  onClose: () => void;
  onSaved?: (c: Contract) => void;
}

export default function ContractConfirmSheet({ contract: c, onClose, onSaved }: Props) {
  const { user } = useAppAuth();
  const [title, setTitle] = useState(c.title);
  const [type, setType] = useState<ContractType>(c.type);
  const [ndaKind, setNdaKind] = useState<NdaKind | null>(c.ndaKind ?? null);
  const [country, setCountry] = useState(c.jurisdiction?.country ?? '');
  const [parties, setParties] = useState<ContractParty[]>(c.parties?.length ? c.parties : [{ name: '', role: 'mutual' }]);
  const [effectiveDate, setEffectiveDate] = useState(c.dates?.effectiveDate ?? '');
  const [months, setMonths] = useState(c.term?.months ? String(c.term.months) : '');
  const [indefinite, setIndefinite] = useState(!!c.term?.indefinite);
  const [fixedEnd, setFixedEnd] = useState(c.term?.fixedEndDate ?? '');
  const [autoRenewal, setAutoRenewal] = useState(!!c.term?.autoRenewal);
  const [renewalMonths, setRenewalMonths] = useState(c.term?.renewalMonths ? String(c.term.renewalMonths) : '');
  const [noticeDays, setNoticeDays] = useState(c.term?.noticeDays ? String(c.term.noticeDays) : '');
  const [survivalMonths, setSurvivalMonths] = useState(c.term?.survivalMonths ? String(c.term.survivalMonths) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const llm = c.extraction?.source === 'llm' && !c.confirmedByUser;
  const low = (k: string) => llm && (c.extraction.fieldConfidence?.[k] ?? 0) < LOW_CONFIDENCE;
  const border = (k: string) => (low(k) ? 'border-amber-400/60' : 'border-[#2e2b20]');
  const Hint = ({ k }: { k: string }) => (low(k) ? <p className="text-[10px] text-amber-400 mt-1">Revisa este dato: no estaba claro en el documento.</p> : null);

  const term: ContractTerm = useMemo(() => ({
    ...c.term,
    months: indefinite ? null : intOrNull(months),
    indefinite,
    fixedEndDate: isIsoDate(fixedEnd) ? fixedEnd : null,
    autoRenewal,
    renewalMonths: autoRenewal ? intOrNull(renewalMonths) : null,
    noticeDays: autoRenewal ? intOrNull(noticeDays) : null,
    survivalMonths: intOrNull(survivalMonths),
  }), [c.term, indefinite, months, fixedEnd, autoRenewal, renewalMonths, noticeDays, survivalMonths]);
  const preview = computeDates(isIsoDate(effectiveDate) ? effectiveDate : null, term);

  const setParty = (i: number, p: Partial<ContractParty>) => setParties(ps => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) return setError('Escribe un título.');
    const named = parties.filter(p => p.name.trim());
    if (!named.length) return setError('Indica al menos una parte.');
    if (!isIsoDate(effectiveDate)) return setError('Indica la fecha de inicio del contrato.');
    if (!indefinite && !term.months && !term.fixedEndDate) return setError('Indica la duración, una fecha de fin o marca «Indefinido».');
    setBusy(true); setError('');
    try {
      const saved = await saveContract(user, c.id, {
        title: title.trim(), type, ndaKind: type === 'nda' ? ndaKind : null,
        jurisdictionCountry: country || null, parties: named, effectiveDate, term,
      }, true);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={c.confirmedByUser ? 'Datos del contrato' : 'Revisa los datos del contrato'} onClose={busy ? () => {} : onClose} sheetOnMobile>
      <div className="overflow-y-auto -mx-1 px-1 space-y-4 text-[12px] font-sans">
        {llm && (
          <p className="text-[11px] text-[#6b6050]">
            Hemos leído estos datos del documento. Compruébalos: los avisos de vencimiento solo se activan cuando los confirmas.
          </p>
        )}

        <section className="space-y-2">
          <div>
            <label className={LABEL}>Título</label>
            <input className={`${FIELD} border-[#2e2b20]`} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Tipo</label>
              <select className={`${FIELD} border-[#2e2b20]`} value={type} onChange={e => setType(e.target.value as ContractType)}>
                {(Object.keys(CONTRACT_TYPE_LABEL) as ContractType[]).map(t => <option key={t} value={t} className="bg-[#161410]">{CONTRACT_TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Ley aplicable</label>
              <select className={`${FIELD} ${border('jurisdiction')}`} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="" className="bg-[#161410]">—</option>
                {COUNTRIES.map(x => <option key={x.code} value={x.code} className="bg-[#161410]">{x.label}</option>)}
                {country && !COUNTRIES.some(x => x.code === country) && <option value={country} className="bg-[#161410]">{country}</option>}
              </select>
              <Hint k="jurisdiction" />
            </div>
          </div>
          {type === 'nda' && (
            <div className="flex gap-2">
              {(['unilateral', 'bilateral'] as NdaKind[]).map(k => (
                <button key={k} type="button" onClick={() => setNdaKind(k)}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${ndaKind === k ? 'border-avocat-gold/60 text-avocat-gold bg-avocat-gold/10' : 'border-[#2e2b20] text-[#6b6050] hover:text-[#c8c0ac]'}`}>
                  {k === 'unilateral' ? 'Unilateral' : 'Bilateral (mutuo)'}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className={LABEL}>Partes</p>
          {parties.map((p, i) => (
            <div key={i} className={`rounded-lg border p-2 space-y-1.5 ${border('parties')}`}>
              <div className="flex gap-2">
                <input className={`${FIELD} border-[#2e2b20]`} placeholder="Nombre" value={p.name} onChange={e => setParty(i, { name: e.target.value })} />
                {parties.length > 1 && (
                  <button type="button" aria-label="Quitar parte" onClick={() => setParties(ps => ps.filter((_, j) => j !== i))}
                    className="text-[#6b6050] hover:text-red-400 text-[16px] leading-none px-1">×</button>
                )}
              </div>
              <div className="flex gap-2">
                <input className={`${FIELD} border-[#2e2b20]`} placeholder="Empresa (opcional)" value={p.company ?? ''} onChange={e => setParty(i, { company: e.target.value })} />
                <select className={`${FIELD} border-[#2e2b20] max-w-[130px]`} value={p.role} onChange={e => setParty(i, { role: e.target.value as PartyRole })}>
                  {(Object.keys(ROLE_LABEL) as PartyRole[]).map(r => <option key={r} value={r} className="bg-[#161410]">{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
            </div>
          ))}
          <Hint k="parties" />
          {parties.length < 6 && (
            <button type="button" onClick={() => setParties(ps => [...ps, { name: '', role: 'mutual' }])}
              className="text-[11px] text-avocat-gold hover:underline">+ Añadir parte</button>
          )}
        </section>

        <section className="space-y-2">
          <p className={LABEL}>Plazos</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-[#6b6050]">Fecha de inicio</label>
              <input type="date" className={`${FIELD} ${border('effectiveDate')}`} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
              <Hint k="effectiveDate" />
            </div>
            <div>
              <label className="text-[11px] text-[#6b6050]">Duración (meses)</label>
              <input type="number" min={1} inputMode="numeric" className={`${FIELD} ${border('term')}`} value={indefinite ? '' : months}
                disabled={indefinite || !!fixedEnd} placeholder={indefinite ? 'Indefinido' : 'p. ej. 24'} onChange={e => setMonths(e.target.value)} />
              <Hint k="term" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#c8c0ac]">
            <input type="checkbox" checked={indefinite} onChange={e => setIndefinite(e.target.checked)} className="accent-avocat-gold" />
            Duración indefinida
          </label>
          {!indefinite && (
            <div>
              <label className="text-[11px] text-[#6b6050]">Fecha de fin explícita (opcional — sustituye a la duración)</label>
              <input type="date" className={`${FIELD} border-[#2e2b20]`} value={fixedEnd} onChange={e => setFixedEnd(e.target.value)} />
            </div>
          )}
          <label className="flex items-center gap-2 text-[12px] text-[#c8c0ac]">
            <input type="checkbox" checked={autoRenewal} onChange={e => setAutoRenewal(e.target.checked)} className="accent-avocat-gold" />
            Renovación automática (prórroga tácita)
          </label>
          {autoRenewal && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#6b6050]">Cada (meses)</label>
                <input type="number" min={1} className={`${FIELD} ${border('renewal')}`} value={renewalMonths} placeholder={months || '12'} onChange={e => setRenewalMonths(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-[#6b6050]">Preaviso (días)</label>
                <input type="number" min={1} className={`${FIELD} ${border('renewal')}`} value={noticeDays} placeholder="p. ej. 30" onChange={e => setNoticeDays(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] text-[#6b6050]">La confidencialidad sigue tras el fin durante (meses, opcional)</label>
            <input type="number" min={1} className={`${FIELD} ${border('survival')}`} value={survivalMonths} placeholder="p. ej. 36" onChange={e => setSurvivalMonths(e.target.value)} />
          </div>
        </section>

        <section className="rounded-lg border border-[#2e2b20] bg-[#161410] px-3 py-2 space-y-1">
          <Row label="Fin del acuerdo" value={indefinite ? 'Indefinido' : formatContractDate(preview.termEndDate)} />
          {autoRenewal && <Row label="Último día de preaviso" value={formatContractDate(preview.noticeDeadline)} />}
          {preview.confidentialitySurvivalEnd && <Row label="Fin de la confidencialidad" value={formatContractDate(preview.confidentialitySurvivalEnd)} />}
        </section>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="accent" size="sm" fullWidth loading={busy} onClick={submit}>
            {c.confirmedByUser ? 'Guardar cambios' : 'Confirmar datos'}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[#6b6050]">{label}</span>
      <span className="text-[#e8d4a0]">{value}</span>
    </div>
  );
}
