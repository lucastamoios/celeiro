/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Provision Design System — warm cream palette with golden accent
      colors: {
        // Neutral scale — warm cream to dark brown (replaces cold stone)
        stone: {
          50: '#FFFDF8',   // bg-1 — card surface, inputs
          100: '#F6F1E9',  // bg-0 — page background
          200: '#F0EAE0',  // bg-2 — hover, subtle fills
          300: '#E8E1D5',  // bg-3 — progress tracks, dividers
          400: '#DED6C8',  // bg-4 — inactive, avatar placeholder
          500: '#A68A5B',  // text-4 — disabled, overlines
          600: '#8B7355',  // text-3 — muted, captions
          700: '#6B5744',  // text-2 — body text
          800: '#3D2B1F',  // text-1 — headings, primary text
          900: '#3D2B1F',  // text-1 — darkest
          950: '#2A1D14',  // near-black warm
        },
        // Primary accent — golden wheat
        wheat: {
          50: '#FDF6E8',
          100: '#F5E8CC',
          200: '#E8D4A0',
          300: '#D4A84E',  // accent-light
          400: '#C6943A',  // accent
          500: '#C6943A',  // accent (primary reference)
          600: '#A67A2A',  // accent-dark
          700: '#8A6520',
          800: '#6E5018',
          900: '#523C12',
          950: '#362808',
        },
        // Success — muted forest green
        sage: {
          50: '#F2F6F0',
          100: '#E0EAD9',
          200: '#C4D6B8',
          300: '#9BBD88',
          400: '#74A55E',
          500: '#5A8A4A',  // primary success
          600: '#4A7A3A',
          700: '#3D6930',
          800: '#335828',
          900: '#2A4921',
          950: '#1A2E14',
        },
        // Warning — burnt orange (distinct from accent gold)
        terra: {
          50: '#FDF4EE',
          100: '#FAE4D4',
          200: '#F3C8A6',
          300: '#E8A06E',
          400: '#DE8244',
          500: '#D4722A',  // primary warning
          600: '#B86124',
          700: '#9B5020',
          800: '#7E411C',
          900: '#653518',
          950: '#3E1F0E',
        },
        // Error — warm rust red
        rust: {
          50: '#FDF4F3',
          100: '#FCE5E3',
          200: '#F8CDCA',
          300: '#F0A8A2',
          400: '#E07A70',
          500: '#C4453A',  // primary error
          600: '#A83A30',
          700: '#8E3028',
          800: '#762924',
          900: '#622422',
          950: '#3D120F',
        },
      },
      // Warm shadows using brown tones
      boxShadow: {
        'warm-xs': '0 1px 2px 0 rgba(61, 43, 31, 0.04)',
        'warm-sm': '0 1px 3px rgba(61, 43, 31, 0.06)',
        'warm': '0 2px 8px rgba(61, 43, 31, 0.06), 0 0 0 1px rgba(61, 43, 31, 0.04)',
        'warm-md': '0 2px 12px rgba(61, 43, 31, 0.06), 0 0 0 1px rgba(61, 43, 31, 0.04)',
        'warm-lg': '0 8px 24px rgba(61, 43, 31, 0.08), 0 0 0 1px rgba(61, 43, 31, 0.04)',
        'warm-xl': '0 16px 32px rgba(61, 43, 31, 0.1), 0 0 0 1px rgba(61, 43, 31, 0.04)',
      },
      // Typography — Lora display + Nunito Sans body
      fontFamily: {
        sans: ['Nunito Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Lora', 'Georgia', 'serif'],
      },
      fontSize: {
        // Display scale (Lora)
        'display-lg': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }], // 28px
        'display': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.01em' }],   // 22px
        'display-sm': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.01em' }], // 18px
        // Body scale (Nunito Sans)
        'body-lg': ['0.9375rem', { lineHeight: '1.5rem' }],   // 15px
        'body': ['0.875rem', { lineHeight: '1.25rem' }],      // 14px
        'body-sm': ['0.8125rem', { lineHeight: '1.125rem' }], // 13px
        'caption': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'overline': ['0.6875rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.06em' }], // 11px
        // Legacy aliases
        'h1': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'h2': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        'h3': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'h4': ['1rem', { lineHeight: '1.375rem', fontWeight: '600' }],
      },
      // Spacing based on 8-point grid
      spacing: {
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px
        '11': '2.75rem',    // 44px
        '12': '3rem',       // 48px
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px
      },
      borderRadius: {
        'warm': '0.5rem',     // 8px — buttons, inputs
        'warm-md': '0.75rem', // 12px — cards
        'warm-lg': '1rem',    // 16px — modals, large panels
        'warm-xl': '1.25rem', // 20px — hero cards
      },
      // Ring colors for focus states
      ringColor: {
        wheat: {
          400: '#C6943A',
          500: '#C6943A',
          600: '#A67A2A',
        },
        sage: {
          500: '#5A8A4A',
        },
        rust: {
          500: '#C4453A',
        },
        stone: {
          300: '#E8E1D5',
          500: '#A68A5B',
        },
      },
    },
  },
  plugins: [],
}
