/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488', // ← Primary teal
          700: '#0f766e',
          800: '#115e59', // ← Secondary teal
          900: '#134e4a',
          950: '#042f2e',
          DEFAULT: '#0d9488',
        },
        // Board surfaces
        blackboard: {
          DEFAULT: '#202020',
          dark: '#141414',
          light: '#2a2a2a',
        },
        chalkboard: {
          DEFAULT: '#173F35',
          dark: '#0d2b24',
          light: '#1f5247',
          chalk: '#e8e0d0',
        },
        // Neutral scale tuned for high contrast on dark boards
        ink: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
        // Highlight / annotation colors
        highlight: {
          yellow: '#FDE68A',
          green:  '#6EE7B7',
          blue:   '#93C5FD',
          pink:   '#F9A8D4',
          orange: '#FBB78A',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        telugu: [
          '"Noto Sans Telugu"',
          'sans-serif',
        ],
        devanagari: [
          '"Noto Sans Devanagari"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          'monospace',
        ],
      },

      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '1rem' }],
      },

      spacing: {
        'toolbar': '3.5rem',    // 56px fixed toolbar
        'sidebar': '16rem',     // 256px sidebar
        'panel':   '20rem',     // 320px side panel
      },

      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },

      boxShadow: {
        'board':    '0 4px 32px 0 rgba(0,0,0,0.45)',
        'toolbar':  '0 2px 12px 0 rgba(0,0,0,0.3)',
        'panel':    '4px 0 24px 0 rgba(0,0,0,0.2)',
        'float':    '0 8px 32px 0 rgba(0,0,0,0.25)',
        'glow-primary': '0 0 20px rgba(13,148,136,0.4)',
      },

      animation: {
        // Whiteboard transitions
        'slide-in-right':  'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left':   'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-up':     'slideInUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-down':   'slideInDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':         'fadeIn 0.2s ease-out',
        'fade-out':        'fadeOut 0.2s ease-in',
        'scale-in':        'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'scale-out':       'scaleOut 0.15s ease-in',
        // Teaching tools
        'spotlight-pulse': 'spotlightPulse 2s ease-in-out infinite',
        'curtain-down':    'curtainDown 0.6s cubic-bezier(0.16,1,0.3,1)',
        'curtain-up':      'curtainUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'chalk-draw':      'chalkDraw 0.4s ease-out',
        'page-turn':       'pageTurn 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
        // UI polish
        'bounce-subtle':   'bounceSubtle 0.5s cubic-bezier(0.36,0.07,0.19,0.97)',
        'wiggle':          'wiggle 0.3s ease-in-out',
        'pulse-soft':      'pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':       'spin 3s linear infinite',
        'float':           'float 3s ease-in-out infinite',
      },

      keyframes: {
        slideInRight: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideInLeft: {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        slideInUp: {
          '0%':   { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideInDown: {
          '0%':   { transform: 'translateY(-24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        scaleOut: {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        spotlightPulse: {
          '0%, 100%': { boxShadow: '0 0 60px 20px rgba(13,148,136,0.3)' },
          '50%':      { boxShadow: '0 0 80px 30px rgba(13,148,136,0.5)' },
        },
        curtainDown: {
          '0%':   { transform: 'scaleY(0)', transformOrigin: 'top' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'top' },
        },
        curtainUp: {
          '0%':   { transform: 'scaleY(1)', transformOrigin: 'top' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'top' },
        },
        chalkDraw: {
          '0%':   { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
        pageTurn: {
          '0%':   { transform: 'rotateY(0deg)',    opacity: '1' },
          '50%':  { transform: 'rotateY(-90deg)',  opacity: '0' },
          '51%':  { transform: 'rotateY(90deg)',   opacity: '0' },
          '100%': { transform: 'rotateY(0deg)',    opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '40%':      { transform: 'translateY(-6px)' },
          '60%':      { transform: 'translateY(-3px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%':      { transform: 'rotate(3deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      zIndex: {
        'canvas':    '10',
        'toolbar':   '20',
        'panel':     '30',
        'overlay':   '40',
        'modal':     '50',
        'spotlight': '60',
        'toast':     '70',
      },

      backgroundImage: {
        'grid-light': 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
        'grid-dark':  'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        'dots-light': 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
        'dots-dark':  'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
        'board-gradient': 'linear-gradient(180deg, #202020 0%, #1a1a1a 100%)',
      },
    },
  },
  plugins: [],
};
