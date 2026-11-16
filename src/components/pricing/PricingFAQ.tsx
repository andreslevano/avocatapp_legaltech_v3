/** FAQ with native <details> (keyboard and screen-reader friendly without JS). */
export default function PricingFAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map(f => (
        <details key={f.q} className="group py-3">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 min-h-touch text-small font-medium text-text-heading">
            {f.q}
            <span aria-hidden className="text-text-muted transition-transform group-open:rotate-45 text-h4 leading-none">+</span>
          </summary>
          <p className="mt-2 text-small text-text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
