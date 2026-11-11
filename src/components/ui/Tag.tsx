import { HTMLAttributes } from 'react';

type TagVariant = 'dark' | 'light' | 'gold' | 'muted';
type TagSize = 'sm' | 'md';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  size?: TagSize;
}

// DS v4 roles. For legal statuses use <StatusTag> instead.
const VARIANT_CLASSES: Record<TagVariant, string> = {
  dark:  'bg-surface-inverse text-text-inverse',
  light: 'bg-surface text-text border border-border',
  gold:  'bg-accent-subtle text-accent-text border border-accent-border',
  muted: 'bg-surface-muted text-text-muted',
};

const SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-3 py-1 text-small',
};

export function Tag({
  variant = 'muted',
  size = 'md',
  className = '',
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-sans font-medium rounded-full',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}

export type { TagVariant, TagSize, TagProps };
