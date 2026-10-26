# Plan: Padrões para Ignorar Transações

> **For agentic workers:** Use `/code-tdd` to implement each task. Use subagents for parallel execution or execute tasks inline. Steps use checkbox syntax for tracking.

Created: 2026-08-19
Status: completed

## Scope

**Requirements:** docs/requirements/ignored-transaction-patterns.md (items 1-14)
**Design:** docs/design/ignored-transaction-patterns.md (decisions D1-D6)

**Goal:** Permitir que usuários criem padrões prospectivos que marquem novas transações correspondentes como ignoradas.

**Architecture:** O padrão recebe uma ação explícita e continua compartilhando critérios, ordenação e escopo organizacional. Depois da primeira correspondência, o serviço despacha para a categorização existente ou para uma mutação isolada de `is_ignored`; a interface deriva campos e ações disponíveis da mesma ação.

---

### Task 1: Comportamento do editor e da lista de padrões

**Implements:** REQ 1, 2, 8, 9, 10, 13; D4, D5

**Files:**
- Create: `frontend/src/utils/patternAction.ts`
- Create: `frontend/src/utils/patternAction.test.mjs`
- Modify: `frontend/src/components/PatternCreator.tsx`
- Modify: `frontend/src/components/PatternManager.tsx`
- Modify: `frontend/src/components/TransactionEditModal.tsx`

- [x] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPatternCapabilities, initialPatternAction } from './patternAction.ts';

test('ignore patterns hide categorization, planned-entry, and retroactive controls', () => {
  assert.deepEqual(getPatternCapabilities('ignore'), {
    requiresTargets: false,
    supportsPlannedEntries: false,
    supportsRetroactive: false,
  });
});

test('an ignored transaction starts the creator with the ignore action', () => {
  assert.equal(initialPatternAction(true), 'ignore');
  assert.equal(initialPatternAction(false), 'categorize');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test src/utils/patternAction.test.mjs`
Expected: FAIL because `patternAction.ts` does not exist.

- [x] **Step 3: Write minimal behavior helper**

```ts
export type PatternAction = 'categorize' | 'ignore';

export function getPatternCapabilities(action: PatternAction) {
  const categorizes = action === 'categorize';
  return {
    requiresTargets: categorizes,
    supportsPlannedEntries: categorizes,
    supportsRetroactive: categorizes,
  };
}

export function initialPatternAction(isIgnored: boolean): PatternAction {
  return isIgnored ? 'ignore' : 'categorize';
}
```

- [x] **Step 4: Connect the helper to the UI**

Add `action` to the pattern interfaces. Render an action selector in `PatternCreator`; validate and send target fields only when `requiresTargets` is true. In `PatternManager`, show an `Ignorar` badge, omit planned-entry and retroactive actions for ignore patterns, and force `apply_retroactively: false` when saving them. In `TransactionEditModal`, pass `initialPatternAction(transaction.is_ignored)` to the creator and hide its retroactive option for ignore patterns.

- [x] **Step 5: Run tests and build**

Run: `cd frontend && node --test src/utils/patternAction.test.mjs && npm run build`
Expected: both tests pass and TypeScript/Vite build completes.

**Acceptance:** O editor oferece as duas ações, a ação Ignorar não exige destinos, a origem transacional seleciona a ação correta e a lista não mostra comandos incompatíveis.

### Task 2: Contrato e regra de aplicação da ação Ignore

**Implements:** REQ 3, 4, 5, 6, 7, 11, 12, 13, 14; D2, D3, D6

**Files:**
- Modify: `backend/internal/application/financial/models.go`
- Modify: `backend/internal/application/financial/dto.go`
- Modify: `backend/internal/application/financial/patterns_service.go`
- Modify: `backend/internal/application/financial/patterns_service_test.go`
- Modify: `backend/internal/web/financial/handler.go`

- [x] **Step 1: Write failing service tests**

```go
func TestPatternsService_ApplyPatternToTransaction_IgnoreOnlySetsIgnored(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo, logger: &logging.TestLogger{}}
	ctx := context.Background()
	tx := &TransactionModel{TransactionID: 42, Description: "Transfer", CategoryID: intPtr(7)}
	pattern := &PatternModel{PatternID: 9, Action: PatternActionIgnore}

	mockRepo.On("ModifyTransaction", ctx, mock.MatchedBy(func(params modifyTransactionParams) bool {
		return params.TransactionID == 42 && params.IsIgnored != nil && *params.IsIgnored &&
			params.CategoryID == nil && params.Description == nil
	})).Return(TransactionModel{TransactionID: 42, IsIgnored: true}, nil)

	err := svc.applyPatternToTransaction(ctx, tx, pattern, 3, 5)

	assert.NoError(t, err)
	mockRepo.AssertNotCalled(t, "FetchPlannedEntriesByPatternIDs", mock.Anything, mock.Anything)
}

func TestPatternsService_ApplyPatternRetroactively_RejectsIgnore(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo, logger: &logging.TestLogger{}}
	ctx := context.Background()
	mockRepo.On("FetchAdvancedPatternByID", ctx, mock.Anything).Return(
		PatternModel{PatternID: 9, Action: PatternActionIgnore}, nil,
	)

	_, err := svc.ApplyPatternRetroactivelySync(ctx, ApplyPatternRetroactivelyInput{
		PatternID: 9, UserID: 3, OrganizationID: 5,
	})

	assert.ErrorIs(t, err, ErrIgnorePatternRetroactive)
	mockRepo.AssertNotCalled(t, "FetchTransactionsForPatternMatching", mock.Anything, mock.Anything)
}
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/application/financial -run 'TestPatternsService_(ApplyPatternToTransaction|ApplyPatternRetroactively)' -count=1`
Expected: FAIL because action types and ignore dispatch do not exist.

- [x] **Step 3: Add the action contract and validation**

Define `PatternActionCategorize` and `PatternActionIgnore`; expose `action` in model and DTO. Create and update inputs accept the action. Categorize requires non-empty target description and category; ignore requires neither and always disables retroactive application. The handler decodes optional targets and delegates validation to the service.

- [x] **Step 4: Dispatch without changing matching**

```go
func (s *service) applyPatternToTransaction(ctx context.Context, tx *TransactionModel, pattern *PatternModel, userID, organizationID int) error {
	if pattern.Action == PatternActionIgnore {
		ignored := true
		_, err := s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
			TransactionID: tx.TransactionID,
			OrganizationID: organizationID,
			IsIgnored: &ignored,
		})
		return err
	}
	return s.applyCategorizationPatternToTransaction(ctx, tx, pattern, userID, organizationID)
}
```

Keep the existing categorization body in `applyCategorizationPatternToTransaction`. Copy `Action` when converting persisted patterns for automatic or retroactive application. Reject retroactive application before fetching transactions when action is `ignore`.

- [x] **Step 5: Run related tests**

Run: `cd backend && go test ./internal/application/financial -run 'TestPatternsService_' -count=1`
Expected: all pattern service tests pass.

**Acceptance:** A matched ignore pattern changes only `is_ignored`, the first-match order remains intact, organization scoping is preserved and retroactive execution is rejected.

### Task 3: Persistência consistente e compatível

**Implements:** REQ 1, 2, 7, 14; D1, D6

**Files:**
- Create: `backend/internal/migrations/00055_pattern_actions.sql`
- Modify: `backend/internal/application/financial/repository.go`
- Modify: `backend/internal/tests/integration/financial_test.go`

- [x] **Step 1: Write the failing integration test**

```go
func (test *FinancialTestSuite) TestPatternSchema_Insert_IgnoreWithoutTargets() {
	ctx := context.Background()
	auth := test.CreateUserAndAuthenticate("ignore-pattern@example.com", "Ignore Pattern", "Ignore Pattern Org")

	var action string
	err := test.DB.Query(ctx, &action, `
		INSERT INTO patterns (
			user_id, organization_id, description_pattern, action,
			target_description, target_category_id, apply_retroactively
		) VALUES ($1, $2, 'TRANSFER', 'ignore', NULL, NULL, false)
		RETURNING action
	`, auth.GetUserID(), auth.GetOrganizationID())

	test.Require().NoError(err)
	test.Equal("ignore", action)
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/tests/integration -run 'TestFinancialTestSuite/TestPatternSchema_Insert_IgnoreWithoutTargets' -count=1`
Expected: FAIL because the action column is absent and targets are required.

- [x] **Step 3: Add the migration**

```sql
-- +goose Up
ALTER TABLE patterns
ADD COLUMN action VARCHAR(20) NOT NULL DEFAULT 'categorize';

ALTER TABLE patterns
ALTER COLUMN target_description DROP NOT NULL,
ALTER COLUMN target_category_id DROP NOT NULL;

ALTER TABLE patterns
ADD CONSTRAINT patterns_action_check CHECK (action IN ('categorize', 'ignore')),
ADD CONSTRAINT patterns_targets_check CHECK (
    (action = 'categorize' AND target_description IS NOT NULL AND target_description <> '' AND target_category_id IS NOT NULL)
    OR (action = 'ignore' AND target_description IS NULL AND target_category_id IS NULL AND apply_retroactively = false)
);
```

The down migration removes the checks and action only after replacing null ignore targets with safe values is deliberately not attempted; it must delete ignore patterns before restoring `NOT NULL`, preventing silent data corruption.

- [x] **Step 4: Update repository projections and writes**

Add `action` to every pattern SELECT and RETURNING list. Insert optional destinations with the action. Update uses explicit set flags so switching to ignore can store SQL NULL instead of relying on `COALESCE`; switching back requires validated non-null destinations.

- [x] **Step 5: Run integration and service tests**

Run: `cd backend && go test ./internal/tests/integration ./internal/application/financial -count=1`
Expected: both packages pass.

**Acceptance:** Existing rows read as categorize, ignore rows persist without artificial targets, invalid action/target combinations fail and organization filters remain unchanged.

### Task 4: Vertical verification and documentation reconciliation

**Implements:** REQ 1-14; D1-D6

**Files:**
- Modify: `docs/screens/settings.md`
- Modify: `docs/screens/transactions.md`
- Modify: `docs/domains.md`
- Modify: `docs/plans/ignored-transaction-patterns.md`

- [x] **Step 1: Run backend verification**

Run: `cd backend && go test ./internal/application/financial ./internal/tests/integration -count=1`
Expected: PASS.

- [x] **Step 2: Run frontend verification**

Run: `cd frontend && node --test src/utils/patternAction.test.mjs && npm run build`
Expected: PASS.

- [x] **Step 3: Verify the vertical behavior**

Exercise the action-capability helper, automatic service dispatch, database constraints, and ordered repository path. Inspect the connected UI flow to confirm ignore patterns omit target, planned-entry, and retroactive controls and that transaction-originated creation uses the current ignored state.

- [x] **Step 4: Reconcile documentation and plan status**

Document the action selector, prospective-only behavior, list badge and preserved transaction data in the screen and domain guides. Mark every completed checkbox and change this plan status to `completed` only after all automated checks pass.

**Acceptance:** Automated checks pass, the vertical flow satisfies every requirement and documentation matches the shipped behavior.

## Tests

| Test | Validates | Description |
|------|-----------|-------------|
| T1 | REQ 1, 2, 8, 9, 10, 13 | Capabilities and initial action derived for the pattern UI. |
| T2 | REQ 3, 4, 6, 7, 12, 14 | Ignore dispatch changes only the ignored flag using the existing ordered matcher. |
| T3 | REQ 5, 11, 13 | Ignore patterns cannot run retroactively and lifecycle changes do not revisit transactions. |
| T4 | REQ 1, 2, 7, 14 | Persistence accepts ignore without targets and preserves constrained actions. |
| T5 | REQ 1-14 | Vertical verification across UI build, service dispatch, repository ordering and PostgreSQL constraints. |

## Traceability

| Requirement | Design Decision | Plan Step | Test |
|-------------|-----------------|-----------|------|
| REQ 1 | D1, D4, D6 | Tasks 1, 3 | T1, T4 |
| REQ 2 | D1, D4 | Tasks 1, 3 | T1, T4 |
| REQ 3 | D1, D4 | Tasks 1, 2 | T2 |
| REQ 4 | D2 | Task 2 | T2 |
| REQ 5 | D3 | Task 2 | T3 |
| REQ 6 | D2 | Task 2 | T2 |
| REQ 7 | D2, D6 | Tasks 2, 3 | T2, T4 |
| REQ 8 | D4, D6 | Task 1 | T1 |
| REQ 9 | D4 | Task 1 | T1 |
| REQ 10 | D5 | Task 1 | T1, T5 |
| REQ 11 | D3, D5 | Tasks 2, 4 | T3, T5 |
| REQ 12 | D2, D3, D5 | Tasks 2, 4 | T2, T5 |
| REQ 13 | D3, D4 | Tasks 1, 2 | T1, T3 |
| REQ 14 | D1, D2 | Tasks 2, 3 | T2, T4 |
