# UI Redesign: Harvest Design System

## Why

The current Celeiro UI has grown organically with features, resulting in visual chaos that undermines user confidence. With 15+ competing accent colors, inconsistent component patterns, and no clear information hierarchy, users struggle to answer basic questions like "Am I on track this month?" The UI feels clinical rather than warm, contradicting the "Celeiro" (granary/storehouse) brand promise of organized abundance and confident stewardship.

## What Changes

### Phase 1: Foundation
- **BREAKING**: Replace current color palette with "Harvest" design system (wheat, sage, terra, rust + stone neutrals)
- Add Inter font and tabular numbers for financial data
- Implement 8-point spacing grid system
- Create warm-tinted shadow utilities

### Phase 2: Components
- Standardize Button component (primary, secondary, ghost, danger variants)
- Standardize Card component (base, interactive, status variants)
- Create unified Modal pattern with consistent header/footer
- Standardize form inputs with consistent focus states
- Create Progress Bar components with status-aware coloring
- Create Badge and Toast components

### Phase 3: Pages
- **Dashboard**: Hero status card with instant budget answer, attention items, simplified category view
- **Transactions**: Date-grouped list, quick categorization dropdown, bulk actions
- **Budgets**: Single-month focus, expandable category rows, status indicators (✓ ⚠ ✗)
- **Goals**: Enhanced progress cards, contribution modal, celebration states

### Phase 4: Navigation
- Updated navigation bar with status indicators
- Keyboard navigation shortcuts
- Quick actions floating button (optional)

## Impact

- **Affected code**:
  - `frontend/tailwind.config.js` - New color tokens and utilities
  - `frontend/src/utils/colors.ts` - New color utilities
  - `frontend/src/components/*.tsx` - All major components
  - `frontend/src/App.tsx` - Navigation updates

- **User impact**:
  - Visual breaking change (different colors/styling)
  - Improved UX for budget status visibility
  - Reduced cognitive load from color consolidation

- **Reference documentation**:
  - `docs/improved-ui/index.md` - Overview
  - `docs/improved-ui/02-color-palette.md` - Color system
  - `docs/improved-ui/04-components.md` - Component library
  - `docs/improved-ui/05-dashboard.md` through `09-navigation.md` - Page specs
