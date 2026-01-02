# Add Transaction Matching System

## Why

Users need automatic assistance with:
1. **Matching transactions to patterns**: When a transaction arrives, automatically categorize it based on saved patterns
2. **Reusing transaction patterns**: Save frequently recurring transactions as patterns for faster categorization
3. **Enforcing income planning**: Ensure 99.75% of income is allocated to categories before month ends

Without this, users must manually categorize every transaction, which is tedious and error-prone.

## What Changes

Add transaction matching capabilities using **saved patterns** (stored in `planned_entries` with `is_saved_pattern=true`) and a **weighted scoring** algorithm:

### Core Capabilities
1. **Scored Matching**: A transaction gets a score against each saved pattern (category/amount/description/date)
2. **Auto-Apply on Import**: When importing transactions, automatically apply HIGH confidence matches
3. **Suggestions for Ambiguous Cases**: When multiple patterns score above threshold, present suggestions to user
4. **Income Planning Discipline**: Warn if >0.25% of income remains unallocated

### Matching Logic
A transaction is compared to each saved pattern and receives a score based on:
- **Category** (required; mismatched category yields score 0)
- **Amount** (tolerance-based)
- **Description** (fuzzy similarity via normalization + edit distance)
- **Date** (expected day-of-month proximity, when provided)

### Match Outcomes
| Scenario | Action |
|----------|--------|
| **Single HIGH match** | Auto-apply: set category |
| **Multiple matches above threshold** | Suggest: show all matches for user to choose |
| **No Match** | Manual: user categorizes manually |

### Out of Scope
- Machine learning / AI-based matching
- Regex-only deterministic matching as the primary matching mechanism
- Historical pattern analysis
- Multi-currency matching

## Impact

### Affected Components
**Backend**:
- `internal/application/financial/matching.go` - Matching algorithm
- `internal/application/financial/matching_service.go` - Pattern matching service methods
- `internal/web/financial/handler.go` - Match suggestion + apply/save endpoints

**Frontend**:
- Update transaction import flow to show matching results
- Add UI for resolving ambiguous matches (multiple patterns)

**Database Changes**:
- Uses `planned_entries.is_saved_pattern` to store patterns

### Dependencies
- **REQUIRES**: planned entries + transaction import flow
- **INTEGRATES**: OFX import + category-centric budgeting (patterns are planned entries)

## Risks

### Multiple Pattern Matches
**Risk**: Transaction matches multiple patterns, causing confusion
**Mitigation**: Show suggestions modal, let user pick which pattern to apply

### Performance
**Risk**: Scoring N patterns per transaction could be slow on large batches
**Mitigation**:
- Early exit on first criteria failure
- Pre-filter on large amount differences before fuzzy matching
- Limit evaluation to active saved patterns only

## Success Criteria

1. When importing a transaction with a HIGH-confidence match, it's automatically categorized
2. When importing a transaction with multiple candidate matches, user sees a suggestion modal
3. User can save a categorized transaction as a reusable pattern in one click
4. Income planning warnings show if >0.25% unallocated
5. Pattern matching completes in <500ms for 100+ patterns
