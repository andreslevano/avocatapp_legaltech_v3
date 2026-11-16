'use client';

import { PROFILES, PROFILE_ORDER, type ProfileId } from '@/lib/pricing';

/** Estudiante · Particular · Abogado · Empresa — selects the profile block (synced to ?perfil=). */
export default function ProfileTabs({ value, onChange }: { value: ProfileId; onChange: (p: ProfileId) => void }) {
  const move = (dir: 1 | -1) => {
    const i = PROFILE_ORDER.indexOf(value);
    const next = PROFILE_ORDER[(i + dir + PROFILE_ORDER.length) % PROFILE_ORDER.length];
    onChange(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="¿Cómo trabajas con el Derecho?" className="flex flex-wrap justify-center gap-2"
      onKeyDown={e => { if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); }}>
      {PROFILES.map(p => (
        <button key={p.id} id={`tab-${p.id}`} type="button" role="tab" aria-selected={value === p.id} aria-controls={`panel-${p.id}`}
          tabIndex={value === p.id ? 0 : -1} onClick={() => onChange(p.id)}
          className={`min-h-touch px-4 py-2 rounded-lg border text-small font-medium transition-colors ${value === p.id ? 'border-accent-border bg-accent-subtle text-accent-text' : 'border-border bg-surface text-text hover:border-border-strong'}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
