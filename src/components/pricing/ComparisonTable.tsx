'use client';

// #comparar — every plan side by side, only features that exist in code, each with its status (D11).
// Desktop (≥ 768): a real <table> with sticky header + first column, collapsible groups and
// "Mostrar solo diferencias". Mobile: pick two plans, groups as accordions — no sideways scroll.
import { useMemo, useState } from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import {
  COMPARISON, formatPrice, LADDER, localize, planById, priceFor, PRICES, taxLine,
  type Cell, type ComparisonRow, type CountryCode, type Interval, type PricingPlanId,
} from '@/lib/pricing';
import StatusChip from './StatusChip';

interface Props { country: CountryCode; interval: Interval; signatureLive: boolean }

function Value({ row, plan, country, interval }: { row: ComparisonRow; plan: PricingPlanId; country: CountryCode; interval: Interval }) {
  const v: Cell = row.values[plan];
  if (row.id === 'precio') {
    const p = PRICES[country][plan];
    const amount = priceFor(plan, country, interval) ?? p.monthly;
    const per = interval === 'annual' && p.annual !== null ? '/año' : '/mes';
    return <span>{p.from ? 'Desde ' : ''}{formatPrice(country, amount)}{per}<span className="block text-caption text-text-muted">{taxLine(country, planById(plan).b2b)}</span></span>;
  }
  if (v === true) return <><Check size={18} aria-hidden className="inline text-success-text" /><span className="sr-only">Incluido</span></>;
  if (v === false) return <><Minus size={18} aria-hidden className="inline text-text-muted" /><span className="sr-only">No incluido</span></>;
  return <span>{v}</span>;
}

const differs = (r: ComparisonRow) => r.id === 'precio' || new Set(LADDER.map(id => JSON.stringify(r.values[id]))).size > 1;

export default function ComparisonTable({ country, interval, signatureLive }: Props) {
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pair, setPair] = useState<[PricingPlanId, PricingPlanId]>(['abogado', 'empresa-inicial']);
  const groups = useMemo(
    () => COMPARISON.map(g => ({ ...g, rows: onlyDiff ? g.rows.filter(differs) : g.rows })).filter(g => g.rows.length),
    [onlyDiff],
  );
  const toggle = (id: string) => setCollapsed(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <label className="inline-flex items-center gap-2 min-h-touch sm:min-h-0 text-small text-text cursor-pointer mb-4">
        <input type="checkbox" checked={onlyDiff} onChange={e => setOnlyDiff(e.target.checked)} className="accent-accent" />
        Mostrar solo diferencias
      </label>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto lg:overflow-visible">
        <table className="w-full text-small border-separate border-spacing-0">
          <caption className="sr-only">Comparativa de planes de Avocat</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-16 left-0 z-20 bg-bg text-left align-bottom p-3 border-b border-border-strong min-w-[220px]">
                <span className="sr-only">Función</span>
              </th>
              {LADDER.map(id => (
                <th key={id} scope="col" className="sticky top-16 z-10 bg-bg text-left align-bottom p-3 border-b border-border-strong min-w-[120px]">
                  <span className="block text-small font-semibold text-text-heading">{planById(id).name}</span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map(g => {
            const open = !collapsed.has(g.id);
            return (
              <tbody key={g.id}>
                <tr>
                  <th scope="colgroup" colSpan={LADDER.length + 1} className="sticky left-0 bg-surface-muted text-left p-0 border-b border-border">
                    <button type="button" aria-expanded={open} aria-controls={`grp-${g.id}`} onClick={() => toggle(g.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-label uppercase tracking-widest font-semibold text-text-muted hover:text-text">
                      <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? '' : '-rotate-90'}`} />{g.label}
                    </button>
                  </th>
                </tr>
                {open && g.rows.map(r => (
                  <tr key={r.id} id={r === g.rows[0] ? `grp-${g.id}` : undefined}>
                    <th scope="row" className="sticky left-0 z-10 bg-bg text-left font-normal p-3 border-b border-border align-top">
                      <span className="text-text">{localize(r.label, country)}</span>
                      {r.id !== 'precio' && <StatusChip status={r.status} signatureLive={signatureLive} className="ml-2 align-middle" />}
                      {r.note && <span className="block text-caption text-text-muted">{r.note}</span>}
                    </th>
                    {LADDER.map(id => (
                      <td key={id} className="p-3 border-b border-border align-top text-text">
                        <Value row={r} plan={id} country={country} interval={interval} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>

      {/* Mobile: two plans, accordions */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map(i => (
            <div key={i}>
              <label htmlFor={`cmp-${i}`} className="block text-caption text-text-muted">{i === 0 ? 'Plan A' : 'Plan B'}</label>
              <select id={`cmp-${i}`} value={pair[i]} onChange={e => setPair(p => (i === 0 ? [e.target.value as PricingPlanId, p[1]] : [p[0], e.target.value as PricingPlanId]))}
                className="w-full min-h-touch bg-surface border border-border-strong rounded-lg px-2 py-2 text-small text-text">
                {LADDER.map(id => <option key={id} value={id}>{planById(id).name}</option>)}
              </select>
            </div>
          ))}
        </div>
        {groups.map(g => (
          <details key={g.id} open={g.id === 'precio'} className="rounded-xl border border-border bg-surface">
            <summary className="cursor-pointer min-h-touch flex items-center px-3 text-label uppercase tracking-widest font-semibold text-text-muted">{g.label}</summary>
            <dl className="divide-y divide-border">
              {g.rows.map(r => (
                <div key={r.id} className="px-3 py-2.5">
                  <dt className="text-small text-text">
                    {localize(r.label, country)}
                    {r.id !== 'precio' && <StatusChip status={r.status} signatureLive={signatureLive} className="ml-2 align-middle" />}
                  </dt>
                  <dd className="mt-1.5 grid grid-cols-2 gap-2 text-small text-text">
                    {pair.map((id, i) => (
                      <span key={`${id}-${i}`}>
                        <span className="block text-caption text-text-muted">{planById(id).name}</span>
                        <Value row={r} plan={id} country={country} interval={interval} />
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}
