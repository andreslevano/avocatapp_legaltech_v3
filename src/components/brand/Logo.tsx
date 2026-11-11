import Image from 'next/image';
import Link from 'next/link';

// Avocat DS v4 Logo — spec: design-system/v4/components/Logo.md.
// The calligraphic A monogram, one PNG per ink (no CSS filters), plus the AVOCAT wordmark.
// TODO(ds-v4): export the monogram as a single-path SVG (fill="currentColor") and drop the PNGs.
type LogoVariant = 'mark' | 'wordmark' | 'lockup';
type LogoTone = 'ink' | 'cream' | 'gold';

interface LogoProps {
  variant?: LogoVariant;
  /** ink on light grounds, cream on dark, gold for the rail and favicon. */
  tone?: LogoTone;
  /** Mark height in px (min 20). */
  size?: number;
  /** Link target; pass "" to render without a link. */
  href?: string;
  className?: string;
}

const MARK_RATIO = 158 / 154;
// Fixed inks (not theme roles): the logo keeps its colour on any ground.
const WORDMARK_TONE: Record<LogoTone, string> = {
  ink: 'var(--neutral-900)',
  cream: 'var(--neutral-50)',
  gold: 'var(--gold-500)',
};

export default function Logo({ variant = 'lockup', tone = 'ink', size = 32, href = '/', className = '' }: LogoProps) {
  const h = Math.max(size, 20);
  const mark = (
    <Image
      src={`/brand/avocat-mark-${tone}.png`}
      alt={variant === 'mark' ? 'Avocat' : ''}
      width={Math.round(h * MARK_RATIO)}
      height={h}
      priority
    />
  );
  const wordmark = (
    <span
      className="font-display font-semibold uppercase leading-none tracking-[0.14em]"
      style={{ fontSize: Math.round(h * 0.62), color: WORDMARK_TONE[tone] }}
    >
      Avocat
    </span>
  );
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {variant !== 'wordmark' && mark}
      {variant !== 'mark' && wordmark}
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label="Avocat — inicio" className="inline-flex">
      {content}
    </Link>
  );
}
