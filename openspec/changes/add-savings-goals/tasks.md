## 1. Database Schema

- [ ] 1.1 Create migration for `savings_goals` table
- [ ] 1.2 Create migration to add `savings_goal_id` FK to `transactions` table
- [ ] 1.3 Create migration to add `savings_goal_id` FK to `planned_entries` table
- [ ] 1.4 Add indexes for performance

## 2. Backend - Domain Layer

- [ ] 2.1 Create `SavingsGoalModel` in `models.go`
- [ ] 2.2 Create `SavingsGoal` DTO with JSON tags
- [ ] 2.3 Create `SavingsGoalProgress` DTO for progress tracking
- [ ] 2.4 Update `TransactionModel` to include `savings_goal_id`
- [ ] 2.5 Update `PlannedEntryModel` to include `savings_goal_id`

## 3. Backend - Repository Layer

- [ ] 3.1 Add `FetchSavingsGoals` repository method
- [ ] 3.2 Add `FetchSavingsGoalByID` repository method
- [ ] 3.3 Add `InsertSavingsGoal` repository method
- [ ] 3.4 Add `ModifySavingsGoal` repository method
- [ ] 3.5 Add `RemoveSavingsGoal` repository method (soft delete)
- [ ] 3.6 Add `FetchGoalContributions` method (transactions linked to goal)
- [ ] 3.7 Add `FetchGoalMonthlyContributions` method (grouped by month)
- [ ] 3.8 Update transaction repository to handle savings_goal_id
- [ ] 3.9 Update planned entry repository to handle savings_goal_id

## 4. Backend - Service Layer

- [ ] 4.1 Add `GetSavingsGoals` service method
- [ ] 4.2 Add `GetSavingsGoalByID` service method with progress calculation
- [ ] 4.3 Add `CreateSavingsGoal` service method with validation
- [ ] 4.4 Add `UpdateSavingsGoal` service method
- [ ] 4.5 Add `DeleteSavingsGoal` service method
- [ ] 4.6 Add `GetGoalProgress` service method with monthly breakdown
- [ ] 4.7 Add monthly target calculation logic for "reserva" type
- [ ] 4.8 Add auto-completion check when linking transactions
- [ ] 4.9 Update transaction matching to inherit goal from planned entry

## 5. Backend - Handler Layer

- [ ] 5.1 Add `GET /financial/savings-goals` endpoint
- [ ] 5.2 Add `POST /financial/savings-goals` endpoint
- [ ] 5.3 Add `GET /financial/savings-goals/:id` endpoint
- [ ] 5.4 Add `PUT /financial/savings-goals/:id` endpoint
- [ ] 5.5 Add `DELETE /financial/savings-goals/:id` endpoint
- [ ] 5.6 Add `GET /financial/savings-goals/:id/progress` endpoint
- [ ] 5.7 Register routes in router.go
- [ ] 5.8 Update transaction handler to accept savings_goal_id

## 6. Frontend - API Layer

- [ ] 6.1 Add TypeScript types for SavingsGoal and SavingsGoalProgress
- [ ] 6.2 Add `getSavingsGoals` API function
- [ ] 6.3 Add `getSavingsGoalById` API function
- [ ] 6.4 Add `createSavingsGoal` API function
- [ ] 6.5 Add `updateSavingsGoal` API function
- [ ] 6.6 Add `deleteSavingsGoal` API function
- [ ] 6.7 Add `getGoalProgress` API function

## 7. Frontend - Components

- [ ] 7.1 Create `SavingsGoalCard` component (displays single goal with progress)
- [ ] 7.2 Create `SavingsGoalList` component (list view of all goals)
- [ ] 7.3 Create `SavingsGoalFormModal` component (create/edit modal)
- [ ] 7.4 Create `SavingsGoalProgressChart` component (visual progress)
- [ ] 7.5 Create `SavingsGoalsPage` component (full page view)
- [ ] 7.6 Add goals section to Dashboard
- [ ] 7.7 Update `TransactionEditModal` to include goal selection dropdown
- [ ] 7.8 Update `PlannedEntryForm` to include goal selection dropdown

## 8. Frontend - Navigation

- [ ] 8.1 Add "Metas" link to navigation menu
- [ ] 8.2 Add route for `/metas` page
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
