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
        // Display sizes are fluid: they hit the original desktop size at ~1280px
        // and shrink on small screens. Previously these were fixed px, so a
        // 72px <h1> overflowed a 375px viewport and forced the page to scroll
        // sideways. Line-height/tracking are unitless/em so they track the size.
        'display-xl': ['clamp(2.75rem, 8.5vw + 0.5rem, 6rem)', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-lg': ['clamp(2.25rem, 6.5vw + 0.5rem, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-md': ['clamp(1.75rem, 4.5vw + 0.5rem, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-sm': ['clamp(1.375rem, 2.5vw + 0.5rem, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '400' }],
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
        /* Minimum comfortable touch target (iOS HIG 44pt / Material 48dp). */
        touch: '44px',
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
        /* Phone-native motion: dialogs rise from the bottom edge rather than
           scaling from the middle, which reads as a sheet on a small screen. */
        sheetUp: {
          from: { opacity: '0', transform: 'translateY(12%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        overlayIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(120%) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        /* Springy easing — decelerates like a physical object instead of
           the linear-ish feel of plain ease-out. */
        'fade-in': 'fadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slideDown 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scaleIn 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheetUp 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'overlay-in': 'overlayIn 200ms ease-out both',
        'toast-in': 'toastIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
