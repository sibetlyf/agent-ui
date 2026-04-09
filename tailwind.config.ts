import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: {
          void: 'hsl(var(--surface-void))',
          deep: 'hsl(var(--surface-deep))',
          base: 'hsl(var(--surface-base))',
          raised: 'hsl(var(--surface-raised))',
          floating: 'hsl(var(--surface-floating))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
          glow: 'hsl(var(--primary-glow))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        chart: {
          cyan: 'hsl(var(--chart-cyan))',
          blue: 'hsl(var(--chart-blue))',
          amber: 'hsl(var(--chart-amber))',
          emerald: 'hsl(var(--chart-emerald))',
          rose: 'hsl(var(--chart-rose))'
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4'
        },
        brand: '#FF4017',
        positive: '#34d399'
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 0.5rem)',
        xl: 'var(--radius)',
        lg: 'calc(var(--radius) - 0.25rem)',
        md: 'calc(var(--radius) - 0.5rem)',
        sm: 'calc(var(--radius) - 0.75rem)'
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
        geist: 'var(--font-geist-sans)',
        dmmono: 'var(--font-dm-mono)'
      },
      boxShadow: {
        glow: '0 0 40px rgba(34, 211, 238, 0.15)',
        'glow-strong': '0 0 60px rgba(34, 211, 238, 0.25)',
        panel: '0 24px 90px rgba(0, 0, 0, 0.38)',
        elevated: '0 28px 90px rgba(0, 0, 0, 0.42)',
        message: '0 4px 20px rgba(0, 0, 0, 0.2)'
      },
      keyframes: {
        'message-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'fade-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'tool-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(34, 211, 238, 0.25)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' }
        }
      },
      animation: {
        'message-enter': 'message-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-scale-in': 'fade-scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        'tool-pulse': 'tool-pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      transitionTimingFunction: {
        'agent-smooth': 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config
