import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: '#c5256e',
        'brand-deep': '#a11857',
        'brand-soft': '#f7d9e6',
        'brand-tint': '#fceef4',
        cream: '#f6f1ea',
        'cream-2': '#efe7da',
        paper: '#fbf8f3',
        ink: '#1a1816',
        'ink-2': '#3b3733',
        muted: '#736c63',
        line: '#e6dfd1',
        sage: '#5e7d6a',
        'sage-soft': '#e2ece4',
        dark: '#2a2521',
        'dark-2': '#352f29',
      },
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '11px',
        DEFAULT: '16px',
        lg: '22px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}

export default config
