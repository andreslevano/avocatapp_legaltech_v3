import { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'dark' | 'gold' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// DS v4 roles (spec: design-system/v4/components/Card.md). `dark` is kept for compatibility: it forces the
// dark theme on the card instead of hard-coding dark colours.
const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:  'bg-surface border border-border shadow-sm',
  dark:     'bg-surface border border-border text-text',
  gold:     'bg-accent-subtle border border-accent-border',
  elevated: 'bg-surface border border-border shadow-md',
};

const PADDING_CLASSES = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-theme={variant === 'dark' ? 'dark' : undefined}
      className={[
        'rounded-lg',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-h3 text-text-heading leading-snug ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-body-sm text-text-muted ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 pt-4 border-t border-border ${className}`} {...props}>
      {children}
    </div>
  );
}

export type { CardVariant, CardProps };
