# Tasks: Harvest Design System Implementation

> Reference: `docs/improved-ui/` for detailed specifications

## 1. Foundation: Design Tokens
**Reference**: `docs/improved-ui/02-color-palette.md`, `docs/improved-ui/03-typography-spacing.md`

- [ ] 1.1 Update `tailwind.config.js` with Harvest color palette
  - Add `wheat` color scale (50-900)
  - Add `sage` color scale (50-900)
  - Add `terra` color scale (50-900)
  - Add `rust` color scale (50-900)
  - Override default `gray` with warm `stone` values
- [ ] 1.2 Add warm shadow utilities to Tailwind config
  - `shadow-warm-sm`, `shadow-warm-md`, `shadow-warm-lg`, `shadow-warm-xl`
- [ ] 1.3 Add Inter font
  - Add Google Fonts link to `index.html`
  - Configure font-family in Tailwind
  - Add `tabular-nums` utility class
- [ ] 1.4 Add typography scale to Tailwind config
  - `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-h4`
  - `text-body`, `text-body-sm`, `text-caption`, `text-tiny`
- [ ] 1.5 Update `src/utils/colors.ts`
  - Reduce `CATEGORY_COLORS` to 6 muted tones
  - Update `getCategoryColorStyle()` for new palette
  - Add semantic status color utilities

## 2. Foundation: Base Components
**Reference**: `docs/improved-ui/04-components.md`

- [ ] 2.1 Create/update Button component variants
  - Primary (wheat-500)
  - Secondary (stone-100)
  - Ghost (transparent)
  - Danger (rust-500)
  - Icon button
  - Loading state
- [ ] 2.2 Create/update Card component variants
  - Base card (white, rounded-xl, shadow-warm-sm)
  - Interactive card (hover states)
  - Status card (border-l-4 with semantic color)
- [ ] 2.3 Standardize Modal component
  - Consistent header with close button
  - Scrollable body (max-h-[60vh])
  - Footer with bg-stone-50
  - ESC and backdrop dismiss
- [ ] 2.4 Standardize Form inputs
  - Text input with consistent focus ring (wheat-500)
  - Select dropdown
  - Checkbox and Toggle
  - Currency input with R$ prefix
- [ ] 2.5 Create Progress Bar components
  - Basic progress bar
  - Budget progress bar (auto-color based on %)
  - Progress bar with label
- [ ] 2.6 Create Badge components
  - Status badge (default, success, warning, error)
  - Category badge (icon + name)
  - Count badge
- [ ] 2.7 Create Toast/Notification component
  - Success, error, warning, info variants

## 3. Navigation Update
**Reference**: `docs/improved-ui/09-navigation.md`

- [ ] 3.1 Update `App.tsx` navigation bar
  - New logo styling ("🌾 Celeiro")
  - Warm color scheme (wheat accents)
  - Status indicators on nav items
- [ ] 3.2 Create UserMenu dropdown component
  - User avatar with initial
  - Categories, Rules, Accounts links
  - Settings and Logout
- [ ] 3.3 Create PageLayout template component
  - Max-width container (max-w-7xl)
  - Consistent page padding (px-8 py-8)
  - Optional breadcrumb
  - Page header with title and actions

## 4. Dashboard Redesign
**Reference**: `docs/improved-ui/05-dashboard.md`

- [ ] 4.1 Create HeroStatusCard component
  - Budget status message (on-track/warning/over)
  - Available amount (large display)
  - Progress bar with percentage
  - Spent vs planned summary
- [ ] 4.2 Create MetricCard component
  - Icon with colored background
  - Title, value, subtitle
  - Used for income/expenses/balance
- [ ] 4.3 Create AttentionCard component
  - Warning banner for items needing attention
  - Uncategorized transactions count
  - Over-budget categories
  - Pending planned entries
- [ ] 4.4 Create CategoryProgressRow component
  - Simplified row with icon, name, progress bar
  - Status indicator (✓ ⚠ ✗)
  - Expandable for details
- [ ] 4.5 Create GoalProgressCard (compact version)
  - For dashboard goal summary
  - Progress ring/bar
  - Current/target amounts
- [ ] 4.6 Integrate new components into Dashboard.tsx
  - Replace current layout with Hero → Metrics → Attention → Categories → Goals
  - Remove rainbow category colors
  - Add month navigation

## 5. Transactions Page Redesign
**Reference**: `docs/improved-ui/06-transactions.md`

- [ ] 5.1 Create TransactionSummaryBar component
  - Month selector
  - Income/Expenses/Balance metrics
- [ ] 5.2 Create TransactionFilters component
  - Search input
  - Category filter dropdown
  - Account filter dropdown
  - Action buttons (Import, Add)
- [ ] 5.3 Create DateGroupHeader component
  - Date with day of week
  - Transaction count and total
- [ ] 5.4 Update TransactionRow component
  - Checkbox for selection
  - Payment type badge
  - Description and memo
  - Account name
  - QuickCategorySelect dropdown for uncategorized
  - Amount with income/expense coloring
- [ ] 5.5 Create QuickCategorySelect dropdown
  - Recent categories
  - All categories list
  - "Create rule" option
- [ ] 5.6 Create BulkActionsBar component
  - Fixed bottom bar when items selected
  - Categorize, Ignore, Delete actions
- [ ] 5.7 Update TransactionList.tsx with new components
  - Group transactions by date
  - Replace table with card-based rows
  - Add bulk selection logic

## 6. Budget Page Redesign
**Reference**: `docs/improved-ui/07-budgets.md`

- [ ] 6.1 Create BudgetMonthHeader component
  - Month navigation (prev/next)
  - Planned/Spent/Available summary
  - Overall progress bar
- [ ] 6.2 Update CategoryBudgetRow component
  - Simplified row design
  - Progress bar with semantic coloring
  - Status indicator
  - Expandable details section
- [ ] 6.3 Update BudgetEditModal
  - Budget type selection (fixed/calculated/hybrid)
  - Amount input for fixed
  - Planned items list for calculated
  - Final budget preview
- [ ] 6.4 Create PlannedEntryRow component
  - Status-based left border (pending/matched/missed)
  - Description and expected info
  - Status badge
- [ ] 6.5 Update CategoryBudgetDashboard.tsx
  - Single month focus (remove multi-month view)
  - Replace rainbow category cards with rows
  - Add status indicators

## 7. Goals Page Redesign
**Reference**: `docs/improved-ui/08-goals.md`

- [ ] 7.1 Create GoalsSummaryHeader component
  - Total goals count
  - Total accumulated amount
  - Overall progress percentage
- [ ] 7.2 Update GoalCard component
  - Type badge (Reserva/Investimento)
  - Enhanced progress bar with milestones
  - Monthly needed calculation
  - Contribute button
- [ ] 7.3 Create GoalTypeTabs component
  - All/Reservas/Investimentos/Concluídas filters
  - Count badges
- [ ] 7.4 Update ContributionModal
  - Current progress preview
  - Quick amount buttons
  - Link to transaction option
  - After-contribution preview
- [ ] 7.5 Create GoalCompletedModal
  - Celebration animation
  - Achievement message
  - Total saved display
- [ ] 7.6 Update SavingsGoalsPage.tsx with new components
  - Summary header at top
  - Filter tabs
  - Grid of enhanced goal cards

## 8. Polish & Quality
- [ ] 8.1 Create EmptyState component
  - Reusable for all pages
  - Icon, title, description, CTA
- [ ] 8.2 Create LoadingSkeleton components
  - Card skeleton
  - Row skeleton
  - Page skeleton
- [ ] 8.3 Add micro-interactions
  - Progress bar animations
  - Card hover transitions
  - Button loading states
- [ ] 8.4 Implement keyboard shortcuts (optional)
  - `g then d/t/b/m` for navigation
  - `/` for search focus
  - `Esc` for modal close
- [ ] 8.5 Accessibility review
  - Color contrast verification
  - Focus states on all interactive elements
  - Screen reader labels

## 9. Cleanup
- [ ] 9.1 Remove unused color classes
- [ ] 9.2 Remove old component variants
- [ ] 9.3 Update any remaining hardcoded colors
- [ ] 9.4 Final visual review of all pages
- [ ] 9.5 Update component documentation if exists

## Dependencies

**Tasks can be parallelized as follows:**

```
Phase 1 (Foundation):     1.1 → 1.2 → 1.3 → 1.4 → 1.5
                              ↓
Phase 2 (Components):     2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7 (parallel)
                              ↓
Phase 3 (Navigation):     3.1 → 3.2 → 3.3
                              ↓
Phase 4 (Pages):          4.* → 5.* → 6.* → 7.* (sequential recommended)
                              ↓
Phase 5 (Polish):         8.* → 9.* (sequential)
```

## Completion Criteria

- [ ] All 9 sections complete
- [ ] No rainbow category colors remain
- [ ] Dashboard shows hero status card
- [ ] Budget view uses single-month focus
- [ ] All pages use consistent Harvest color palette
- [ ] `openspec validate refactor-ui-harvest-design --strict` passes
