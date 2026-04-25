import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'BtnGold' | 'BtnDark' | 'BtnOutlineDark' | 'BtnOutlineGold' | 'BtnGhost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  BtnGold:
    'bg-avocat-gold text-white hover:bg-[#a07824] active:bg-[#8c6920] shadow-sm',
  BtnDark:
    'bg-avocat-black text-avocat-cream hover:bg-[#2e2e2e] active:bg-[#1a1a1a]',
  BtnOutlineDark:
    'bg-transparent text-avocat-black border border-avocat-black hover:bg-avocat-black hover:text-avocat-cream',
  BtnOutlineGold:
    'bg-transparent text-avocat-gold border border-avocat-gold hover:bg-avocat-gold-bg',
  BtnGhost:
    'bg-transparent text-avocat-gray5 hover:bg-avocat-muted hover:text-avocat-black',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small rounded-sm gap-1.5',
  md: 'h-10 px-5 text-body rounded-md gap-2',
  lg: 'h-12 px-7 text-[17px] rounded-md gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'BtnDark',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-sans font-medium',
          'transition-colors duration-150 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-avocat-gold focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonVariant, ButtonSize, ButtonProps };
