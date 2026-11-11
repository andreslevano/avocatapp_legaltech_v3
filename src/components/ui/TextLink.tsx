import Link from 'next/link';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

// Avocat DS v4 TextLink — spec: design-system/v4/components/TextLink.md
interface TextLinkProps {
  href: string;
  children: ReactNode;
  /** Opens in a new tab; adds an icon and a screen-reader hint. */
  external?: boolean;
  /** Body colour for secondary links ("¿Olvidaste tu contraseña?"). */
  quiet?: boolean;
  className?: string;
}

export function TextLink({ href, children, external = false, quiet = false, className = '' }: TextLinkProps) {
  const cls = [
    'underline underline-offset-2 decoration-1 hover:decoration-2',
    quiet ? 'text-text' : 'text-accent-text',
    className,
  ].filter(Boolean).join(' ');
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} inline-flex items-center gap-1`}>
        {children}
        <ExternalLink size={14} aria-hidden />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    );
  }
  return <Link href={href} className={cls}>{children}</Link>;
}
