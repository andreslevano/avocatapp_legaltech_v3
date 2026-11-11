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
    <div className="flex flex-wrap gap-1.5 px-4 py-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-subtle border border-accent-border text-caption font-sans text-accent-text"
        >
          {chip.label}
          {chip.onRemove && (
            <button
              onClick={chip.onRemove}
              className="hover:opacity-70 transition-opacity leading-none ml-0.5"
              aria-label={`Quitar ${chip.label}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
