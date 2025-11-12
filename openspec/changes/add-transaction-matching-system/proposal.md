# Add Transaction Matching System

## Why

Users need automatic assistance with:
1. **Matching transactions to planned entries**: When a transaction arrives, automatically link it to the corresponding planned entry
2. **Reusing transaction patterns**: Save frequently recurring transactions as patterns for faster categorization
3. **Enforcing income planning**: Ensure 99.75% of income is allocated to categories before month ends
4. **Smart categorization**: Use fuzzy matching to suggest categories based on description/amount

Without this, users must manually categorize every transaction and plan every dollar, which is tedious and error-prone.

## What Changes

Add intelligent transaction matching capabilities:

### Core Capabilities
1. **Match Score Algorithm**: Weighted scoring (40% category, 30% amount, 20% description, 10% date)
2. **Saved Patterns**: Reuse the unified `planned_entries` table to store both planned entries AND saved patterns
3. **Income Planning Discipline**: Warn if >0.25% of income remains unallocated
4. **Auto-Match Service**: Automatically suggest matches when transactions are imported

### Key Features
- Fuzzy description matching using Levenshtein distance
- Amount tolerance (±5% by default)
- Date proximity scoring (within 3 days = full score)
- Confidence threshold (>70% = auto-apply, 50-70% = suggest, <50% = no match)

### Out of Scope
- Machine learning / AI-based matching
- Bulk transaction import optimization (initial version is per-transaction)
- Historical pattern analysis
- Multi-currency matching

## Impact

### Affected Components
**Backend**:
- `internal/application/financial/matching_service.go` - NEW
- `internal/application/financial/models.go` - Add MatchScore struct
- `internal/handlers/financial/` - Add GET /financial/match-suggestions endpoint

**No Database Changes**: Reuses existing `planned_entries` table (already created in category-centric-budgeting)

### Dependencies
- **BLOCKS**: Must implement AFTER add-category-centric-budgeting (needs `planned_entries` table)
- **INTEGRATES**: Works with transaction import flow

## Risks

### Overly Aggressive Matching
**Risk**: False positives with low match scores
**Mitigation**: Conservative confidence threshold (70% for auto-apply), always show suggestions for user confirmation

### Performance on Large Datasets
**Risk**: Fuzzy matching across 1000+ patterns could be slow
**Mitigation**:
- Index on category_id for fast filtering
- Early exit if category doesn't match
- Limit fuzzy matching to top N candidates

## Success Criteria

1. When importing a transaction that matches a pattern (>70%), it's automatically linked
2. User can save a categorized transaction as a reusable pattern in one click
3. Income planning warnings show if >0.25% unallocated
4. Match suggestions API returns results <500ms for 100+ patterns
5. Fuzzy matching correctly identifies minor description variations
