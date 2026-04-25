import Image from 'next/image';
import Link from 'next/link';

type LogoVariant = 'symbol' | 'stacked' | 'signature';
type LogoTheme = 'dark' | 'light' | 'gold';

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: number;
  href?: string;
  className?: string;
}

const VARIANT_CONFIG: Record<LogoVariant, { src: string; width: number; height: number; alt: string }> = {
  symbol: {
    src: '/logos/avocat-symbol.svg',
    width: 40,
    height: 40,
    alt: 'Avocat',
  },
  stacked: {
    src: '/logos/avocat-stacked.svg',
    width: 120,
    height: 80,
    alt: 'Avocat — Plataforma LegalTech',
  },
  signature: {
    src: '/logos/avocat-signature.svg',
    width: 160,
    height: 36,
    alt: 'Avocat',
  },
};

export default function Logo({
  variant = 'signature',
  theme = 'dark',
  size,
  href = '/',
  className = '',
}: LogoProps) {
  const config = VARIANT_CONFIG[variant];

  const width = size ?? config.width;
  const height = size
    ? Math.round(size * (config.height / config.width))
    : config.height;

  const themeFilter =
    theme === 'light'
      ? 'brightness(0) invert(1)'
      : theme === 'gold'
      ? 'brightness(0) saturate(100%) invert(58%) sepia(49%) saturate(500%) hue-rotate(2deg) brightness(90%)'
      : undefined;

  const img = (
    <Image
      src={config.src}
      alt={config.alt}
      width={width}
      height={height}
      priority
      style={themeFilter ? { filter: themeFilter } : undefined}
      className={className}
    />
  );

  if (!href) return img;

  return (
    <Link href={href} aria-label="Avocat — inicio">
      {img}
    </Link>
  );
}
