import { X } from 'lucide-react';

// Avocat DS v4 ContextChips — what the agent is using as context; each chip removable with a labelled button.
interface Chip {
  label: string;
  onRemove?: () => void;
}

interface AgentContextChipsProps {
  chips: Chip[];
}

export default function AgentContextChips({ chips }: AgentContextChipsProps) {
  if (!chips.length) return null;

  return (
    <ul aria-label="Contexto de la conversación" className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <li
          key={i}
          className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full bg-accent-subtle border border-accent-border text-caption text-accent-text"
        >
          {chip.label}
          {chip.onRemove && (
            <button
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-surface-muted"
              aria-label={`Quitar ${chip.label} del contexto`}
            >
              <X size={12} aria-hidden />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
