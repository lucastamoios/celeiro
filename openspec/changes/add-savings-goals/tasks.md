## 1. Database Schema

- [x] 1.1 ~~Create migration for `savings_goals` table~~ (migration 00020 exists)
- [x] 1.2 ~~Create migration to add `savings_goal_id` FK to `transactions` table~~ (in migration 00020)
- [x] 1.3 ~~Create migration to add `savings_goal_id` FK to `planned_entries` table~~ (in migration 00020)
- [x] 1.4 ~~Add indexes for performance~~ (all indexes created in migration 00020)

## 2. Backend - Domain Layer

- [x] 2.1 ~~Create `SavingsGoalModel` in `models.go`~~ (exists at line 331)
- [x] 2.2 ~~Create `SavingsGoal` DTO with JSON tags~~ (exists in dto.go line 586)
- [x] 2.3 ~~Create `SavingsGoalProgress` DTO for progress tracking~~ (exists in dto.go line 644)
- [x] 2.4 ~~Update `TransactionModel` to include `savings_goal_id`~~ (field exists)
- [x] 2.5 ~~Update `PlannedEntryModel` to include `savings_goal_id`~~ (field exists)

## 3. Backend - Repository Layer

- [x] 3.1 ~~Add `FetchSavingsGoals` repository method~~ (exists at repository.go:2372)
- [x] 3.2 ~~Add `FetchSavingsGoalByID` repository method~~ (exists at repository.go:2409)
- [x] 3.3 ~~Add `InsertSavingsGoal` repository method~~ (exists at repository.go:2462)
- [x] 3.4 ~~Add `ModifySavingsGoal` repository method~~ (exists at repository.go:2523)
- [x] 3.5 ~~Add `RemoveSavingsGoal` repository method (soft delete)~~ (exists at repository.go:2547)
- [x] 3.6 ~~Add `FetchGoalContributions` method (transactions linked to goal)~~ (exists at repository.go:2629)
- [x] 3.7 ~~Add `FetchGoalMonthlyContributions` method (grouped by month)~~ (exists at repository.go:2656)
- [x] 3.8 ~~Update transaction repository to handle savings_goal_id~~ (Insert/Modify methods handle it)
- [x] 3.9 ~~Update planned entry repository to handle savings_goal_id~~ (Insert/Modify methods handle it)

## 4. Backend - Service Layer

- [x] 4.1 ~~Add `GetSavingsGoals` service method~~ (exists in savings_goals_service.go:95)
- [x] 4.2 ~~Add `GetSavingsGoalByID` service method with progress calculation~~ (exists at line 110)
- [x] 4.3 ~~Add `CreateSavingsGoal` service method with validation~~ (exists at line 208 with validation)
- [x] 4.4 ~~Add `UpdateSavingsGoal` service method~~ (exists at line 250)
- [x] 4.5 ~~Add `DeleteSavingsGoal` service method~~ (exists at line 281)
- [x] 4.6 ~~Add `GetGoalProgress` service method with monthly breakdown~~ (exists at line 123)
- [x] 4.7 ~~Add monthly target calculation logic for "reserva" type~~ (implemented at lines 188-203)
- [ ] 4.8 Add auto-completion check when linking transactions
- [ ] 4.9 Update transaction matching to inherit goal from planned entry

## 5. Backend - Handler Layer

- [x] 5.1 ~~Add `GET /financial/savings-goals` endpoint~~ (handler exists, route registered)
- [x] 5.2 ~~Add `POST /financial/savings-goals` endpoint~~ (handler exists, route registered)
- [x] 5.3 ~~Add `GET /financial/savings-goals/:id` endpoint~~ (handler exists, route registered)
- [x] 5.4 ~~Add `PUT /financial/savings-goals/:id` endpoint~~ (handler exists, route registered)
- [x] 5.5 ~~Add `DELETE /financial/savings-goals/:id` endpoint~~ (handler exists, route registered)
- [x] 5.6 ~~Add `GET /financial/savings-goals/:id/progress` endpoint~~ (handler exists, route registered)
- [x] 5.7 ~~Register routes in router.go~~ (all routes registered at router.go:148-157)
- [x] 5.8 ~~Update transaction handler to accept savings_goal_id~~ (field exists in create/update requests)

## 6. Frontend - API Layer

- [x] 6.1 ~~Add TypeScript types for SavingsGoal and SavingsGoalProgress~~ (types/savingsGoals.ts exists)
- [x] 6.2 ~~Add `getSavingsGoals` API function~~ (listSavingsGoals exists in api/savingsGoals.ts:39)
- [x] 6.3 ~~Add `getSavingsGoalById` API function~~ (getSavingsGoal exists at line 75)
- [x] 6.4 ~~Add `createSavingsGoal` API function~~ (exists at line 147)
- [x] 6.5 ~~Add `updateSavingsGoal` API function~~ (exists at line 172)
- [x] 6.6 ~~Add `deleteSavingsGoal` API function~~ (exists at line 198)
- [x] 6.7 ~~Add `getGoalProgress` API function~~ (getSavingsGoalProgress exists at line 99)

## 7. Frontend - Components

- [x] 7.1 ~~Create `SavingsGoalCard` component (displays single goal with progress)~~ (exists)
- [ ] 7.2 Create `SavingsGoalList` component (list view of all goals) - may be inline in page
- [ ] 7.3 Create `SavingsGoalFormModal` component (create/edit modal) - form is inline in page
- [ ] 7.4 Create `SavingsGoalProgressChart` component (visual progress)
- [x] 7.5 ~~Create `SavingsGoalsPage` component (full page view)~~ (exists)
- [ ] 7.6 Add goals section to Dashboard
- [ ] 7.7 Update `TransactionEditModal` to include goal selection dropdown
- [ ] 7.8 Update `PlannedEntryForm` to include goal selection dropdown

## 8. Frontend - Navigation

- [ ] 8.1 Add "Metas" link to navigation menu (may exist - need to verify)
- [x] 8.2 ~~Add route for `/metas` page~~ (currentView === 'goals' route exists in App.tsx)
- [ ] 8.3 Add goal icon to navigation

## 9. Testing

- [ ] 9.1 Write repository tests for savings goals CRUD
- [ ] 9.2 Write service tests for progress calculation
- [ ] 9.3 Write service tests for monthly target calculation
- [ ] 9.4 Write handler tests for API endpoints
- [ ] 9.5 Write integration tests for goal-transaction linking

## 10. Documentation

- [ ] 10.1 Update API documentation with new endpoints
- [ ] 10.2 Archive OpenSpec change after deployment
