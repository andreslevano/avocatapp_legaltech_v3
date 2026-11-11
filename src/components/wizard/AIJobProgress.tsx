'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, Clock, Loader2 } from 'lucide-react';

// Avocat DS v4 AIJobProgress — long-running generation (30–90 s).
// Steps are only marked done when the caller says so (no fake timer). With no step events, the
// list shows what will happen and the current step spins. After 2× the typical time we say so.
interface AIJobProgressProps {
  title: string;
  steps: string[];
  /** Index of the step in progress (0-based); `steps.length` = all done. Omit when the backend sends no steps. */
  current?: number;
  /** Typical duration in seconds (for the ETA text and the "taking longer" switch). */
  typicalSeconds?: number;
  canLeave?: boolean;
  leaveText?: string;
  onRetry?: () => void;
}

export default function AIJobProgress({
  title, steps, current = 0, typicalSeconds = 60, canLeave = true,
  leaveText = 'Puedes salir de esta pantalla: el documento aparecerá en Mis documentos cuando esté listo.', onRetry,
}: AIJobProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const slow = elapsed > typicalSeconds * 2;
  const done = current >= steps.length;

  return (
    <section aria-live="polite" aria-busy={!done} className="rounded-lg border border-border bg-surface p-5 space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-h4">{title}</h3>
        <span className="text-caption text-text-muted">
          {slow ? 'Está tardando más de lo normal' : `Suele tardar ${typicalSeconds < 90 ? `${Math.round(typicalSeconds / 2)}–${typicalSeconds} s` : `${Math.round(typicalSeconds / 60)} min`}`}
        </span>
      </header>
      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(current, steps.length)}>
        <div className={`h-full bg-accent transition-all duration-slow ${done ? '' : 'animate-pulse'}`} style={{ width: `${Math.max(8, Math.round((Math.min(current, steps.length) / steps.length) * 100))}%` }} />
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const st = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={s} className={`flex items-center gap-2 text-body-sm ${st === 'todo' ? 'text-text-muted' : 'text-text'}`}>
              {st === 'done' && <CircleCheck size={18} className="text-success-text" aria-hidden />}
              {st === 'current' && <Loader2 size={18} className="animate-spin text-accent-text" aria-hidden />}
              {st === 'todo' && <Clock size={18} aria-hidden />}
              {s}
            </li>
          );
        })}
      </ol>
      {(canLeave || (slow && onRetry)) && (
        <footer className="flex flex-wrap items-center justify-between gap-2">
          {canLeave && <p className="text-caption text-text-muted">{leaveText}</p>}
          {slow && onRetry && <button type="button" onClick={onRetry} className="text-small font-medium text-accent-text underline">Reintentar</button>}
        </footer>
      )}
    </section>
  );
}
