import { HTMLAttributes } from 'react';

type TagVariant = 'dark' | 'light' | 'gold' | 'muted';
type TagSize = 'sm' | 'md';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  size?: TagSize;
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  dark:  'bg-avocat-black text-avocat-cream',
  light: 'bg-white text-avocat-black border border-avocat-border',
  gold:  'bg-avocat-gold-bg text-avocat-gold border border-avocat-gold-l',
  muted: 'bg-avocat-muted text-avocat-gray5',
};

const SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-label',
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
        'inline-flex items-center font-sans font-medium rounded-full tracking-wide',
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
