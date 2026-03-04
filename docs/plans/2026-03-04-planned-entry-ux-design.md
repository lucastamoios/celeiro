# Planned Entry UX Redesign

**Date:** 2026-03-04
**Status:** Approved

## Problem

The planned entry creation form has two compounding issues:

1. **Too many fields** — description, category, amount range, day range, recurrent toggle, savings goal, tags, and a "Criar Padrão Avançado" button that opens a full modal. Most of these are rarely used but always visible.
2. **Pattern creation is a modal-within-a-modal** — opening `PatternCreator` from inside `PlannedEntryForm` is confusing, and 90% of the time the pattern is just a simple "contains" check that doesn't need a full modal.
3. **Bidirectional relationship bug** — when a pattern is created from `PlannedEntryForm`, the planned entry gets `pattern_id` set, but the pattern has `linked_planned_entry_id = null` because the entry doesn't exist yet at pattern creation time. This causes the pattern editor to show "not bound to a planned entry" even though it is.

## Key Insight

Planned entries almost always have a pattern, and the pattern is almost always a simple "contains" check. The two things should be one unified form, not two separate steps.

## Design

### Entry Points

**A — From `TransactionPlannedEntryLinkModal`:**

1. Transaction screen → "Vincular a Entrada Planejada" → modal opens with list of planned entries
2. When the list is empty or a search returns no results → a **"Criar nova entrada planejada"** button appears at the bottom of the modal
3. Clicking it replaces the modal content with the new form, pre-filled from the transaction:
   - Description ← transaction description
   - Category ← transaction category (if set)
   - Match text ← `original_description`
   - Recurrent ← **true by default**

**B — From the budget page:**

- "Nova entrada planejada" button opens the same form, blank
- Description field has autocomplete from existing transaction `original_description` values
- Selecting a suggestion pre-fills description, match text, and category (if the transaction has one)
- Recurrent ← **false by default**

### The Form

**Required fields (always visible):**

| Field | Description |
|-------|-------------|
| Description | What to call this entry. Autocomplete from transaction descriptions when on budget page. |
| Category | Dropdown. Pre-filled from context when available. |
| Match text | Text that the bank description must contain. Defaults to and stays in sync with description unless manually edited. Generates `.*{text}.*` pattern. A small "Usar regex →" link opens the full `PatternCreator` for advanced cases. |

**Optional section (collapsed behind "＋ Mais opções"):**

- Amount (single value or min/max range)
- Expected day (single or range)
- Recurrent toggle (default varies by entry point — see above)
- Tags
- Savings goal

### Submission Order (fixes bidirectional bug)

1. `POST /financial/planned-entries` → get back `planned_entry_id`
2. `POST /financial/patterns` with `linked_planned_entry_id = planned_entry_id`
3. `PATCH /financial/planned-entries/{id}` with `pattern_id`

This guarantees both sides of the relationship are always consistent, eliminating the "not bound" state.

### Autocomplete (budget page entry point)

The description field queries `GET /financial/accounts/{id}/transactions?search={text}&limit=10` (or similar) as the user types. Results show `original_description`. Selecting a suggestion sets description, match text, and category.

## Components Affected

| Component | Change |
|-----------|--------|
| `PlannedEntryForm.tsx` | **Replaced** by new `NewPlannedEntryForm.tsx` |
| `TransactionPlannedEntryLinkModal.tsx` | Add "Criar nova" button; when clicked, show new form inline |
| `CategoryBudgetDashboard.tsx` | Replace `PlannedEntryForm` usage with new form |
| `PatternCreator.tsx` | Unchanged — used only as advanced escape hatch |
| `PlannedEntryLinkModal.tsx` | Unchanged |

## Out of Scope

- Editing existing planned entries (existing `PlannedEntryForm` stays for edit mode for now)
- Changes to the backend API (only new frontend call ordering needed)
- `PatternCreator` redesign
