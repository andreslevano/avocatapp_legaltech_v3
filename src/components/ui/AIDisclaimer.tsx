import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

// Avocat DS v4 AIDisclaimer — spec: design-system/v4/components/AIDisclaimer.md
// Copy is FIXED (validated wording): do not paraphrase per screen. Never dismissible on documents.
export const AI_DISCLAIMER_BLOCK_TITLE = 'Revisa antes de presentar.';
export const AI_DISCLAIMER_BLOCK_TEXT =
  'Este borrador lo ha generado una IA y no constituye asesoramiento jurídico. Comprueba datos, plazos, cuantías y citas, o pide a un abogado colegiado que lo revise.';
export const AI_DISCLAIMER_INLINE_TEXT =
  'Avocat puede equivocarse. Revisa citas, plazos y cuantías antes de usar la respuesta.';

interface AIDisclaimerProps {
  variant?: 'block' | 'inline';
  className?: string;
  children?: ReactNode;
}

export function AIDisclaimer({ variant = 'block', className = '', children }: AIDisclaimerProps) {
  if (variant === 'inline') {
    return <p className={`text-caption text-text-muted ${className}`}>{AI_DISCLAIMER_INLINE_TEXT}</p>;
  }
  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-md border border-status-proximo-border bg-warning-subtle px-3 py-2 text-small text-text ${className}`}
    >
      <TriangleAlert size={18} className="mt-px shrink-0 text-warning-text" aria-hidden />
      <div>
        <b className="font-semibold text-warning-text">{AI_DISCLAIMER_BLOCK_TITLE} </b>
        {children ?? AI_DISCLAIMER_BLOCK_TEXT}
      </div>
    </div>
  );
}
