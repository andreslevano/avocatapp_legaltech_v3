import { ButtonHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { buttonClasses, type ButtonVariant } from './Button';

// Avocat DS v4 IconButton — spec: design-system/v4/components/IconButton.md
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Required accessible name — becomes aria-label and title. Say the action ("Copiar respuesta"). */
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  /** Toggle state → aria-pressed. */
  pressed?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, variant = 'ghost', size = 'md', pressed, className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={[
        buttonClasses({ variant, size }),
        '!px-0',
        size === 'sm' ? 'w-8' : 'w-10',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      <Icon size={size === 'sm' ? 16 : 20} aria-hidden />
    </button>
  )
);

IconButton.displayName = 'IconButton';

export { IconButton };
export type { IconButtonProps };
