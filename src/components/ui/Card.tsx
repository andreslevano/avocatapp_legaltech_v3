import { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'dark' | 'gold' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:  'bg-white border border-avocat-border shadow-card',
  dark:     'bg-ds-card border border-ds-border text-ds-text',
  gold:     'bg-avocat-gold-bg border border-avocat-gold-l',
  elevated: 'bg-white border border-avocat-border shadow-elevated',
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
      className={[
        'rounded-xl',
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
      className={`font-display text-h3 text-avocat-black leading-snug ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-body text-avocat-gray5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 pt-4 border-t border-avocat-border ${className}`} {...props}>
      {children}
    </div>
  );
}

export type { CardVariant, CardProps };
