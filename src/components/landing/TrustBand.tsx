import { FileText, Globe, Lock, type LucideIcon } from 'lucide-react';

// Verifiable proof points only (DS v4 — no unsourced stats or trust badges).
const ITEMS: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: FileText, label: 'Tú revisas antes de presentar', sub: 'Borradores editables en Word y PDF' },
  { icon: Globe, label: 'España y Latinoamérica', sub: 'Escritos adaptados a cada jurisdicción' },
  { icon: Lock, label: 'Tus documentos, solo tuyos', sub: 'Acceso restringido a tu cuenta' },
];

export default function TrustBand() {
  return (
    <div className="bg-surface border-y border-border py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex flex-wrap items-center justify-around gap-6">
          {ITEMS.map(({ icon: Icon, label, sub }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-md bg-accent-subtle border border-accent-border flex items-center justify-center shrink-0 text-accent-text">
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-text-heading leading-tight">{label}</span>
                <span className="block text-caption text-text-muted">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
