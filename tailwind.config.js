/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Premium legal-tech grayscale palette (design tokens) */
        app: 'var(--color-app)',
        sidebar: 'var(--color-sidebar)',
        card: 'var(--color-card)',
        'surface-muted': 'var(--color-surface-muted)',
        border: 'var(--color-border)',
        hover: 'var(--color-hover)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-on-dark': 'var(--color-text-on-dark)',
        /* primary maps to Avocat palette (sidebar/main) */
        primary: {
          50: 'var(--color-app)',
          100: 'var(--color-surface-muted)',
          500: 'var(--color-border)',
          600: 'var(--color-sidebar)',
          700: 'var(--color-text-primary)',
          800: 'var(--color-text-primary)',
        },
      },
      fontFamily: {
        serif: ['var(--font-eb-garamond)', 'Garamond', 'Libre Baskerville', 'Times New Roman', 'serif'],
        sans: ['var(--font-eb-garamond)', 'Garamond', 'Libre Baskerville', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
}
