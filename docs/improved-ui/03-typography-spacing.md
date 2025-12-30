# Typography & Spacing System

> Consistent text hierarchy and breathing room

## Typography Philosophy

Financial data requires clarity above all. Our typography system prioritizes:
- **Readability** - Numbers must be instantly scannable
- **Hierarchy** - Clear distinction between headings, body, and details
- **Warmth** - Approachable without being playful

---

## Font Stack

### Primary Font: Inter

Inter is the recommended font for Celeiro:
- Excellent number legibility
- Clean, modern, professional
- Great at all sizes
- Open source

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Tabular Numbers

For financial data, use tabular (monospace) numbers so columns align:

```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

**Usage:** All currency values, dates, percentages

---

## Type Scale

Based on a 1.25 ratio (Major Third), optimized for desktop:

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| `display` | 36px / 2.25rem | 1.2 | 700 | Page titles, hero numbers |
| `h1` | 30px / 1.875rem | 1.25 | 700 | Section headers |
| `h2` | 24px / 1.5rem | 1.3 | 600 | Card titles, sub-sections |
| `h3` | 20px / 1.25rem | 1.4 | 600 | Widget headers |
| `h4` | 16px / 1rem | 1.4 | 600 | Small section headers |
| `body` | 14px / 0.875rem | 1.5 | 400 | Default text |
| `body-sm` | 13px / 0.8125rem | 1.5 | 400 | Dense lists, tables |
| `caption` | 12px / 0.75rem | 1.4 | 500 | Labels, metadata |
| `tiny` | 11px / 0.6875rem | 1.3 | 500 | Badges, fine print |

### Tailwind Classes

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontSize: {
        'display': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['1.875rem', { lineHeight: '1.25', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        'tiny': ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],
      }
    }
  }
}
```

---

## Text Colors

Using the Stone neutral palette for text hierarchy:

| Level | Color | Tailwind | Usage |
|-------|-------|----------|-------|
| Primary | `#1C1917` | `text-stone-900` | Headings, important text |
| Secondary | `#57534E` | `text-stone-600` | Body text, descriptions |
| Tertiary | `#78716C` | `text-stone-500` | Captions, metadata |
| Disabled | `#A8A29E` | `text-stone-400` | Placeholder, disabled |
| Muted | `#D6D3D1` | `text-stone-300` | Decorative, dividers |

### Semantic Text Colors

```css
/* Status text */
.text-success { color: var(--sage-700); }    /* #15803D */
.text-warning { color: var(--terra-700); }   /* #C2410C */
.text-error   { color: var(--rust-700); }    /* #B91C1C */
.text-info    { color: var(--wheat-700); }   /* #B45309 */
```

---

## Number Formatting

### Currency Display

```typescript
// Large amounts (hero numbers)
formatCurrency(1234.56, 'display')  // R$ 1.234,56
// Standard amounts
formatCurrency(1234.56, 'body')     // R$ 1.234,56
// Compact amounts (for tight spaces)
formatCurrency(1234.56, 'compact')  // R$ 1,2k

// Component styling
<span className="text-display tabular-nums text-stone-900">
  R$ 1.234,56
</span>
```

### Percentage Display

```typescript
// Progress percentages
formatPercent(0.75)  // 75%
// Change percentages
formatPercent(0.12, { showSign: true })  // +12%
formatPercent(-0.08, { showSign: true }) // -8%
```

---

## Spacing Scale

Based on 4px base unit, following an 8-point grid:

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `space-0` | 0px | `p-0`, `m-0` | Reset |
| `space-1` | 4px | `p-1`, `m-1` | Tight inline spacing |
| `space-2` | 8px | `p-2`, `m-2` | Icon gaps, inline elements |
| `space-3` | 12px | `p-3`, `m-3` | Compact card padding |
| `space-4` | 16px | `p-4`, `m-4` | Standard card padding |
| `space-5` | 20px | `p-5`, `m-5` | Comfortable spacing |
| `space-6` | 24px | `p-6`, `m-6` | Section padding |
| `space-8` | 32px | `p-8`, `m-8` | Large section gaps |
| `space-10` | 40px | `p-10`, `m-10` | Page section margins |
| `space-12` | 48px | `p-12`, `m-12` | Major section breaks |
| `space-16` | 64px | `p-16`, `m-16` | Page margins |

---

## Component Spacing Patterns

### Cards

```
┌─────────────────────────────────┐
│  p-6 (24px)                     │
│  ┌─────────────────────────┐    │
│  │ Header                   │    │
│  └─────────────────────────┘    │
│        ↕ space-4 (16px)         │
│  ┌─────────────────────────┐    │
│  │ Body Content             │    │
│  └─────────────────────────┘    │
│        ↕ space-4 (16px)         │
│  ┌─────────────────────────┐    │
│  │ Footer/Actions           │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**Standard card:** `p-6 space-y-4`
**Compact card:** `p-4 space-y-3`

### Page Layout

```
┌─────────────────────────────────────────────┐
│ Navigation (h-16, py-4)                     │
├─────────────────────────────────────────────┤
│                                             │
│  px-8 (32px side padding)                   │
│  py-8 (32px top padding)                    │
│                                             │
│  ┌───────────────────────────────────┐      │
│  │ Page Header                        │      │
│  └───────────────────────────────────┘      │
│                                             │
│        ↕ space-8 (32px)                     │
│                                             │
│  ┌───────────────────────────────────┐      │
│  │ Main Content                       │      │
│  └───────────────────────────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
```

### Forms

```
Form Field Spacing:
┌─────────────────────────────────┐
│ Label            (text-caption) │
│        ↕ space-2 (8px)          │
│ ┌─────────────────────────────┐ │
│ │ Input field     (h-10, p-3) │ │
│ └─────────────────────────────┘ │
│        ↕ space-1 (4px)          │
│ Helper text       (text-tiny)   │
└─────────────────────────────────┘
       ↕ space-6 (24px) between fields
```

### Grids

```css
/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px; /* space-6 */
}

/* Card grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px; /* space-4 */
}
```

---

## Content Width

### Max Widths

| Token | Value | Usage |
|-------|-------|-------|
| `max-w-sm` | 384px | Narrow modals |
| `max-w-md` | 448px | Standard modals |
| `max-w-lg` | 512px | Wide modals |
| `max-w-xl` | 576px | Extra wide modals |
| `max-w-2xl` | 672px | Full forms |
| `max-w-4xl` | 896px | Content pages |
| `max-w-6xl` | 1152px | Dashboard |
| `max-w-7xl` | 1280px | Full app width |

### Content Container

```tsx
// Main content wrapper
<div className="max-w-7xl mx-auto px-8">
  {children}
</div>

// Narrow content (forms, settings)
<div className="max-w-2xl mx-auto px-8">
  {children}
</div>
```

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Standard desktop |
| `2xl` | 1536px | Large desktop |

### Responsive Typography

```tsx
// Hero number
<h1 className="text-h2 md:text-h1 lg:text-display">
  R$ 1.234,56
</h1>

// Page title
<h1 className="text-h3 md:text-h2 lg:text-h1">
  Orçamento de Dezembro
</h1>
```

---

## Line Length

For optimal readability:
- **Body text:** 60-75 characters per line
- **Headings:** 40-60 characters per line

```css
/* Prose content */
.prose {
  max-width: 65ch; /* ~65 characters */
}
```

---

## Vertical Rhythm

Maintain consistent vertical spacing using multiples of 8px:

```css
/* Section spacing */
.section + .section {
  margin-top: 48px; /* space-12 */
}

/* Card groups */
.card-group > * + * {
  margin-top: 16px; /* space-4 */
}

/* Inline content */
.inline-group > * + * {
  margin-left: 8px; /* space-2 */
}
```

---

## Implementation Checklist

- [ ] Add Inter font via Google Fonts or self-hosted
- [ ] Configure tailwind.config.js with type scale
- [ ] Add `tabular-nums` utility class
- [ ] Create text color semantic classes
- [ ] Implement consistent card padding (p-6)
- [ ] Update page containers to max-w-7xl px-8
- [ ] Add spacing utility classes for common patterns
