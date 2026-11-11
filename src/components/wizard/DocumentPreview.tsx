import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import { StatusTag } from '@/components/ui/StatusTag';

// Avocat DS v4 DocumentPreview — paper is always light (EB Garamond, .legal-doc) inside either theme.
// Data inserted from the user's documents/answers is highlighted with <Mark> until confirmed.
export function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="bg-gold-100 text-text underline decoration-dashed decoration-gold-700 underline-offset-4 rounded-xs px-0.5">
      {children}
    </mark>
  );
}

interface DocumentPreviewProps {
  title: string;
  children: ReactNode;
  disclaimer?: boolean;
  note?: ReactNode;
  actions?: ReactNode;
}

export default function DocumentPreview({ title, children, disclaimer = true, note, actions }: DocumentPreviewProps) {
  return (
    <section aria-label={`Vista previa: ${title}`} className="rounded-lg border border-border bg-surface overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FileText size={18} className="text-accent-text" aria-hidden />
        <b className="text-body-sm font-semibold text-text-heading flex-1 min-w-0 truncate">{title}</b>
        <StatusTag status="borrador" size="sm" />
      </header>
      {disclaimer && <div className="px-4 pt-3"><AIDisclaimer /></div>}
      <div className="p-3 sm:p-5 overflow-x-auto">
        <div data-theme="light" lang="es" className="legal-doc mx-auto shadow-sm !px-6 !py-8 sm:!px-16 sm:!py-14">
          {children}
          {note && <p className="doc-note mt-6">{note}</p>}
        </div>
      </div>
      {actions && <footer className="flex flex-wrap justify-end gap-2 px-4 py-3 border-t border-border">{actions}</footer>}
    </section>
  );
}
