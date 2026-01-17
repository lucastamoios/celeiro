# Budget & Planned Entries Enhancement Tasks

**Change ID**: enhance-budget-planned-entries

## Progress
- Total: 23 tasks
- Completed: 12

---

## Phase 1: Quick Fixes (No Database Changes)

These are simple UI fixes that can be deployed immediately.

### 1.1 Fix Quick Pattern Description Text ✅
- [x] Update text in PlannedEntryForm.tsx to correctly explain pattern matching
- **Current**: "Vincular transações automaticamente quando a descrição contiver 'Apple'"
- **Target**: "Transações do banco que contenham 'Netflix' serão renomeadas para 'Netflix' e categorizadas automaticamente"
- **Files**: `frontend/src/components/PlannedEntryForm.tsx`

### 1.2 Clarify "Gasto" Label ✅
- [x] Add tooltip to "Gasto" label explaining the calculation
- [x] Added info icon with native HTML tooltip
- **Files**: `frontend/src/components/CategoryBudgetDashboard.tsx`

---

## Phase 2: Bug Fixes

### 2.1 Fix Savings Goal Binding ✅
- [x] Investigate why savings goal selection doesn't persist
- [x] Check API endpoint for planned entry create/update
- [x] Verify backend saves and retrieves savings_goal_id
- [x] Fix frontend form submission - Added missing `SavingsGoalID` to initialEntry in CategoryBudgetDashboard.tsx
- **Files**:
  - `frontend/src/components/CategoryBudgetDashboard.tsx` (two locations fixed)

---

## Phase 3: Enhanced Category Budget Modal ✅

### 3.1 Backend: Add Planned Entries Endpoint for Category ⏭️
- **Skipped**: Not needed - existing data flow already passes planned entries via props

### 3.2 Frontend: Show Planned Entries in Modal ✅
- [x] Add sectioned view showing all planned entries in CategoryTransactionsModal
- [x] Show status badges (matched, pending, missed, scheduled, dismissed)
- [x] Display expected day information
- **Files**: `frontend/src/components/CategoryTransactionsModal.tsx`

### 3.3 Frontend: Inline Edit Planned Amount ✅
- [x] Make planned entry amount clickable/editable inline
- [x] Save on Enter or blur
- [x] Update local state and refresh via API call
- **Files**:
  - `frontend/src/components/CategoryTransactionsModal.tsx`
  - `frontend/src/components/CategoryBudgetDashboard.tsx`

### 3.4 Frontend: Add Planned Entry Button in Modal ✅
- [x] Add "+" button to create new planned entry
- [x] Pre-fill category from current context using preselectedCategoryForEntry state
- [x] Use existing PlannedEntryForm modal with pre-selected category
- **Files**:
  - `frontend/src/components/CategoryTransactionsModal.tsx`
  - `frontend/src/components/CategoryBudgetDashboard.tsx`

---

## Phase 4: Database Migrations ✅

### 4.1 Add Controllable Flag to Categories ✅
- [x] Create migration: `ALTER TABLE categories ADD COLUMN is_controllable BOOLEAN DEFAULT FALSE`
- [x] Update Category domain model (CategoryModel and Category DTO)
- **Files**:
  - `backend/internal/migrations/00038_add_controllable_flag_to_categories.sql`
  - `backend/internal/application/financial/models.go`
  - `backend/internal/application/financial/dto.go`

### 4.2 Create Planned Entry Tags Junction Table ✅
- [x] Create migration for `planned_entry_tags` table
- [x] Add PlannedEntryTagModel domain model
- **Files**:
  - `backend/internal/migrations/00039_add_planned_entry_tags.sql`
  - `backend/internal/application/financial/models.go`

---

## Phase 5: Tags for Planned Entries ✅

### 5.1 Backend: CRUD for Planned Entry Tags ✅
- [x] Add repository methods for planned entry tags (FetchTagsByPlannedEntryID, SetPlannedEntryTags)
- [x] Update CreatePlannedEntry to accept tags
- [x] Update UpdatePlannedEntry to manage tags
- **Files**:
  - `backend/internal/application/financial/repository.go`
  - `backend/internal/application/financial/service.go`
  - `backend/internal/web/financial/handler.go`
- **Depends on**: 4.2

### 5.2 Backend: Transfer Tags on Match ✅
- [x] In MatchPlannedEntryToTransaction, copy entry tags to transaction
- [x] Merge with existing transaction tags (no duplicates)
- **Files**: `backend/internal/application/financial/service.go`
- **Depends on**: 5.1

### 5.3 Frontend: Tag Selection in PlannedEntryForm ✅
- [x] Add TagSelector component (reused existing component)
- [x] Load existing tags on edit
- [x] Save tags with entry
- **Files**:
  - `frontend/src/components/PlannedEntryForm.tsx`
  - `frontend/src/types/budget.ts`
- **Depends on**: 5.1

---

## Phase 6: Controllable Categories (Budget Pacing)

### 6.1 Backend: Update Category API
- [ ] Add `is_controllable` to category responses
- [ ] Add endpoint to update category controllable flag
- **Files**:
  - `backend/internal/application/financial/service.go`
  - `backend/internal/web/financial_routes.go`
- **Depends on**: 4.1

### 6.2 Backend: Pacing Calculation Endpoint
- [ ] Create endpoint for controllable category pacing data
- [ ] Calculate: expected spend = (budget * day_of_month / days_in_month)
- [ ] Return: category, budget, spent, expected, pace_status
- **Files**:
  - `backend/internal/application/financial/service.go`
  - `backend/internal/web/financial_routes.go`

### 6.3 Frontend: Category Settings Toggle
- [ ] Add "Controlável" toggle in category edit UI
- **Files**: `frontend/src/components/CategoryForm.tsx` (or similar)
- **Depends on**: 6.1

### 6.4 Frontend: Dashboard Pacing Widget
- [ ] Create BudgetPacingWidget component
- [ ] Display controllable categories with pace indicators
- [ ] Color code: green (under pace), yellow (near pace), red (over pace)
- **Files**:
  - `frontend/src/components/BudgetPacingWidget.tsx` (new)
  - `frontend/src/pages/Dashboard.tsx`
- **Depends on**: 6.2

---

## Phase 7: Drag & Drop Planned Entries

### 7.1 Frontend: Install and Configure DnD Library
- [ ] Add react-dnd or @dnd-kit/core dependency
- [ ] Set up DnD context provider in Budget page
- **Files**:
  - `frontend/package.json`
  - `frontend/src/pages/Budget.tsx`

### 7.2 Frontend: Make Planned Entries Draggable
- [ ] Wrap planned entry items as draggable sources
- [ ] Show drag handle or make entire card draggable
- [ ] Add visual feedback during drag
- **Files**: `frontend/src/pages/Budget.tsx`, `frontend/src/components/PlannedEntryCard.tsx`
- **Depends on**: 7.1

### 7.3 Frontend: Make Category Cards Drop Targets
- [ ] Set up category cards as drop targets
- [ ] Highlight valid targets during drag
- [ ] Validate: only same entry_type categories
- **Files**: `frontend/src/pages/Budget.tsx`
- **Depends on**: 7.1

### 7.4 Frontend: Handle Drop and Update Category
- [ ] On drop: call API to update planned entry category
- [ ] Update local state optimistically
- [ ] Refresh budget calculations
- **Files**: `frontend/src/pages/Budget.tsx`
- **Depends on**: 7.2, 7.3

---

## Suggested Implementation Order

1. **Phase 1** (Quick Fixes) - Deploy first, immediate value
2. **Phase 2** (Bug Fixes) - High priority, user-reported issues
3. **Phase 3** (Enhanced Modal) - Good UX improvement
4. **Phase 4** (Migrations) - Required for later phases
5. **Phase 5** (Tags) - After migrations
6. **Phase 6** (Pacing) - After migrations
7. **Phase 7** (Drag & Drop) - Last, most complex frontend work

---

## Notes

- All API changes should maintain backward compatibility
- Consider feature flags for gradual rollout of new features
- Update `docs/domains.md` when adding new entities (planned_entry_tags)
- Update `docs/database.md` with new tables/columns
