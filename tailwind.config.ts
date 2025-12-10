import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
      maxWidth: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        display: ['var(--font-size-display)', { lineHeight: 'var(--line-height-display)', fontWeight: 'var(--font-weight-bold)' }],
        title: ['var(--font-size-title)', { lineHeight: 'var(--line-height-title)', fontWeight: 'var(--font-weight-semibold)' }],
        headline: ['var(--font-size-headline)', { lineHeight: 'var(--line-height-headline)', fontWeight: 'var(--font-weight-semibold)' }],
        'body-large': ['var(--font-size-body-large)', { lineHeight: 'var(--line-height-body-large)', fontWeight: 'var(--font-weight-regular)' }],
        body: ['var(--font-size-body)', { lineHeight: 'var(--line-height-body)', fontWeight: 'var(--font-weight-regular)' }],
        'body-small': ['var(--font-size-body-small)', { lineHeight: 'var(--line-height-body-small)', fontWeight: 'var(--font-weight-regular)' }],
        caption: ['var(--font-size-caption)', { lineHeight: 'var(--line-height-caption)', fontWeight: 'var(--font-weight-regular)' }],
      },
      fontWeight: {
        regular: 'var(--font-weight-regular)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        DEFAULT: 'var(--radius-md)',
      },
      spacing: {
        '0': 'var(--spacing-0)',
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '5': 'var(--spacing-5)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
        '10': 'var(--spacing-10)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
      },
      boxShadow: {
        '2xs': 'var(--shadow-2xs)',
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          active: 'hsl(var(--primary-active))',
          disabled: 'hsl(var(--primary-disabled))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
        info: 'hsl(var(--info))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        surface: {
          base: 'hsl(var(--surface-base))',
          elevated: 'hsl(var(--surface-elevated))',
          overlay: 'hsl(var(--surface-overlay))',
        },
      },
      transitionDuration: {
        'fast': 'var(--motion-duration-fast)',
        'normal': 'var(--motion-duration-normal)',
        'slow': 'var(--motion-duration-slow)',
      },
      transitionTimingFunction: {
        'standard': 'var(--motion-easing-standard)',
        'decelerate': 'var(--motion-easing-decelerate)',
        'accelerate': 'var(--motion-easing-accelerate)',
      },
      zIndex: {
        'dropdown': 'var(--z-index-dropdown)',
        'modal': 'var(--z-index-modal)',
        'toast': 'var(--z-index-toast)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down var(--motion-duration-normal) var(--motion-easing-standard)",
        "accordion-up": "accordion-up var(--motion-duration-normal) var(--motion-easing-standard)",
        "fade-in": "fade-in var(--motion-duration-normal) var(--motion-easing-standard)",
        "fade-out": "fade-out var(--motion-duration-normal) var(--motion-easing-standard)",
        "slide-in-from-top": "slide-in-from-top var(--motion-duration-normal) var(--motion-easing-decelerate)",
        "slide-in-from-bottom": "slide-in-from-bottom var(--motion-duration-normal) var(--motion-easing-decelerate)",
        "slide-in-from-left": "slide-in-from-left var(--motion-duration-normal) var(--motion-easing-decelerate)",
        "slide-in-from-right": "slide-in-from-right var(--motion-duration-normal) var(--motion-easing-decelerate)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
