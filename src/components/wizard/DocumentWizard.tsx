'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';

// Avocat DS v4 generic document wizard. Canonical order: Datos → Documentos → Revisión → Pago → Descarga
// (review BEFORE payment). Each procedure supplies its steps; the shell renders the Stepper, the step
// body and a sticky 48px CTA on mobile. Business logic (APIs, Stripe, Firestore) stays in the procedure.
export interface WizardStep {
  id: string;
  label: string;
  title: string;
  description?: ReactNode;
  content: ReactNode;
  /** Primary CTA; omit for steps without one (e.g. Descarga). */
  cta?: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; loadingText?: string; hint?: ReactNode };
  /** Allow "Atrás" from this step. Default true except on the first and last step. */
  back?: boolean;
}

interface DocumentWizardProps {
  title: string;
  subtitle?: ReactNode;
  steps: WizardStep[];
  /** 1-based */
  current: number;
  onStepChange: (step: number) => void;
  /** e.g. "Guardado hace 1 min" */
  savedLabel?: ReactNode;
  /** Steps that can't be revisited (e.g. after payment). */
  locked?: boolean;
}

export default function DocumentWizard({ title, subtitle, steps, current, onStepChange, savedLabel, locked = false }: DocumentWizardProps) {
  const step = steps[current - 1];
  const canBack = !locked && current > 1 && (step.back ?? current < steps.length);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="p-4 sm:p-6 border-b border-border space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-h2">{title}</h2>
            {subtitle && <p className="text-body-sm text-text-muted mt-1">{subtitle}</p>}
          </div>
          {savedLabel && <p className="text-caption text-text-muted" aria-live="polite">{savedLabel}</p>}
        </div>
        <Stepper steps={steps.map(s => s.label)} current={current} onStepClick={locked ? undefined : onStepChange} />
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h3 className="text-h3">{step.title}</h3>
          {step.description && <p className="text-body-sm text-text-muted mt-1">{step.description}</p>}
        </div>
        {step.content}
      </div>

      {(step.cta || canBack) && (
        <div className="sticky bottom-0 sm:static z-sticky border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-4">
          {step.cta?.hint && <div className="mb-2 text-caption text-text-muted">{step.cta.hint}</div>}
          <div className="flex items-center gap-3">
            {canBack && (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => onStepChange(current - 1)}>Atrás</Button>
            )}
            {step.cta && (
              <Button
                variant="primary"
                size="lg"
                className="ml-auto flex-1 sm:flex-none"
                onClick={step.cta.onClick}
                disabled={step.cta.disabled}
                loading={step.cta.loading}
                loadingText={step.cta.loadingText}
              >
                {step.cta.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
