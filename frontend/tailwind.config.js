/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Harvest Color Palette - Warm, confident, grounded
      colors: {
        // Primary brand color - Wheat/Amber tones
        wheat: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        // Success states - Muted sage green
        sage: {
          50: '#F6F7F4',
          100: '#E8EBE4',
          200: '#D3D9CB',
          300: '#B5C0A7',
          400: '#96A582',
          500: '#7A8B68',
          600: '#5F6E50',
          700: '#4B5741',
          800: '#3F4838',
          900: '#363D31',
          950: '#1B1F18',
        },
        // Warning states - Terracotta
        terra: {
          50: '#FDF6F3',
          100: '#FBEAE3',
          200: '#F7D5C7',
          300: '#F1B8A0',
          400: '#E99371',
          500: '#DF7246',
          600: '#D15A32',
          700: '#AE4628',
          800: '#8E3B25',
          900: '#753423',
          950: '#3F190F',
        },
        // Error/Over-budget states - Muted rust
        rust: {
          50: '#FDF5F4',
          100: '#FCE8E6',
          200: '#FAD5D1',
          300: '#F5B5AE',
          400: '#ED897E',
          500: '#E16254',
          600: '#CC4536',
          700: '#AB372A',
          800: '#8E3127',
          900: '#762F26',
          950: '#401510',
        },
        // Neutral tones - Warm stone (replaces cold gray)
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
      },
      // Custom box shadows with warm tones
      boxShadow: {
        'warm-xs': '0 1px 2px 0 rgba(120, 113, 108, 0.05)',
        'warm-sm': '0 1px 3px 0 rgba(120, 113, 108, 0.1), 0 1px 2px -1px rgba(120, 113, 108, 0.1)',
        'warm': '0 4px 6px -1px rgba(120, 113, 108, 0.1), 0 2px 4px -2px rgba(120, 113, 108, 0.1)',
        'warm-md': '0 4px 6px -1px rgba(120, 113, 108, 0.1), 0 2px 4px -2px rgba(120, 113, 108, 0.1)',
        'warm-lg': '0 10px 15px -3px rgba(120, 113, 108, 0.1), 0 4px 6px -4px rgba(120, 113, 108, 0.1)',
        'warm-xl': '0 20px 25px -5px rgba(120, 113, 108, 0.1), 0 8px 10px -6px rgba(120, 113, 108, 0.1)',
      },
      // Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Type scale
        'display': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '800', letterSpacing: '-0.02em' }], // 36px
        'h1': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }],   // 30px
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600', letterSpacing: '-0.01em' }],        // 24px
        'h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],                               // 20px
        'h4': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '500' }],                               // 18px
        'body': ['1rem', { lineHeight: '1.5rem' }],                                                    // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],                                            // 14px
        'caption': ['0.75rem', { lineHeight: '1rem' }],                                                // 12px
        'tiny': ['0.6875rem', { lineHeight: '0.875rem' }],                                             // 11px
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
        'warm': '0.75rem',    // 12px - standard card radius
        'warm-lg': '1rem',    // 16px - modal radius
        'warm-xl': '1.25rem', // 20px - large cards
      },
      // Extend ring colors to include custom palette
      ringColor: {
        wheat: {
          500: '#F59E0B',
          600: '#D97706',
        },
        sage: {
          500: '#7A8B68',
        },
        rust: {
          500: '#E16254',
        },
        stone: {
          300: '#D6D3D1',
          500: '#78716C',
        },
      },
    },
  },
  plugins: [],
}
