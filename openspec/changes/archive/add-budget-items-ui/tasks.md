# Implementation Tasks - Add Budget Items UI

## Phase 1: Backend API Endpoints (Prerequisite)

### Task 1.1: Implement Budget Items CRUD Handlers
- Create `CreateBudgetItem` handler in `backend/internal/web/financial/handler.go`
- Create `UpdateBudgetItem` handler
- Create `DeleteBudgetItem` handler
- Add routes to router.go: POST/PATCH/DELETE `/financial/budgets/{budgetId}/items/{itemId}`
- Validation: planned_amount > 0, category exists, budget exists
- **Validation:** Manual API testing with curl/Postman

### Task 1.2: Implement Spending Aggregation Endpoint
- Create `GetBudgetSpending` handler to aggregate actual spending by category
- Query transactions for budget's month/year filtered by category
- Return map of category_id → actual_amount
- Add route: GET `/financial/budgets/{budgetId}/spending`
- **Validation:** Test with sample transactions, verify aggregation accuracy

### Task 1.3: Test Backend Endpoints
- Write handler tests for all new endpoints
- Test with various edge cases (no items, no spending, over-budget scenarios)
- **Validation:** All tests pass

## Phase 2: Frontend Types & API Client

### Task 2.1: Update TypeScript Types
- Add `BudgetItemCreate` type to `frontend/src/types/budget.ts`
- Add `BudgetItemUpdate` type
- Add `BudgetSpending` type (category_id → actual_amount map)
- Add `CategorySpending` type with planned, actual, percentage fields
- **Validation:** Types compile without errors

### Task 2.2: Create API Client Functions
- Add `createBudgetItem()` function to call POST endpoint
- Add `updateBudgetItem()` function to call PATCH endpoint
- Add `deleteBudgetItem()` function to call DELETE endpoint
- Add `getBudgetSpending()` function to call GET spending endpoint
- All functions SHALL include proper error handling
- **Validation:** Test API calls in browser console

## Phase 3: Budget Detail View Component

### Task 3.1: Create BudgetDetail Component Skeleton
- Create `frontend/src/components/BudgetDetail.tsx`
- Accept `budgetId` as prop (will come from routing)
- Fetch budget with items using existing GET `/financial/budgets/{id}` endpoint
- Fetch categories using existing GET `/financial/categories` endpoint
- Display loading and error states
- **Validation:** Component renders with loading state

### Task 3.2: Implement Budget Header Section
- Display budget name, month/year, total amount, type badge
- Show "Back to Budgets" navigation button
- Show calculated total from sum of items
- Display budget type indicator (fixed/calculated/hybrid)
- **Validation:** Header displays all information correctly

### Task 3.3: Implement Budget Items List
- Display table/list of budget items
- Columns: Category (emoji + name), Planned Amount, Actual Spent, Progress Bar, Actions
- Calculate spending percentage for each item
- Color-code progress bars: <80% green, 80-100% yellow, >100% red
- Handle empty state with friendly message
- **Validation:** Budget items display correctly with proper styling

### Task 3.4: Implement Empty State
- Show when budget has no items
- Include emoji, message, and "Add First Category" CTA button
- **Validation:** Empty state displays when no items exist

## Phase 4: Budget Item Management

### Task 4.1: Create BudgetItemForm Component
- Modal or inline form for adding/editing budget items
- Category dropdown (from categories list)
- Planned amount input (currency format)
- Save and Cancel buttons
- Form validation: category required, amount > 0
- **Validation:** Form opens and validates inputs correctly

### Task 4.2: Implement Add Budget Item Flow
- "Add Category" button in BudgetDetail
- Opens BudgetItemForm in create mode
- On save, POST to API and refresh budget items list
- Show success/error messages
- **Validation:** Can create new budget item and see it in list

### Task 4.3: Implement Edit Budget Item Flow
- Click amount field to enable inline editing
- Update amount and save
- PATCH to API with new amount
- Refresh list on success
- **Validation:** Can edit existing item amount

### Task 4.4: Implement Delete Budget Item Flow
- Delete button (trash icon) for each item
- Confirmation dialog: "Delete [Category Name] allocation?"
- DELETE API call on confirm
- Refresh list on success
- **Validation:** Can delete items with confirmation

## Phase 5: Routing & Navigation

### Task 5.1: Add Budget Detail Route
- Update `frontend/src/App.tsx` to support budget detail view
- Add state for selected budget ID or use simple routing pattern
- Pass budget ID to BudgetDetail component
- **Validation:** Can navigate to budget detail view

### Task 5.2: Wire Up "Ver detalhes" Button
- Update BudgetList.tsx budget cards
- Make "Ver detalhes" button navigate to BudgetDetail
- Pass correct budget ID
- **Validation:** Clicking button navigates to detail view

### Task 5.3: Implement Back Navigation
- "Back to Budgets" button in BudgetDetail
- Returns to BudgetList view
- **Validation:** Can navigate back to list

## Phase 6: Polish & Testing

### Task 6.1: Add Loading States
- Skeleton loaders for budget items while fetching
- Disabled states for buttons during API calls
- Loading spinners for create/update/delete operations
- **Validation:** All loading states display correctly

### Task 6.2: Add Error Handling
- Display error messages for failed API calls
- Retry buttons for failed operations
- Validation errors for form inputs
- **Validation:** Errors display user-friendly messages

### Task 6.3: Manual End-to-End Testing
- Create budget → Add items → View spending → Edit → Delete
- Test all edge cases: no items, over-budget, zero spending
- Test with different budget types (fixed, calculated, hybrid)
- **Validation:** Complete flow works without errors

### Task 6.4: Responsive Design Check
- Test on mobile viewport
- Ensure tables/lists are scrollable on small screens
- Buttons and modals are accessible on mobile
- **Validation:** Works on mobile devices

## Dependencies

- **Task 1.x → 2.x:** API endpoints must exist before API client functions
- **Task 2.x → 3.x:** Types must exist before components
- **Task 3.x → 4.x:** Detail view must exist before adding management features
- **Task 5.x:** Can be done in parallel with 3.x and 4.x

## Estimated Timeline

- Phase 1 (Backend): 4-6 hours
- Phase 2 (Types/API): 1-2 hours
- Phase 3 (Detail View): 3-4 hours
- Phase 4 (Management): 3-4 hours
- Phase 5 (Routing): 1-2 hours
- Phase 6 (Polish): 2-3 hours

**Total:** 14-21 hours of development time

## Success Metrics

1. User can create a budget and allocate amounts to at least 5 categories
2. User can see actual spending vs planned for each category
3. All CRUD operations work without errors
4. Budget detail page loads in <1 second with 20+ items
5. Mobile experience is functional and usable
