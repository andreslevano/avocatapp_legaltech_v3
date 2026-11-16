'use client';

import { COUNTRIES, COUNTRY_ORDER, type CountryCode } from '@/lib/pricing';

/** "España · EUR" — flag-free. */
export default function CountrySelector({ value, onChange, id = 'pricing-country' }: { value: CountryCode; onChange: (c: CountryCode) => void; id?: string }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-caption text-text-muted whitespace-nowrap">País y moneda</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value as CountryCode)}
        className="min-h-touch sm:min-h-0 bg-surface border border-border-strong rounded-lg px-3 py-2 text-small text-text">
        {COUNTRY_ORDER.map(c => <option key={c} value={c}>{COUNTRIES[c].name} · {COUNTRIES[c].currency}</option>)}
      </select>
    </div>
  );
}
