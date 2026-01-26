# Planned Entry + Pattern UX Unification

## Context

### Original Request
User is unsatisfied with the flow for creating Planned Entries + Patterns.

Requirements:
- User can start from Transactions page OR Budgets/Planned Entries page, but the resulting pattern should be the same.
- If starting from Transactions: prefill the *source* (bank/original description) and ask for the *translation* (target/final description).
- If starting from Planned Entries: prefill the *target* (planned entry description) and help define the *source* (pattern), including a list of "current unmatched" items to pick the source from.
- The "Criar Padrão Rápido" button is disliked. It should ONLY appear when the planned entry is already matched/linked to a transaction and there is no existing pattern; clicking it should create a pattern based on that linked transaction + the planned entry.

### Current State (Evidence)

**Transactions → Pattern**
- UI: `frontend/src/components/TransactionEditModal.tsx` (button: "Criar Padrão")
- API: `GET /financial/transactions/{id}/pattern-draft` → then opens `frontend/src/components/PatternCreator.tsx`
- Backend draft: `backend/internal/web/financial/handler.go` `GetTransactionPatternDraft`
  - Uses `tx.Description` first, fallback to `tx.OriginalDescription`
  - Draft currently sets both `description_pattern` and `target_description` to the same baseText

**Current wiring reality (important)**:
- `frontend/src/components/TransactionEditModal.tsx` currently ignores `description_pattern` from the draft and only uses `patternDraft.description` to populate `PatternCreator` (which currently treats it as the *target*). Backend changes alone will not fix the UX without updating this wiring.

**Planned Entry → Pattern**
- UI: `frontend/src/components/PlannedEntryForm.tsx`
  - Shows "Padrão de Auto-Matching" section whenever `!linkedPatternId`
  - "Criar Padrão Rápido": POST `/financial/patterns` with `(?i).*<escaped planned-entry description>.*` and `apply_retroactively: true`
  - "Avançado": opens `frontend/src/components/PatternCreator.tsx` with `initialData.description = planned entry description`

**Pattern ↔ Planned Entry linking model**
- DB: `planned_entries.pattern_id` references `patterns.pattern_id`
- Frontend sees `PlannedEntry.PatternID` in responses, sends `pattern_id` in requests
- No dedicated link/unlink endpoints; use `POST/PUT /financial/planned-entries` with `pattern_id`
- Important caveat: clearing `pattern_id` via update is currently not possible due to COALESCE update semantics (needs explicit clear support)

### Metis Review (Key Gaps)
- Clarify “linked/matched to a transaction”: monthly match (`MatchedTransactionID`) vs pattern link (`PatternID`).
- Clarify what the “current unmatched list” is (unmatched transactions vs planned-entry statuses).
- Ensure both entry points converge on identical pattern creation structure.
- Ensure fast create button visibility can actually be determined in the component where it lives (current form doesn’t have match context).

---

## Work Objectives

### Core Objective
Make pattern creation feel consistent and intentional regardless of entry point, by converging both flows into a single rule builder experience with context-appropriate prefills.

### Concrete Deliverables
- Updated UX flows for:
  - Transaction → Pattern (source prefilled from original_description)
  - Planned Entry → Pattern (target prefilled; user chooses source from a list)
- "Criar Padrão Rápido" behavior changed to: only available when a planned entry has a matched transaction and no pattern.
- Clear terminology in UI: distinguish *source* (what to match) vs *target* (what to rename to).

### Definition of Done
- From Transactions, user can create a pattern where:
  - Source defaults to transaction `original_description` (or best available fallback)
  - Target is explicitly editable and not forcibly equal to source
- From Planned Entries, user can create a pattern where:
  - Target defaults to planned entry description
  - Source can be selected from a "current unmatched" list (defined in Decision 1)
- Fast create pattern button:
  - Only appears when planned entry is matched to a transaction AND planned entry has no PatternID
  - Creates a pattern using linked transaction context + planned entry fields
- Manual QA steps (below) pass in staging.

### Must NOT Have (Guardrails)
- Do not change the underlying pattern matching algorithm beyond necessary prefills.
- Do not redesign unrelated parts of the UI.
- Do not introduce a new pattern data model; reuse existing `/financial/patterns`.
- Do not add new backend endpoints unless the plan explicitly says so (this plan avoids new endpoints by passing already-fetched monthly transactions down from the budgets page).

---

## Verification Strategy

### Test Decision
- Backend tests exist (Go). Web frontend lacks established unit/e2e infra.
- Plan uses: backend unit tests where touched + manual QA + optional Playwright verification steps.

---

## Decisions (Resolved)

1) “List of current unmatched entries” (explicit definition):
- Base set: transactions in the selected month/year (as per budgets view; month/year determined by `parseTransactionDate(transaction.transaction_date)` and compared to the currently selected `month`/`year`).
- Exclusions:
  - `transaction.is_ignored === true`
  - transactions already used as a planned-entry match for that month (i.e., present in `matchedTransactionIds` derived from `PlannedEntryWithStatus.MatchedTransactionID`)
- Type filter:
  - For an expense planned entry: include only debit transactions
  - For an income planned entry: include only credit transactions
- Category filter:
  - Default: `transaction.category_id === plannedEntry.CategoryID`
  - Optional toggle: include `category_id == null` (uncategorized)

Month/year source for the chooser:
- Use the month/year of the planned-entry status context the user clicked (i.e., the month/year passed into the edit/create modal), not a global default.
- Pass this as `context.month` / `context.year` into `PatternCreator`.

2) Transaction draft target prefill:
- Chosen: leave target empty; user must type the final description.

3) Source fallback rules (NEW):
- Preferred: `transaction.original_description`
- Fallback: `transaction.description`
- If both empty:
  - Transaction-start flow: show error toast in `TransactionEditModal` and do NOT open `PatternCreator`.
  - Planned-entry-start chooser: exclude the transaction from the candidate list.

---

## Task Flow

1) Align and clarify the shared PatternCreator semantics (source vs target) →
2) Fix Transaction → Pattern draft and prefill behavior →
3) Implement Planned Entry → Pattern flow + unmatched chooser →
4) Fix "Criar Padrão Rápido" visibility + behavior →
5) Manual QA on staging.

---

## TODOs

### 0) UX Copy + Terminology Alignment ✅

**What to do**:
- Define consistent labels in `PatternCreator`:
  - Source: "Texto do banco (para encontrar)" (uses original_description)
  - Target: "Como deve aparecer (renomear para)"
- Ensure both entry points use the same modal, same copy, same field ordering.

**References**:
- `frontend/src/components/PatternCreator.tsx` (current field roles: `simpleDescriptionText` vs `targetDescription`)

**Acceptance Criteria**:
- In `frontend/src/components/PatternCreator.tsx`, labels are exactly:
  - Source: `Texto do banco (para encontrar)`
  - Target: `Como deve aparecer (renomear para)`
- Field order is Source first, Target second.
- Defaults:
  - `variant='from_transaction'`: source prefilled; target empty
  - `variant='from_planned_entry'`: source empty; target prefilled

### Contract: PatternCreator “source vs target” (Implementation Spec)

This plan requires making the source/target contract explicit because today `PatternCreator` treats `initialData.description` as the *target*.

**New props (recommended)** for `frontend/src/components/PatternCreator.tsx`:
- `initialSourceText?: string` (prefills `simpleDescriptionText` in simple mode)
- `initialTargetDescription?: string` (prefills `targetDescription`)
- `initialTargetCategoryId?: number` (prefills `targetCategoryId`)
- `variant?: 'from_transaction' | 'from_planned_entry' | 'edit'` (controls which helper UI is shown)
- `context?: { month: number; year: number; candidateTransactions?: Transaction[]; matchedTransactionIds?: number[]; plannedEntry?: PlannedEntryWithStatus }`

**Canonical simple-mode pattern rule (must be consistent everywhere)**:
- When `useRegex=false` (simple mode), the saved `description_pattern` MUST be:
  - `(?i).*${escapeRegex(sourceText.trim())}.*`
- Escaping MUST be identical to `regexp.QuoteMeta` semantics (frontend helper `escapeRegex()` that matches `PlannedEntryForm` quick-create).
- This aligns:
  - `frontend/src/components/PlannedEntryForm.tsx` quick-create
  - `backend/internal/web/financial/handler.go` transaction draft
  - `frontend/src/components/PatternCreator.tsx` simple-mode save

**Non-goals**:
- Do not auto-wrap/escape when `useRegex=true` (advanced mode). User owns the regex.

**Edit-mode compatibility note**:
- `frontend/src/components/PatternCreator.tsx` currently uses `extractSimpleText()` which only understands patterns like `.*text.*`.
- Because canonical format includes `(?i)`, update `extractSimpleText()` to also accept `(?i).*text.*` so existing patterns remain editable in simple mode.
- Also update `isAdvancedPattern()` so canonical `(?i).*<escaped>.*` is treated as SIMPLE (not advanced), otherwise the UI will always force advanced mode for the canonical format.

**Rules**:
- In `variant='from_transaction'`:
  - Source prefilled from Decision 3.
  - Target starts empty (Decision 2).
  - Target category:
    - If tx has category, prefill it; user can change.
- In `variant='from_planned_entry'`:
  - Target prefilled with planned entry description.
  - Source starts empty until the user picks from the unmatched transactions chooser.
  - Target category:
    - Prefill from the planned entry category and do not auto-change it when picking an unmatched transaction.
- In `variant='edit'` (existing behavior): derived from `existingPattern`.

### 1) Fix Transaction → Pattern Draft Prefill (Backend) ✅

**What to do**:
- Update `GetTransactionPatternDraft` to:
  - Keep response backward-compatible, but add explicit fields.
  - New/updated response contract (JSON under `data`):
    - `source_text`: string (Decision 3)
    - `description_pattern`: string (canonical simple-mode rule)
    - `target_description`: "" (empty string)
    - `target_category_id`: number | null (tx.CategoryID)
    - `apply_retroactively`: true
    - Back-compat fields:
      - `description`: keep as `source_text`
      - `category_id`: keep as `target_category_id`
  - Ensure `description_pattern` is built from `source_text` using canonical simple-mode rule (see Contract section).
  - Keep `apply_retroactively=true` default

  - Error contract (distinguishable by API `code`):
    - If tx has no category: `code=TRANSACTION_CATEGORY_REQUIRED` (status 400)
    - If tx has no usable description: `code=TRANSACTION_DESCRIPTION_REQUIRED` (status 400)
    - Define new error values in `backend/internal/errors/errors.go` and map them in `backend/internal/web/responses/responses.go`.
- Ensure draft response supports the frontend’s need for *separate* source vs target values.

**References**:
- `backend/internal/web/financial/handler.go` `GetTransactionPatternDraft`
- `frontend/src/components/TransactionEditModal.tsx` (fetches `pattern-draft` and opens `PatternCreator`)

**Acceptance Criteria**:
- Calling pattern creation from a transaction produces a draft where source and target are not forcibly the same.
- If `original_description` is present, it is used as source.
- If both descriptions are empty, endpoint returns 400 with `code=TRANSACTION_DESCRIPTION_REQUIRED`.
- If category is missing, endpoint returns 400 with `code=TRANSACTION_CATEGORY_REQUIRED`.

**Frontend mapping requirement**:
- `frontend/src/components/TransactionEditModal.tsx` must:
  - Prefer `draft.source_text` for `initialSourceText` (fallback to `draft.description` for back-compat)
  - Keep target empty
  - On error: parse JSON and branch on `code`:
    - `TRANSACTION_CATEGORY_REQUIRED` → “Salve a transação com uma categoria primeiro”
    - `TRANSACTION_DESCRIPTION_REQUIRED` → “Transação sem descrição para criar padrão”

### 2) Refactor PatternCreator to Support Two Prefill Modes (Frontend) ✅

**What to do**:
- Extend `PatternCreator` inputs to accept explicit:
  - `initialSourceText` and `initialTargetDescription` separately (see Contract section).
- Ensure "simple mode" can be prefilled with a suggested source text.
- Ensure existing edit-mode (`existingPattern`) continues to work.

- Update simple-mode regex building to use the canonical rule (escape + `(?i)`).
- Variant behavior for existing planned-entry-linking UI inside PatternCreator:
  - `variant='from_planned_entry'`: hide/disable the existing linking toggle; do not fetch `planned-entries?is_active=true`.
  - `variant='from_transaction'`: keep existing behavior (optional linking) and allow the planned-entry selector (it may fetch `planned-entries?is_active=true`).
  - `variant='edit'`: keep existing behavior.

**References**:
- `frontend/src/components/PatternCreator.tsx`
- `frontend/src/components/TransactionEditModal.tsx` (current `initialData` usage)
- `frontend/src/components/PlannedEntryForm.tsx` (opens PatternCreator with `initialData.description`)
- `frontend/src/components/PatternManager.tsx` (also opens PatternCreator)

**Acceptance Criteria**:
- Transaction-start flow: source prefilled; target starts empty; user can change both.
- Planned-entry-start flow: target prefilled; source initially empty until user picks.
- `frontend/src/components/TransactionEditModal.tsx` passes `variant='from_transaction'` + `initialSourceText`.
- `frontend/src/components/PlannedEntryForm.tsx` passes `variant='from_planned_entry'` + `initialTargetDescription`.
- `frontend/src/components/PlannedEntryForm.tsx` passes `initialTargetCategoryId` based on the planned entry category.
- `frontend/src/components/PatternManager.tsx` continues to work by using `variant='edit'` (or leaving `variant` undefined and defaulting to edit semantics).

### 3) Planned Entry → Pattern Flow: Add “Unmatched Transactions” Chooser

**What to do**:
- Add UI inside PatternCreator (planned-entry mode) to pick a source description from the “current unmatched” list (Decision 1).
- Data sourcing (no new backend endpoints; no per-transaction API calls):
  - Source of truth for month/year + monthly transactions is `frontend/src/components/CategoryBudgetDashboard.tsx`.
  - Planned entries are rendered through `frontend/src/components/MonthlyBudgetCard.tsx` → `frontend/src/components/PlannedEntryCard.tsx`.
  - Planned-entry create/edit modal is launched from `frontend/src/components/CategoryBudgetDashboard.tsx` and uses `frontend/src/components/PlannedEntryForm.tsx`.
  - Month/year source of truth:
    - If editing an existing planned entry status: use the month/year passed into `handleEditPlannedEntry(entry, month, year)` (CategoryBudgetDashboard tracks this separately from selected month).
    - If creating a new entry: use the currently selected month/year.
  - Therefore, pass that *context month/year* plus `candidateTransactions` and `matchedTransactionIds` from `CategoryBudgetDashboard` into `PlannedEntryForm`, then into `PatternCreator` via the `context` prop.
  - Build `matchedTransactionIds` from planned-entry statuses already in memory:
    - `matchedTransactionIds = plannedEntriesWithStatus.map(e => e.MatchedTransactionID).filter(Boolean)`
  - Apply Decision 1 to build the list (month/year window, ignore flags, debit/credit by entry type, category filter + uncategorized toggle).
- Sorting (after filtering):
  - Primary: abs(amount - plannedEntry.AmountMax/Amount)
  - Secondary: abs(day(transaction_date) - plannedEntry.ExpectedDayStart/End midpoint)
- When user selects a transaction:
  - Set source text from Decision 3
  - Show a read-only preview of the resulting simple regex `(?i).*<escaped>.*` (helps user trust what will match).

**References**:
- Existing planned-entry selection UI patterns:
  - `frontend/src/components/PlannedEntryLinkModal.tsx` (selector patterns)
  - `frontend/src/components/CategoryTransactionsModal.tsx` (transaction + planned entry context)
- Existing transaction endpoints usage:
  - `frontend/src/components/TransactionEditModal.tsx`
- Reuse/align with existing matching UX logic:
  - `frontend/src/components/TransactionMatcherModal.tsx` (already implements transaction scoring/filtering for planned entries)

**Acceptance Criteria**:
- From planned entry page, user can create a pattern without leaving the context, selecting a real bank description from a list.
- Empty-state handled (no candidate transactions).
- The chooser does not require additional API calls (uses the already loaded monthly data).
- Concrete check method:
  - Browser DevTools → Network (filter `financial`), open PatternCreator from planned entry and pick a source.
  - Verify there are no requests besides the eventual POST `/financial/patterns` when saving.

### 4) Change “Criar Padrão Rápido” Behavior

**What to do**:
- Remove or hide the current quick-create pattern section from `PlannedEntryForm` unless conditions are met.
- Reintroduce the quick-create action in a place that has match context (likely `PlannedEntryCard` action menu) so it can check:
  - Planned entry has `MatchedTransactionID` for current month
  - Planned entry has no `PatternID`
- On click:
  - Build a pattern with source from linked transaction using Decision 3 fallback rules
  - Target from planned entry description
  - Category from planned entry category
  - Create pattern (POST `/financial/patterns`), then link it to planned entry (PUT `/financial/planned-entries/{id}` with `pattern_id`).

**Precise UI placement + wiring (correct owner components)**:
- The planned-entry cards live in:
  - `frontend/src/components/MonthlyBudgetCard.tsx` → renders `frontend/src/components/PlannedEntryCard.tsx`
- The state (month/year + monthly transactions + planned entries list) lives in:
  - `frontend/src/components/CategoryBudgetDashboard.tsx`

Implementation plan (must cover where users click most):

Primary location (category budget expanded menu):
1) Add a menu item in `frontend/src/components/CategoryBudgetCard.tsx` expanded entry actions, visible only when:
   - `entry.Status === 'matched'` AND `entry.MatchedTransactionID` is present AND `!entry.PatternID`
   - Label: "Criar padrão do vínculo"

Definition of “no existing pattern”:
- `entry.PatternID` is `null/undefined` (i.e., planned entry has no linked pattern_id).
2) Add a new prop callback to `CategoryBudgetCard`:
   - `onCreatePatternFromMatch?: (entry: PlannedEntryWithStatus, month: number, year: number) => void`
3) Implement the callback in `frontend/src/components/CategoryBudgetDashboard.tsx` (it owns month/year + monthly transactions list):
   - Find matched transaction in its existing monthly transaction list using `entry.MatchedTransactionID`.
   - If not found: show an error toast and instruct user to open the transaction and use Transaction → Pattern.
   - Compute `sourceText` using Decision 3.
   - Create pattern using canonical simple-mode rule.
   - POST `/financial/patterns`, then PUT `/financial/planned-entries/{id}` with `pattern_id`.
   - Refresh UI by re-fetching planned entries for that month/year OR patch the entry in state.

Secondary location (orphan entries + drag overlay):
4) Optionally add the same action to `frontend/src/components/PlannedEntryCard.tsx` (used by `frontend/src/components/MonthlyBudgetCard.tsx` for orphan entries and drag overlay), using a similarly threaded callback.

**References**:
- Current quick-create UI: `frontend/src/components/PlannedEntryForm.tsx` ("Criar Padrão Rápido")
- Planned entry card context and actions: `frontend/src/components/PlannedEntryCard.tsx` (has status context)
- Planned entry status fields: `frontend/src/types/budget.ts` (`MatchedTransactionID`, `PatternID`)

**Acceptance Criteria**:
- Button/action appears only when the planned entry is matched and has no pattern.
- Clicking creates + links a pattern; UI indicates success and future transactions get auto-renamed/categorized.
- After success, the action disappears immediately (because PatternID is now present).
- Concrete check: the created pattern’s `description_pattern` starts with `(?i).*` and contains escaped source text.

### 5) Fix Backend Support for Unlinking/Replacing a Pattern (Needed for UX) ✅

**What to do**:
- Add explicit support to clear `planned_entries.pattern_id` when user removes a linked pattern.
- Align with earlier approach used for clearing nullable fields (avoids COALESCE trap).

**Concrete contract** (recommended): sentinel value
- Frontend sends `pattern_id: -1` to mean "clear the pattern link".
- Backend handler maps `pattern_id == -1` to an explicit clear.
- Repository update query uses `CASE WHEN $pattern_id = -1 THEN NULL ELSE COALESCE($pattern_id, pattern_id) END`.

**Why sentinel**: it matches an existing pattern used elsewhere in the codebase for clearing nullable IDs (keeps request shape simple, avoids adding a new boolean field).

**References**:
- Backend update semantics caveat: `backend/internal/application/financial/repository.go` (planned entry update query uses COALESCE)
- Frontend “Remover” button exists: `frontend/src/components/PlannedEntryForm.tsx` (currently only clears local state)

**Acceptance Criteria**:
- User can remove a linked pattern from a planned entry and persist it.
- After removal, the UI updates and fast-create action can appear again when matched.

**Frontend wiring (must be explicit)**:
- In `frontend/src/components/PlannedEntryForm.tsx`, distinguish:
  - “no pattern linked” vs “user explicitly removed a previously linked pattern”.
- Recommended implementation: add `patternRemoved` boolean state.
  - When user clicks "Remover": set `linkedPatternId=null`, clear name, and set `patternRemoved=true`.
  - When user links/creates a pattern: set `patternRemoved=false`.
  - On submit/update: if `patternRemoved===true`, send `pattern_id: -1`; else send `pattern_id: linkedPatternId || undefined`.

**Backend test coverage**:
- Add an integration test using existing testcontainers harness WITHOUT requiring `FinancialService`:
  - Use `backend/internal/tests/integration/base_test_suite.go` for DB setup.
  - In the test, insert minimal rows using raw SQL on `base.DB`:
    - Insert user + organization (reuse `CreateUserAndAuthenticate` helpers)
    - Insert a category
    - Insert a pattern row
    - Insert a planned_entry row with `pattern_id` set
  - Then exercise the repository update path:
    - Instantiate financial repository (`financial.NewRepository(base.DB)`) and call the planned-entry update method with `pattern_id=-1`
    - OR, if repository method signatures are awkward, call the update SQL directly for the sentinel path and verify it sets NULL.
  - Verify by SELECT that `planned_entries.pattern_id IS NULL`.

**Deterministic sorting edge cases (for Task 3)**:
- Planned amount used for scoring:
  - Prefer `AmountMax` if present, else `AmountMin` if present, else `Amount`.
- Expected day midpoint:
  - If `ExpectedDayStart` and `ExpectedDayEnd` exist: midpoint = floor((start+end)/2)
  - Else if `ExpectedDay` exists: midpoint = ExpectedDay
  - Else: skip day scoring and sort by amount only.

### 6) Manual QA (Staging)

**What to do**:
- Transactions-start flow:
  - Open a transaction → Create Pattern
  - Verify source is transaction original description
  - Set target description; save; verify other matching transactions get updated (if apply retroactively enabled)
- Planned-entry-start flow:
  - Open planned entry → Create Pattern
  - Choose source from unmatched transactions list; save
  - Verify future imports/transactions match and get renamed/categorized
- Fast create:
  - Take a planned entry that is matched but has no PatternID
  - Click fast-create; verify pattern created and linked
- Unlink:
  - Remove linked pattern and verify persistence

**Evidence**:
- Screenshots of modal states before/after.
- Copy/paste of any API errors.

---

## Notes / Risks

- Frontend currently lacks formal test infra; changes should be validated with thorough manual QA.
- Ambiguity around “unmatched list” is the biggest UX risk; default chosen above but can be overridden.
- Ensure we don’t accidentally build patterns from edited `description` instead of `original_description`.
