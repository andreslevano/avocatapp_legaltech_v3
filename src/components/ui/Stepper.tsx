import { Check } from 'lucide-react';

// Avocat DS v4 Stepper — spec: design-system/v4/components/Stepper.md.
// Done steps are reachable (onStepClick); future steps are not links.
interface StepperProps {
  steps: string[];
  /** 1-based. */
  current: number;
  onStepClick?: (step: number) => void;
  label?: string;
}

export function Stepper({ steps, current, onStepClick, label = 'Progreso' }: StepperProps) {
  return (
    <div>
      <ol aria-label={label} className="flex gap-1.5">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = n < current ? 'done' : n === current ? 'current' : 'todo';
          const inner = (
            <>
              <span className={`block h-1 rounded-full ${state === 'todo' ? 'bg-border' : 'bg-accent'}`} />
              <span className="mt-2 hidden sm:flex items-center gap-1.5 text-caption">
                <span
                  className={[
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-label tracking-normal font-semibold',
                    state === 'done' ? 'bg-accent text-text-on-accent'
                      : state === 'current' ? 'border border-accent text-accent-text'
                      : 'border border-border text-text-muted',
                  ].join(' ')}
                >
                  {state === 'done' ? <Check size={12} strokeWidth={3} aria-hidden /> : n}
                </span>
                <span className={state === 'current' ? 'font-semibold text-text-heading' : state === 'done' ? 'text-text' : 'text-text-muted'}>{s}</span>
              </span>
              {state === 'done' && <span className="sr-only"> (completado)</span>}
            </>
          );
          return (
            <li key={s} className="flex-1 min-w-0" aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' && onStepClick ? (
                <button type="button" onClick={() => onStepClick(n)} className="block w-full text-left rounded-xs" aria-label={`${s} (completado) — volver a este paso`}>
                  {inner}
                </button>
              ) : (
                <div>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      {/* Compact label for mobile */}
      <p className="sm:hidden mt-2 text-caption text-text-muted" aria-hidden>
        Paso {current} de {steps.length} · <b className="text-text-heading font-semibold">{steps[current - 1]}</b>
      </p>
    </div>
  );
}
