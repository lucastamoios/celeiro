# Celeiro production QA checkpoint

Date: 2026-07-18

Run ID: `QA-20260718T171147Z`

Targets: `https://celeiro.laguiar.dev`, `https://api.celeiro.laguiar.dev`
Status: Paused by user after the main product workflow pass and isolation probes. OFX, final mobile accessibility, and final cleanup remain incomplete.

## Remediation progress

- QA-001 fixed locally in `e878f59`: registration now requires email-code verification before issuing a session.
- QA-002 fixed locally in `e0237de`: organization API calls derive their tenant header from the required path organization.
- QA-003 fixed locally in `e0237de`: account and password settings no longer depend on active-organization state.
- QA-004 fixed locally in `1b05938`: null planned-entry collections no longer crash pattern management.
- QA-005 fixed locally: closed months now have a service and database-enforced immutable boundary.
- These fixes are committed but not pushed, deployed, or reverified against production.

## Safety and test data

All production writes were restricted to two synthetic users and their organizations.

- User A: user ID 10, organization ID 9, account ID 9
- User B: user ID 11, organization ID 10, account ID 10
- Synthetic records are prefixed with `QA-20260718T171147Z`
- Credentials and session tokens are intentionally omitted from this report
- Raw evidence is currently under `/tmp/qa-screenshots/QA-20260718T171147Z`
- Synthetic accounts and some records remain because public account and transaction deletion workflows do not exist

## Executive summary

The landing CTAs worked in this run, so the earlier CTA failure was not reproduced. The highest-value confirmed findings are:

1. Registration accepts a reserved, unverified email and immediately authenticates the new user.
2. Organization context is absent from major settings flows, breaking organization settings and password changes.
3. The patterns settings screen crashes even though the API returns valid patterns.
4. A closed month can be mutated by adding a new budget, reopening an inconsistent mixed state.
5. Unlinking a transaction from a planned entry can erase its description.
6. Recurring planned entries appear in months before their creation or start month.

No cross-user data exposure was confirmed. The isolation API behavior is still defective: foreign organization and resource identifiers are often ignored, requests return the caller's own data, false-success 200 responses, or internal 500 errors instead of a consistent 403 or 404. User A's records were verified unchanged after the probes.

## Confirmed issue register

### QA-001: Unverified reserved email can register and authenticate

- Priority: P0
- Area: Authentication, account security
- Status: Fixed locally in `e878f59`, deployment verification pending
- Reproduction:
  1. Open sign-up.
  2. Register a new `@example.com` address.
  3. Observe immediate authenticated access without proving inbox ownership.
- Expected: Verify email ownership before activating an account or issuing a durable authenticated session.
- Actual: Registration succeeds and authenticates immediately.
- Risk: Account squatting, address impersonation, and abuse of domains or mailboxes the registrant does not control.
- Fix:
  - Create accounts in a pending-verification state.
  - Send a single-use, expiring verification token.
  - Do not issue the normal session until verification succeeds.
  - Add rate limiting, resend controls, and audit logging.
- Acceptance tests:
  - Unverified users cannot reach protected financial routes.
  - Expired and reused tokens fail.
  - Verification activates exactly one account.
  - Login before verification gives a safe, actionable response.

### QA-002: Organization context is missing in settings flows

- Priority: P1
- Area: Frontend session and organization state
- Status: Fixed locally in `e0237de`, deployment verification pending
- Evidence:
  - Organization settings displays `Organization ID is required`.
  - Members displays 0 even though the API returns the signed-in member.
  - Organization rename fails and leaves the editor open.
  - Password change fails with `Organization ID is required - ensure activeOrganization is set`.
- Expected: The active organization is restored after authentication and supplied to organization-scoped requests.
- Actual: Major settings requests execute without a usable organization context.
- Likely owners:
  - `frontend/src/api/auth.ts`
  - `frontend/src/api/organization.ts`
  - session or active-organization provider initialization
- Fix:
  - Establish one authoritative active-organization source during session bootstrap.
  - Block scoped screens behind a loading or recovery state until bootstrap finishes.
  - Make account-only operations, such as password changes, independent of organization state if the backend does not require it.
  - Replace raw internal errors with actionable UI states.
- Acceptance tests:
  - Refreshing a protected settings route restores the same organization.
  - Rename, members, invitations, and password change work after a fresh login and a hard refresh.
  - Missing or revoked organizations lead to an organization picker or recovery flow.

### QA-003: Account settings reports the wrong password state

- Priority: P1
- Area: Account settings
- Status: Fixed locally in `e0237de`, deployment verification pending
- Reproduction: Register with a password, open Account Settings, observe `Definir Senha`.
- Expected: `Alterar Senha` because `/accounts/me/` reports `has_password: true`.
- Actual: The UI shows `Definir Senha`; submission then fails due to missing organization context.
- Likely owner: `frontend/src/components/AccountSettings.tsx`
- Fix:
  - Normalize the `/accounts/me/` response shape before storing `userInfo`.
  - Test both password and passwordless users.
  - Clear password fields after success and after failure.
- Acceptance tests:
  - Password-backed user sees `Alterar Senha`.
  - Passwordless user sees `Definir Senha`.
  - Failed submissions do not retain sensitive values in visible fields.

### QA-004: Patterns settings crashes with valid API data

- Priority: P1
- Area: Pattern management
- Status: Fixed locally in `1b05938`, deployment verification pending
- Evidence:
  - UI displays `0 padrãoões cadastrados`.
  - UI error: `Cannot read properties of undefined (reading 'filter')`.
  - `GET /financial/patterns` returned two valid patterns, IDs 111 and 112.
- Expected: Render both patterns or an intentional empty state.
- Actual: Runtime error and incorrect zero count.
- Likely owner: `frontend/src/components/PatternManager.tsx`
- Fix:
  - Validate and normalize categories, patterns, and planned-entry response shapes before mapping or filtering.
  - Default every collection to an empty array at the API boundary.
  - Correct the pluralized copy.
- Acceptance tests:
  - Zero, one, and multiple patterns render without runtime errors.
  - Missing optional linked-planned-entry data does not crash.
  - The displayed count matches the API collection.

### QA-005: Closed month remains mutable

- Priority: P1
- Area: Budget integrity
- Status: Fixed locally, deployment verification pending
- Reproduction:
  1. Close June 2026, creating snapshot ID 52.
  2. Observe the add-budget control remains enabled.
  3. Add an `Outros` budget for 50.
  4. Observe the month returns to a mixed consolidated and unconsolidated state and offers consolidation again.
- Expected: Closing a month creates an immutable ledger boundary, or explicitly reopens the whole month through an audited workflow.
- Actual: New category budgets can be added after close.
- Likely owners:
  - `frontend/src/components/MonthlyBudgetCard.tsx`
  - `backend/internal/application/financial/service.go`
- Fix:
  - Store and enforce month-level closed state on every budget create, update, delete, planned-entry match, and relevant transaction mutation.
  - Disable mutation controls in the UI.
  - If reopening is a requirement, add an explicit audited reopen action that invalidates or versions the snapshot.
- Acceptance tests:
  - All direct API mutations against a closed month fail consistently.
  - The UI exposes no silent mutation path.
  - Snapshot totals remain stable until an explicit reopen.

### QA-006: Planned-entry unlink can erase transaction description

- Priority: P1
- Area: Transactions and planned entries
- Status: Confirmed through UI and API readback
- Reproduction:
  1. Create and link a transaction to planned entry 379.
  2. Unlink it.
  3. Fetch transaction 9039.
- Expected: Preserve the transaction's previous description, or restore its immutable original description.
- Actual: Both `description` and `original_description` are empty.
- Risk: Silent financial data loss and broken future matching.
- Likely owners:
  - `frontend/src/components/TransactionEditModal.tsx`
  - planned-entry match and unmatch service methods in `backend/internal/application/financial/service.go`
  - transaction update logic in `backend/internal/application/financial/repository.go`
- Fix:
  - Never write an empty description during link or unlink.
  - Preserve the pre-link description explicitly, or restore `original_description` when present.
  - Make the operation transactional.
- Acceptance tests:
  - Link and unlink preserve a manual transaction description.
  - Imported transactions restore or retain the immutable OFX description.
  - Repeated link, unlink, and relink cycles are idempotent.

### QA-007: Recurring planned entry backfills months before creation

- Priority: P1
- Area: Planned entries
- Status: Confirmed
- Reproduction: Create a recurring planned entry in July 2026, then navigate to June 2026.
- Expected: It appears only on or after its explicit start month.
- Actual: It appears in June, before it existed.
- Fix:
  - Add an explicit recurrence start month or date.
  - Filter recurrence expansion to `viewedMonth >= startMonth`.
  - Define edit semantics for future-only versus all occurrences.
- Acceptance tests:
  - No occurrences before start.
  - Year boundaries and February work.
  - Editing recurrence does not rewrite prior closed months.

### QA-008: Notes entered during manual transaction creation are discarded

- Priority: P1
- Area: Transactions
- Status: Confirmed
- Reproduction: Create a manual transaction with notes, reopen it for editing, observe empty notes.
- Expected: Notes persist on creation.
- Actual: Notes length is zero after creation. Adding notes through edit persists correctly.
- Likely owners:
  - `frontend/src/components/TransactionCreateModal.tsx`
  - create handler near `backend/internal/web/financial/handler.go:528`
- Fix:
  - Trace the create DTO from form state through JSON binding and service input.
  - Add request-contract and repository integration tests.
- Acceptance tests:
  - Empty, Unicode, multiline, and maximum-length notes round-trip through create and edit.

### QA-009: Editing a planned amount leaves stale total until reload

- Priority: P2
- Area: Planned entries and budget summary
- Status: Confirmed
- Expected: Row and aggregate totals update after a successful edit.
- Actual: The edit succeeds, but the displayed total remains stale until reload.
- Fix:
  - Update the canonical query cache or refetch both planned entries and aggregates after mutation.
  - Avoid maintaining duplicate derived state.
- Acceptance tests:
  - Edit amount, type, dismissed state, and month, then verify all dependent totals update immediately.

### QA-010: Future planned entry is labeled overdue

- Priority: P2
- Area: Planned entries
- Status: Confirmed
- Reproduction: On July 18, view an active entry expected on July 21.
- Expected: Upcoming or pending.
- Actual: `Atrasado`.
- Fix:
  - Compare normalized local calendar dates, not inverted or UTC-shifted timestamps.
  - Define overdue as active, unmatched, not dismissed, and expected date strictly before today.
- Acceptance tests:
  - Yesterday is overdue, today is due, tomorrow is upcoming across time zones.

### QA-011: Isolation errors and false-success responses violate the API contract

- Priority: P2
- Area: Authorization and API error handling
- Status: Confirmed, no cross-user exposure observed
- Test performed:
  - User B sent User A's organization ID 9 and A resource IDs across GET, POST, PATCH, PUT, and DELETE probes.
  - Reverse representative reads were sent by User A against organization 10.
- Actual:
  - Several detail routes returned 500 or 405 instead of 403 or 404.
  - List routes returned 200 with the caller's own data even when a foreign organization path or header was supplied.
  - Some writes returned 200 success while affecting no User A record.
  - A category create with header organization 9 created a User B-owned category, proving the foreign header was ignored rather than authorized.
  - User A's transactions, categories, patterns, budget, planned entry, goal, and tag remained unchanged after probes.
- Expected: Validate path ID, header organization, authenticated membership, and resource ownership consistently; reject mismatches with non-enumerating 403 or 404.
- Fix:
  - Resolve organization once in middleware and reject mismatches before handlers run.
  - Scope every repository query by both resource ID and authorized organization ID.
  - Return not-found when an update or delete affects zero rows.
  - Remove 500s caused by expected authorization or not-found cases.
- Acceptance tests:
  - Full two-tenant matrix for every organization-scoped resource and method.
  - Foreign identifiers never return the caller's substitute data.
  - No false-success mutation response when zero rows are affected.

### QA-012: Transaction deletion is unavailable

- Priority: P2
- Area: Transaction lifecycle
- Status: Confirmed capability gap
- Evidence: No delete action in the transaction menu and no transaction DELETE route in `backend/internal/web/router.go`.
- Expected: If deletion is a supported product requirement, expose a reversible archive or delete flow with confirmation and auditability.
- Fix decision:
  - Prefer soft delete or archive for financial records.
  - Define effects on budgets, goals, snapshots, planned-entry matches, and imported duplicate detection.

### QA-013: Gmail forwarding copy promises automatic confirmation

- Priority: P2
- Area: Account settings and Gmail forwarding
- Status: Confirmed copy defect
- Evidence: `frontend/src/components/AccountSettings.tsx` says Gmail confirmation "será feito automaticamente".
- Expected: Describe the actual manual or extension-assisted confirmation steps and failure states.
- Fix: Replace the promise with accurate state-dependent guidance.

### QA-014: Inconsistent localization and accessibility labels

- Priority: P3
- Area: UI quality and accessibility
- Status: Partially confirmed
- Examples:
  - English strings in Portuguese UI: `No income for this month`, `Create an income budget to track your income allocation`, `On Track`, `Actions`.
  - Signup mode retains the heading `Entrar` and login-oriented subtitle.
  - Tag settings copy omits accents.
  - Generic image alt text such as `goal icon`.
- Likely owners:
  - `frontend/src/components/MonthlyBudgetCard.tsx`
  - `frontend/src/components/CategoryBudgetCard.tsx`
  - `frontend/src/components/SavingsGoalCard.tsx`
- Fix:
  - Centralize user-facing copy in the localization layer.
  - Give icon-only controls contextual Portuguese accessible names.
  - Run keyboard and screen-reader smoke tests after the functional P1 fixes.

## Successful workflows

- Landing primary and animated CTAs both navigated to login.
- Manual transaction creation worked and escaped HTML-like content.
- Inline transaction description supported Escape to cancel and Enter to save.
- Inline and modal category assignment worked.
- Tag creation and transaction tag assignment persisted.
- Pattern creation and retroactive application worked at the API and transaction level.
- July budget creation worked.
- Planned-entry create, edit, link, unlink, dismiss, and reactivate actions executed.
- August copy-from-previous-month worked.
- Budget Markdown export copied a document containing the run ID.
- Goal creation and positive and negative contributions worked.
- User A and User B remained data-isolated in the observed probes.

## Coverage not completed

Resume from this list:

- Full OFX corpus: valid variants, encodings, malformed input, duplicates, overlap, cross-account FITID behavior, 10 MiB boundary, multi-file ordering, rapid repeat, and concurrent import.
- Auth finish: invalid credentials, refresh persistence, logout protection, expired-session behavior, and recovery flows.
- Invitations and roles: create, accept with controlled inbox, cancel, permission boundaries.
- Savings goal complete, reopen, edit, and delete. Native browser confirmation blocked the automation tab, so use API coverage or a fresh browser path.
- Authenticated mobile layouts and final keyboard or screen-reader accessibility sweep.
- Frontend and API health endpoints.
- Final cleanup of disposable synthetic categories, tags, patterns, budgets, planned entries, goals, and invitations. Accounts, transactions, and snapshots may remain because no supported deletion route was found.

## Recommended repair order

1. QA-001, block unverified account activation.
2. QA-002 and QA-003, repair session and organization bootstrap plus password state.
3. QA-006 and QA-008, stop transaction data loss.
4. QA-005 and QA-007, enforce financial time-boundary integrity.
5. QA-004, restore pattern management.
6. QA-011, normalize tenant mismatch enforcement and errors.
7. QA-009 and QA-010, fix planned-entry derived state and dates.
8. QA-012 and QA-013, product lifecycle and forwarding copy decisions.
9. QA-014, localization and accessibility pass.

For implementation, handle one issue at a time with a failing regression test first, then run the focused suite and a browser verification against a non-production environment before deployment.
