import { CREDIT_COSTS } from '@/lib/pricing';
import StatusChip from './StatusChip';

/** D8 — what each action costs, public and transparent. */
export default function CreditCostTable({ signatureLive }: { signatureLive: boolean }) {
  return (
    <table className="w-full text-small">
      <caption className="sr-only">Coste en créditos de cada acción</caption>
      <thead>
        <tr className="border-b border-border text-left text-label uppercase tracking-widest text-text-muted">
          <th scope="col" className="py-2 pr-4">Acción</th>
          <th scope="col" className="py-2 pr-4 text-right">Créditos</th>
          <th scope="col" className="py-2">Estado</th>
        </tr>
      </thead>
      <tbody>
        {CREDIT_COSTS.map(c => (
          <tr key={c.id} className="border-b border-border last:border-0 align-top">
            <th scope="row" className="py-2.5 pr-4 font-normal text-left text-text">
              {c.label}{c.note && <span className="block text-caption text-text-muted">{c.note}</span>}
            </th>
            <td className="py-2.5 pr-4 text-right font-semibold text-text-heading tabular-nums">{c.credits}</td>
            <td className="py-2.5"><StatusChip status={c.status} signatureLive={signatureLive} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
