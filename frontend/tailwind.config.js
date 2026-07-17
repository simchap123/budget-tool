/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // x.ai Design System Colors
        ink: {
          50: '#fafaf7',
          100: '#f5f5f2',
          200: '#e5e5e1',
          300: '#d1d1cc',
          400: '#afafaa',
          500: '#7d8187',
          600: '#5e5e5e',
          700: '#363a3f',
          800: '#1a1c20',
          900: '#0a0a0a',
        },
        accent: {
          sunset: '#ff7a17',
          'sunset-soft': '#ffc285',
          dusk: '#7c3aed',
          twilight: '#c4b5fd',
          breeze: '#a0c3ec',
          midnight: '#0d1726',
        },
        canvas: {
          DEFAULT: '#0a0a0a',
          soft: '#1a1c20',
          card: '#191919',
          mid: '#363a3f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['GeistMono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display-xl': ['96px', { lineHeight: '96px', letterSpacing: '-2.4px', fontWeight: '400' }],
        'display-lg': ['72px', { lineHeight: '72px', letterSpacing: '-1.8px', fontWeight: '400' }],
        'display-md': ['48px', { lineHeight: '48px', letterSpacing: '-1.2px', fontWeight: '400' }],
        'display-sm': ['32px', { lineHeight: '36px', letterSpacing: '-0.6px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption-mono': ['14px', { lineHeight: '20px', letterSpacing: '1.4px', fontWeight: '400' }],
      },
      borderRadius: {
        none: '0px',
        sm: '8px',
        pill: '9999px',
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out both',
        'slide-down': 'slideDown 200ms ease-out both',
        'scale-in': 'scaleIn 150ms ease-out both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
