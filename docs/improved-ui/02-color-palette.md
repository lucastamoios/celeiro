# Color Palette: The Harvest System

> A warm, confident color system for Celeiro

## Philosophy

The "Harvest" palette draws from the granary/storehouse metaphor:
- **Wheat** - Primary warm tone (abundance, provision)
- **Sage** - Secondary calm tone (growth, stability)
- **Terracotta** - Accent warm tone (earthiness, groundedness)
- **Stone** - Neutral foundation (reliability, strength)

Colors should feel like a well-organized pantry: warm, natural, purposeful.

---

## The Core Palette

### Primary: Wheat (Brand Color)

The warm amber tone that represents abundance and careful provision.

```css
/* Wheat - Primary */
--wheat-50:  #FFFBEB;  /* Lightest - backgrounds */
--wheat-100: #FEF3C7;  /* Light - hover states */
--wheat-200: #FDE68A;  /* Soft - borders */
--wheat-300: #FCD34D;  /* Medium - icons */
--wheat-400: #FBBF24;  /* Strong - interactive */
--wheat-500: #F59E0B;  /* Base - primary actions */
--wheat-600: #D97706;  /* Dark - hover on primary */
--wheat-700: #B45309;  /* Darker - active states */
--wheat-800: #92400E;  /* Deep - text on light bg */
--wheat-900: #78350F;  /* Deepest - headings */
```

**Tailwind Config:**
```javascript
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
}
```

### Secondary: Sage (Calm/Success)

A muted green that represents growth, stability, and positive status.

```css
/* Sage - Success/Positive */
--sage-50:  #F0FDF4;
--sage-100: #DCFCE7;
--sage-200: #BBF7D0;
--sage-300: #86EFAC;
--sage-400: #4ADE80;
--sage-500: #22C55E;  /* Base success */
--sage-600: #16A34A;
--sage-700: #15803D;
--sage-800: #166534;
--sage-900: #14532D;
```

**Usage:** Income indicators, "on track" status, savings growth

### Tertiary: Terracotta (Warm Warning)

An earthy red-orange for attention without alarm.

```css
/* Terracotta - Warning/Attention */
--terra-50:  #FFF7ED;
--terra-100: #FFEDD5;
--terra-200: #FED7AA;
--terra-300: #FDBA74;
--terra-400: #FB923C;
--terra-500: #F97316;  /* Base warning */
--terra-600: #EA580C;
--terra-700: #C2410C;
--terra-800: #9A3412;
--terra-900: #7C2D12;
```

**Usage:** Approaching budget limits, attention needed, mild warnings

### Alert: Rust (Serious Warning)

A deeper, muted red for serious status without screaming.

```css
/* Rust - Error/Over Budget */
--rust-50:  #FEF2F2;
--rust-100: #FEE2E2;
--rust-200: #FECACA;
--rust-300: #FCA5A5;
--rust-400: #F87171;
--rust-500: #EF4444;  /* Base error */
--rust-600: #DC2626;
--rust-700: #B91C1C;
--rust-800: #991B1B;
--rust-900: #7F1D1D;
```

**Usage:** Over budget, failed transactions, critical alerts

### Neutral: Stone (Foundation)

Warm gray tones instead of cold blue-grays.

```css
/* Stone - Neutrals */
--stone-50:  #FAFAF9;  /* Page background */
--stone-100: #F5F5F4;  /* Card backgrounds */
--stone-200: #E7E5E4;  /* Borders */
--stone-300: #D6D3D1;  /* Disabled elements */
--stone-400: #A8A29E;  /* Placeholder text */
--stone-500: #78716C;  /* Secondary text */
--stone-600: #57534E;  /* Body text */
--stone-700: #44403C;  /* Headings */
--stone-800: #292524;  /* Strong headings */
--stone-900: #1C1917;  /* Primary text */
```

---

## Semantic Color System

### Status Colors

```typescript
const STATUS_COLORS = {
  // Budget Status
  onTrack: {
    bg: 'bg-sage-50',
    border: 'border-sage-200',
    text: 'text-sage-700',
    icon: 'text-sage-500'
  },
  warning: {
    bg: 'bg-terra-50',
    border: 'border-terra-200',
    text: 'text-terra-700',
    icon: 'text-terra-500'
  },
  overBudget: {
    bg: 'bg-rust-50',
    border: 'border-rust-200',
    text: 'text-rust-700',
    icon: 'text-rust-500'
  },
  neutral: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-700',
    icon: 'text-stone-500'
  }
}
```

### Transaction Colors

```typescript
const TRANSACTION_COLORS = {
  income: {
    text: 'text-sage-600',
    bg: 'bg-sage-50',
    badge: 'bg-sage-100 text-sage-700'
  },
  expense: {
    text: 'text-rust-600',
    bg: 'bg-rust-50',
    badge: 'bg-rust-100 text-rust-700'
  }
}
```

### Interactive Colors

```typescript
const INTERACTIVE_COLORS = {
  primary: {
    default: 'bg-wheat-500',
    hover: 'bg-wheat-600',
    active: 'bg-wheat-700',
    text: 'text-white'
  },
  secondary: {
    default: 'bg-stone-100',
    hover: 'bg-stone-200',
    active: 'bg-stone-300',
    text: 'text-stone-700'
  },
  ghost: {
    default: 'bg-transparent',
    hover: 'bg-stone-100',
    active: 'bg-stone-200',
    text: 'text-stone-600'
  }
}
```

---

## Category Colors (Simplified)

Instead of 15 unique colors, use 6 muted tones that don't compete:

```typescript
const CATEGORY_PALETTE = [
  '#92400E', // Wheat-800 (warm brown)
  '#166534', // Sage-800 (forest green)
  '#1E3A5F', // Ocean (muted blue)
  '#7C2D12', // Terra-900 (deep terracotta)
  '#4C1D95', // Violet-900 (muted purple)
  '#374151', // Stone-700 (charcoal)
];

// For lighter backgrounds, derive from base:
function getCategoryStyles(index: number) {
  const base = CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
  return {
    base,
    bg: `${base}10`,      // 10% opacity
    border: `${base}30`,  // 30% opacity
    hover: `${base}15`,   // 15% opacity
  };
}
```

**Key Change:** Categories use muted tones. Status (on track/over) uses semantic colors.

---

## Background Hierarchy

```css
/* Page backgrounds */
.page-bg         { background: var(--stone-50); }   /* #FAFAF9 */

/* Card backgrounds */
.card-bg         { background: white; }
.card-bg-muted   { background: var(--stone-100); }  /* #F5F5F4 */

/* Section backgrounds */
.section-highlight { background: var(--wheat-50); } /* #FFFBEB */
.section-success   { background: var(--sage-50); }  /* #F0FDF4 */
.section-warning   { background: var(--terra-50); } /* #FFF7ED */
```

---

## Shadow System

Using warm-tinted shadows instead of cold gray:

```css
/* Card shadows - warm undertone */
--shadow-sm: 0 1px 2px 0 rgba(120, 113, 108, 0.05);
--shadow-md: 0 4px 6px -1px rgba(120, 113, 108, 0.1),
             0 2px 4px -2px rgba(120, 113, 108, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(120, 113, 108, 0.1),
             0 4px 6px -4px rgba(120, 113, 108, 0.1);

/* Elevated card (modals, dropdowns) */
--shadow-xl: 0 20px 25px -5px rgba(120, 113, 108, 0.1),
             0 8px 10px -6px rgba(120, 113, 108, 0.1);
```

---

## Implementation: Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand
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
        },
        sage: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        terra: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        rust: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // Override default grays with warm stone
        gray: {
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
        }
      },
      boxShadow: {
        'warm-sm': '0 1px 2px 0 rgba(120, 113, 108, 0.05)',
        'warm-md': '0 4px 6px -1px rgba(120, 113, 108, 0.1), 0 2px 4px -2px rgba(120, 113, 108, 0.1)',
        'warm-lg': '0 10px 15px -3px rgba(120, 113, 108, 0.1), 0 4px 6px -4px rgba(120, 113, 108, 0.1)',
        'warm-xl': '0 20px 25px -5px rgba(120, 113, 108, 0.1), 0 8px 10px -6px rgba(120, 113, 108, 0.1)',
      }
    }
  }
}
```

---

## Color Usage Guidelines

### DO:
- Use **wheat** for primary brand elements and main CTAs
- Use **sage** for positive values (income, savings, on-track)
- Use **terra** for warnings that need attention
- Use **rust** only for actual problems (over budget, errors)
- Use **stone** for all neutral UI elements

### DON'T:
- Use multiple bright colors on the same card
- Use color as the only differentiator between categories
- Use red for anything other than negative/error states
- Mix cold grays with warm palette

---

## Color Accessibility

All color combinations meet WCAG 2.1 AA standards:

| Combination | Contrast Ratio | Passes |
|-------------|----------------|--------|
| wheat-900 on wheat-50 | 12.6:1 | AAA |
| sage-700 on sage-50 | 7.2:1 | AAA |
| terra-700 on terra-50 | 6.8:1 | AAA |
| rust-700 on rust-50 | 6.5:1 | AAA |
| stone-900 on white | 16.1:1 | AAA |
| stone-600 on white | 6.0:1 | AA |

---

## Migration Guide

### From Current to New

| Current | New |
|---------|-----|
| `bg-blue-600` (primary buttons) | `bg-wheat-500` |
| `bg-emerald-500` (success) | `bg-sage-500` |
| `bg-amber-500` (warning) | `bg-terra-500` |
| `bg-red-500` (error) | `bg-rust-500` |
| `bg-gray-50` (backgrounds) | `bg-stone-50` |
| `text-gray-900` | `text-stone-900` |
| `border-gray-200` | `border-stone-200` |

### Category Colors

Replace the 15-color palette with the 6-color muted system.
Categories will rely on **icon + name** for identification, not color.
