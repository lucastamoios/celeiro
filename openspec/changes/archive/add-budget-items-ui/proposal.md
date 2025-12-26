# Add Budget Items UI

## Why

Currently, budgets in Celeiro only display a total amount (e.g., R$ 5.000,00/month) without breakdown by category. Users cannot see how much they allocated to specific spending categories like "Restaurants", "Transport", or "Housing". This makes budgets nearly useless for actual financial planning.

The backend already supports **Budget Items** - category-specific allocations within a budget - but there's no frontend UI to create, view, or manage them. Users need to:
- See how their budget is allocated across categories
- Add/edit/delete category allocations
- View actual spending vs planned amounts for each category
- Visualize budget progress with clear indicators

Without this, budgets are just abstract numbers with no actionable insights.

## What Changes

Add frontend UI for budget items management:

**Budget Detail View:**
- Click "Ver detalhes" on a budget card → navigate to detail view
- Show budget header (name, month, year, total amount, type)
- Display list of budget items with category name, emoji, planned amount
- Show actual spending vs planned for each category (requires new API call)
- Visual progress bars for each category (green <80%, yellow 80-100%, red >100%)
- Empty state when no items exist

**Budget Items Management:**
- "Add Category" button to create new budget item
- Modal/form with category dropdown and planned amount input
- Inline edit for existing items (click amount to edit)
- Delete button for each item
- Real-time total calculation (sum of all items)

**API Integration:**
- GET `/financial/budgets/{id}` - Fetch budget with items (backend ready)
- POST `/financial/budgets/{id}/items` - Create budget item (needs backend endpoint)
- PATCH `/financial/budgets/{id}/items/{itemId}` - Update budget item (needs backend endpoint)
- DELETE `/financial/budgets/{id}/items/{itemId}` - Delete budget item (needs backend endpoint)
- GET `/financial/budgets/{id}/spending` - Get actual spending by category (needs backend endpoint)

**NOT in scope:**
- Budget item templates or presets
- Historical spending trends
- Budget rollover to next month
- Multi-month budget planning

## Impact

### Affected Components
- **NEW:** `frontend/src/components/BudgetDetail.tsx` - Budget detail view
- **NEW:** `frontend/src/components/BudgetItemForm.tsx` - Add/edit budget item modal
- **MODIFIED:** `frontend/src/components/BudgetList.tsx` - Add navigation to detail view
- **MODIFIED:** `frontend/src/App.tsx` - Add routing for budget detail
- **MODIFIED:** `frontend/src/types/budget.ts` - Add spending types

### Backend API Gaps
Need to implement:
- `POST /financial/budgets/{id}/items` - Create budget item
- `PATCH /financial/budgets/{id}/items/{itemId}` - Update budget item
- `DELETE /financial/budgets/{id}/items/{itemId}` - Delete budget item
- `GET /financial/budgets/{id}/spending` - Get actual spending by category for budget period

### User Experience Impact
- **Before:** Budgets are just numbers, no visibility into category allocation
- **After:** Clear breakdown showing exactly where money is allocated and how much is spent

## Acceptance Criteria

1. User SHALL be able to view budget details including all category allocations
2. User SHALL be able to add new budget items with category and planned amount
3. User SHALL be able to edit existing budget item amounts inline
4. User SHALL be able to delete budget items
5. System SHALL display actual spending vs planned for each category
6. System SHALL show visual progress indicators (green/yellow/red) based on spending %
7. System SHALL calculate and display total budget as sum of all items
8. UI SHALL handle empty state when no budget items exist
9. All API calls SHALL include proper error handling and loading states
10. Budget detail view SHALL be accessible via "Ver detalhes" button on budget cards

## Dependencies

- Backend budget item CRUD endpoints (need to be implemented)
- Backend spending aggregation endpoint (need to be implemented)
- Existing budget list component (already implemented)
- Existing category list API (already implemented)

## Risks

- **Backend API Development:** Need to implement 4 new endpoints before frontend work can be completed
- **Performance:** Spending aggregation query might be slow for large transaction volumes (needs indexing)
- **UX Complexity:** Managing many budget items in one screen could become cluttered
