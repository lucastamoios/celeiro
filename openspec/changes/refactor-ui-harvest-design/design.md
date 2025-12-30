# Design: Harvest Design System

## Context

Celeiro is a personal finance management app for families. The name means "granary/storehouse" in Portuguese, evoking themes of:
- Sustainable provision (not empty accumulation)
- Organized abundance
- Warmth and groundedness

The current UI contradicts this with cold, clinical styling and rainbow color chaos.

### Stakeholders
- End users: Brazilian families managing household finances
- Development: Single developer maintaining frontend

### Constraints
- Must use existing Tailwind CSS infrastructure
- No new framework dependencies
- Incremental rollout possible (component by component)

## Goals / Non-Goals

### Goals
- Create visual hierarchy where budget status is instantly visible
- Reduce cognitive load through color consolidation
- Establish warm, confident emotional tone
- Standardize components for maintainability
- Follow YNAB-inspired patterns for budget management

### Non-Goals
- Mobile-first redesign (desktop priority)
- Complete rewrite of business logic
- Adding new features (focus on visual/UX only)
- Gamification or over-celebration

## Decisions

### Decision 1: Harvest Color Palette
**What**: Replace 15+ accent colors with 4 semantic tones + neutrals
**Why**: Current rainbow palette creates visual chaos; colors should convey meaning not decoration

| Token | Color | Usage |
|-------|-------|-------|
| `wheat` | Amber/Gold | Primary brand, CTAs |
| `sage` | Muted Green | Success, income, on-track |
| `terra` | Terracotta | Warning, attention needed |
| `rust` | Muted Red | Error, over budget |
| `stone` | Warm Gray | All neutrals |

**Alternatives considered**:
- Keep current colors, only standardize usage → Rejected: too much visual noise remains
- Use blue as primary → Rejected: cold, doesn't match "granary" brand

### Decision 2: Information Hierarchy Pattern
**What**: "Hero Answer" pattern where the single most important information is prominently displayed
**Why**: Users should know their budget status in 2 seconds, not 20

**Pattern**:
1. Primary: Am I on/off budget? (Hero card, full width)
2. Secondary: Category breakdown (scrollable, collapsed)
3. Tertiary: Transaction details (on-demand, modals)

### Decision 3: Category Colors
**What**: Reduce category palette to 6 muted tones; status uses semantic colors
**Why**: Categories identified by icon + name, not color

**Before**: 🔴 Food 🟡 Transport 🟢 Health 🔵 Education 🟣 Entertainment
**After**: All muted neutral backgrounds, status bar shows budget health

### Decision 4: Component Standardization
**What**: Single source of truth for buttons, cards, inputs, modals
**Why**: Current codebase has 4+ different button styles, 3+ shadow levels, inconsistent border radius

| Component | Standard |
|-----------|----------|
| Border radius | `rounded-lg` (8px) for most, `rounded-xl` (12px) for cards, `rounded-2xl` (16px) for modals |
| Shadows | `shadow-warm-*` with stone-500 tint |
| Focus rings | `ring-wheat-500` consistently |

### Decision 5: Inter Font with Tabular Numbers
**What**: Use Inter font family with tabular number variants
**Why**: Financial data requires aligned columns; Inter has excellent number legibility

## Risks / Trade-offs

### Risk 1: User Familiarity Disruption
- **Impact**: Users may be temporarily disoriented by new layout
- **Mitigation**: Maintain navigation structure, only change visual styling
- **Monitoring**: User feedback after rollout

### Risk 2: Incomplete Migration
- **Impact**: Mixed old/new styles create worse visual inconsistency
- **Mitigation**: Phased approach starting with design tokens, then components, then pages
- **Rollback**: Git revert to previous commit

### Risk 3: Performance Impact
- **Impact**: Additional font (Inter) increases bundle size
- **Mitigation**: Use font-display: swap, subset only needed glyphs
- **Acceptable**: ~50KB additional for significantly improved UX

## Migration Plan

### Phase 1: Foundation (Non-breaking)
1. Add new color tokens to tailwind.config.js (alongside existing)
2. Add Inter font
3. Add shadow utilities
4. Create new utility classes

### Phase 2: Components (Parallel)
1. Create new component variants (Button2, Card2, etc.)
2. Gradually replace in pages
3. Delete old components when migration complete

### Phase 3: Pages (Sequential)
1. Dashboard first (highest visibility)
2. Budget view (core functionality)
3. Transactions (daily use)
4. Goals (motivational)

### Rollback Strategy
- Each phase can be reverted independently via git
- Feature flag possible for A/B testing (not planned for MVP)

## Open Questions

1. **Should we add keyboard shortcuts?**
   - Spec includes them, but implementation complexity may defer to future

2. **Quick Actions FAB?**
   - Optional enhancement, defer to user feedback

3. **Mobile bottom navigation?**
   - Desktop-first, but keep mobile patterns documented for future

## References

- [YNAB Features](https://www.ynab.com/features) - Budget philosophy inspiration
- [Budget App Design Tips](https://www.eleken.co/blog-posts/budget-app-design) - Fintech UX best practices
- [Fintech UX Design 2025](https://www.webstacks.com/blog/fintech-ux-design) - Current trends
- `docs/improved-ui/` - Complete implementation specifications
