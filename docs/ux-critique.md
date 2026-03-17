# UX Critique — Celeiro (2026-03-13)

Full design critique of the Celeiro UI/UX, covering anti-patterns, visual hierarchy, information architecture, and actionable improvements.

---

## Anti-Patterns Verdict: PASS

No AI slop. The warm cream palette, Lora + Nunito Sans pairing, bottom-edge tactile buttons, and earthy semantic colors (sage/terra/rust) are distinctive and intentional. No gradient text, no glassmorphism, no cyan-on-dark, no identical card grids. The wheat motif and stewardship voice are genuine brand choices.

One minor edge: Savings Goals summary cards (3-column metrics) approach the "hero metric layout" anti-pattern, but the warm palette and compact sizing save it.

---

## What's Working

1. **Color semantics are excellent.** Sage = good, terra = caution, rust = bad — immediately intuitive for financial data. Colored backgrounds on financial overview cards (sage/income, rust/expenses, wheat/planned) create instant comprehension without reading labels.

2. **Tactile button system is memorable.** Bottom-edge border + `translateY(1px)` on active creates a physical press feel. Matches the "grounded, leather-bound ledger" aesthetic. Defined once in CSS, used consistently.

3. **Transaction list mobile adaptation is thoughtful.** Table-to-card transformation with checkbox selection, bulk actions, and drag-to-import OFX. Mobile cards show the right hierarchy: description + amount first, date + category second.

---

## Priority Issues

### P1: Dashboard lacks hierarchy — pie charts aren't the priority

**Problem**: Dashboard renders Financial Overview → Attention → Budget Pacing → Category Expenses → Tag Expenses → "All Organized" in a single vertical scroll. Every section uses the same `.card` weight. The category/tag pie charts take up significant space but aren't the critical daily information.

**What matters daily**: Budget pacing for controlled entries and whether we'll make it this month. The pie chart breakdowns are secondary — useful for monthly review, not daily check-ins.

**Fix**: Elevate pacing/controlled entries as the primary dashboard data. Push pie charts to a secondary section (collapsible, tabbed, or on a separate analytics view). The dashboard should answer "am I on track this month?" in 2 seconds.

**Skill**: `/distill`

---

### P2: No URL-based routing — browser navigation is broken

**Problem**: View switching uses `useState` + `sessionStorage`. URL never changes. Back/forward buttons don't work. Links can't be shared or bookmarked. Middle-click uses a workaround `?view=` parameter.

**Impact**: Breaks fundamental browser expectations. User navigates to Transactions → Budgets → hits Back → leaves the app entirely. Creates anxiety with sensitive financial data.

**Fix**: Adopt a lightweight client-side router. Routes like `/transactions`, `/budgets`, `/goals`, `/settings`. Month/year could be URL params too.

**Skill**: `/plan` (architectural change)

---

### P3: Modals overused — inline editing for description + category

**Problem**: Transaction editing, creation, savings goals, contributions, planned entries — all modals. For frequent operations like changing a description or category, the modal round-trip (click → modal → find field → edit → submit → close → re-orient) is too heavy.

**What would work better**: Inline editing for description and category directly in the transaction list — click the field, it becomes editable, press Enter to save. A separate action button (e.g., "..." menu or dedicated icon) could open a full modal for less-common operations: edit all fields, create planned entry from transaction, create pattern from transaction.

**Proposed interaction**:
- Click description → inline text edit, Enter to save
- Click category cell → inline category picker dropdown, select to save
- Click "..." or action button → menu with: "Editar transação", "Criar entrada planejada", "Criar padrão"

**Fix**: Reserve modals for complex multi-field forms. Use inline editing for high-frequency single-field changes. Add an action menu for secondary operations.

**Skill**: `/distill`

---

### P4: Inconsistent empty states — no onboarding

**Problem**: Empty states vary in quality:
- Savings Goals: Icon + heading + CTA (good)
- Dashboard "All Organized": Emoji + message (decent)
- Transaction list with no data: Empty table (no guidance)
- Budget with no categories: Nothing (user doesn't know they need Settings first)

**Impact**: New user hits dashboard, sees zeros, doesn't know what to do. No guidance about OFX import, category setup, or budget configuration.

**Fix**: Every empty state answers: "What is this?" + "Why should I care?" + "What do I do next?" Dashboard empty state should be a guided setup: 1) Create categories → 2) Import OFX → 3) Set budgets.

**Skill**: `/onboard`

---

### P5: Pie charts are decorative, not interactive

**Problem**: Custom SVG donut charts with `cursor-pointer` on slices but clicking does nothing. Legend is separated (grid-cols-2). With 8+ categories, earthy brown shades become indistinguishable. Tag chart grays are worse.

**Impact**: Broken affordance (pointer promises interaction), poor data differentiation, and requires eye-scanning between chart and legend.

**Fix**: Either make slices interactive (click to filter, hover tooltip) or replace with horizontal bar charts (easier to read, easier to label, better on mobile). If keeping donut, use wider color range and add tooltips. Consider merging category + tag charts into one section with a toggle.

**Skill**: `/delight` or `/distill`

---

## Minor Issues

| Issue | Detail | Fix |
|-------|--------|-----|
| Duplicate month navigation | Dashboard and TransactionList each implement their own with slightly different styling | Extract shared `<MonthNavigator>` component |
| `confirm()` for destructive actions | SavingsGoalsPage uses native `confirm()` — jarring against polished UI | Use styled confirmation dialog matching Provision Design System |
| Loading state inconsistency | Dashboard: spinner. Transactions: skeleton. Goals: text. | Pick one pattern, use everywhere (skeleton preferred) |
| No skip-to-content link | Sticky navbar with no skip link | Add for WCAG AA keyboard/screen-reader compliance |
| Table hover = selected color | Both `hover:bg-wheat-50` and selected `bg-wheat-50` — indistinguishable | Use `bg-wheat-100` for selected to differentiate |
| Page bg vs card bg contrast | `bg-stone-50` on body, but design system says `--bg-0` (#F6F1E9 = stone-100) for page | Use `bg-stone-100` for page body to match design tokens |
| Goals modals skip shared Modal | SavingsGoalsPage builds custom modals instead of using `ui/Modal.tsx` | Migrate to shared Modal for visual consistency |

---

## Strategic Questions

1. **What if the dashboard hero was just one number?** "Saldo projetado: R$ X" — sage or rust — with everything else as progressive disclosure. Does that better serve "clarity over cleverness"?

2. **Should category + tag charts merge?** Both answer "where did money go?" with similar layouts. A single section with a toggle reduces cognitive load.

3. **Should mobile nav be a bottom tab bar?** The hamburger drawer is functional but generic. A bottom tab bar (Dashboard, Transactions, Budgets, Goals) keeps navigation always-visible — standard for financial apps.

---

## Suggested Execution Order

1. **`/distill` on Dashboard** — Elevate pacing, demote pie charts, establish hierarchy
2. **Inline editing for transactions** — Description + category inline, action menu for the rest
3. **`/onboard`** — Empty states and first-time user flow
4. **URL routing** — `/plan` to scope the migration
5. **Minor fixes** — Shared MonthNavigator, loading consistency, Modal standardization
