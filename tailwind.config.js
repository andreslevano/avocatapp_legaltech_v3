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
        // Brand palette v3 — warm legal-gold
        'avocat-black':   '#1e1e1e',
        'avocat-cream':   '#F9F4EA',
        'avocat-gold':    '#B8882A',
        'avocat-gold-l':  '#E8C97A',
        'avocat-gold-bg': '#FDF3DC',
        'avocat-border':  '#C8C0B0',
        'avocat-muted':   '#EDE8DE',
        'avocat-gray5':   '#5f5f5f',
        'avocat-gray9':   '#9a9a9a',
        // Dark surface tokens (app shell)
        'ds-bg':          '#161410',
        'ds-card':        '#1e1c16',
        'ds-card2':       '#252218',
        'ds-border':      '#2e2b20',
        'ds-text':        '#c8c0ac',
        'ds-head':        '#e8d4a0',
        // Semantic aliases (CSS var-backed for theming)
        app:              'var(--color-app)',
        sidebar:          'var(--color-sidebar)',
        card:             'var(--color-card)',
        border:           'var(--color-border)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-on-dark':   'var(--color-text-on-dark)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif:   ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
      },
      fontSize: {
        'h1': ['40px', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.35', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '1.45', fontWeight: '400' }],
        'label': ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(30,28,22,0.08), 0 4px 16px rgba(30,28,22,0.04)',
        'gold': '0 0 0 2px #B8882A',
        'elevated': '0 8px 32px rgba(30,28,22,0.12)',
      },
    },
  },
  plugins: [],
}
