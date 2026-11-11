import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

// Avocat DS v4 Button — spec: design-system/v4/components/Button.md
type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';
/** @deprecated v3 names — mapped to v4 variants for one release. */
type LegacyVariant = 'BtnGold' | 'BtnDark' | 'BtnOutlineDark' | 'BtnOutlineGold' | 'BtnGhost';
type ButtonSize = 'sm' | 'md' | 'lg';

const LEGACY: Record<LegacyVariant, ButtonVariant> = {
  BtnDark: 'primary',
  BtnGold: 'accent',
  BtnOutlineDark: 'secondary',
  BtnOutlineGold: 'secondary',
  BtnGhost: 'ghost',
};

interface CommonProps {
  variant?: ButtonVariant | LegacyVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  /** Label shown while loading ("Generando…"); defaults to the children. */
  loadingText?: ReactNode;
  block?: boolean;
  /** @deprecated use `block` */
  fullWidth?: boolean;
  href?: string;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:     'bg-action-primary text-on-action-primary hover:bg-action-primary-hover',
  accent:      'bg-accent text-text-on-accent hover:bg-accent-hover',
  secondary:   'bg-surface text-text border border-border-strong hover:bg-surface-muted',
  ghost:       'bg-transparent text-text hover:bg-surface-muted',
  destructive: 'bg-danger text-on-danger hover:brightness-95',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-3 text-small rounded-sm gap-1.5',
  md: 'h-control-md px-5 text-body-sm rounded-md gap-2',
  lg: 'h-control-lg px-6 text-body rounded-md gap-2',
};

function resolveVariant(v: ButtonVariant | LegacyVariant): ButtonVariant {
  if (v in LEGACY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Button] variant "${v}" is deprecated — use "${LEGACY[v as LegacyVariant]}".`);
    }
    return LEGACY[v as LegacyVariant];
  }
  return v as ButtonVariant;
}

export function buttonClasses(
  { variant = 'primary', size = 'md', block = false }: { variant?: ButtonVariant | LegacyVariant; size?: ButtonSize; block?: boolean } = {},
): string {
  return [
    'inline-flex items-center justify-center font-sans font-medium select-none whitespace-nowrap',
    'transition-colors duration-fast ease-standard active:translate-y-px',
    'disabled:opacity-[0.45] disabled:cursor-not-allowed disabled:translate-y-0 aria-disabled:opacity-[0.45] aria-disabled:cursor-not-allowed',
    VARIANT_CLASSES[resolveVariant(variant)],
    SIZE_CLASSES[size],
    block ? 'w-full' : '',
  ].filter(Boolean).join(' ');
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: IconLeft,
      iconRight: IconRight,
      loading = false,
      loadingText,
      block = false,
      fullWidth = false,
      href,
      disabled,
      className = '',
      children,
      type,
      ...props
    },
    ref
  ) => {
    const iconSize = size === 'sm' ? 16 : 18;
    const classes = [buttonClasses({ variant, size, block: block || fullWidth }), className].filter(Boolean).join(' ');
    const content = (
      <>
        {loading
          ? <Loader2 size={iconSize} className="animate-spin" aria-hidden />
          : IconLeft && <IconLeft size={iconSize} aria-hidden />}
        {loading && loadingText ? loadingText : children}
        {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
      </>
    );

    if (href) {
      const { onClick, title, id, style } = props;
      return (
        <a
          href={disabled ? undefined : href}
          className={classes}
          aria-disabled={disabled || undefined}
          aria-busy={loading || undefined}
          onClick={onClick as AnchorHTMLAttributes<HTMLAnchorElement>['onClick']}
          title={title}
          id={id}
          style={style}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classes}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonVariant, ButtonSize, ButtonProps, LegacyVariant };
