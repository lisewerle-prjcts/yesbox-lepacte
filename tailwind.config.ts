import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        magenta: {
          DEFAULT: '#D63E7A',
          50: '#FCE8F1',
          100: '#F9D1E3',
          200: '#F3A3C7',
          300: '#ED75AB',
          400: '#E7478F',
          500: '#D63E7A',
          600: '#B02E61',
          700: '#8A2449',
          800: '#641A34',
          900: '#3E1020',
        },
        cream: {
          DEFAULT: '#FAF6F0',
          50: '#FDFCFA',
          100: '#FAF6F0',
          200: '#F5EDE1',
          300: '#EFE3D1',
          400: '#EAD9C2',
          500: '#E4CFB3',
        },
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

export default config
