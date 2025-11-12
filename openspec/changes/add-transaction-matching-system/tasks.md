# Implementation Tasks: Transaction Matching System

## Phase 1: Database Extension (Blocking)

1. **Create migration to extend planned_entries**
   - Add `is_saved_pattern BOOLEAN NOT NULL DEFAULT FALSE` column
   - Add index on `is_saved_pattern` for pattern queries
   - Validation: Migration applies cleanly, column exists

## Phase 2: Matching Algorithm (Core)

2. **Create MatchScore struct and models**
   - Add `MatchScore` struct in `models.go`
   - Add constants (weights, thresholds, tolerance)
   - Validation: Structs compile, constants defined

3. **Implement Levenshtein distance function**
   - Implement or import levenshtein algorithm
   - Add string normalization (lowercase, trim)
   - Validation: Unit tests with known string pairs

4. **Implement fuzzy description matching**
   - Create `fuzzyMatch(s1, s2 string) float64` function
   - Use Levenshtein distance
   - Return similarity score [0.0-1.0]
   - Validation: Test with sample descriptions

5. **Implement CalculateMatchScore function**
   - Category match (40% weight) - exact match required
   - Amount match (30% weight) - tolerance-based
   - Description match (20% weight) - fuzzy
   - Date match (10% weight) - proximity
   - Calculate weighted sum
   - Determine confidence level
   - Validation: Table-driven tests with known scores

6. **Implement FindMatches with optimization**
   - Early exit on category mismatch
   - Pre-filter on amount difference
   - Only return matches ≥50% score
   - Sort by score descending
   - Validation: Performance test with 100+ patterns

## Phase 3: Pattern Management Service

7. **Create PatternService**
   - Implement `SaveTransactionAsPattern`
   - Implement `GetMatchSuggestionsForTransaction`
   - Implement `ApplyPatternToTransaction`
   - Validation: Service tests with mocked repositories

8. **Update PlannedEntryRepository**
   - Add `ListSavedPatterns(ctx, userID, orgID)`
   - Add `ListByCategory(ctx, categoryID)` for filtering
   - Validation: Repository tests

## Phase 4: Income Planning Service

9. **Create IncomePlanningService**
   - Implement `CheckIncomePlanning(userID, month, year)`
   - Calculate total income from transactions
   - Calculate total planned from category budgets
   - Compare against 0.25% threshold
   - Return planning report
   - Validation: Service tests with sample data

## Phase 5: HTTP Handlers

10. **Create MatchSuggestionsHandler**
    - Implement `GET /financial/match-suggestions?transaction_id={id}`
    - Return sorted suggestions with scores
    - Filter out LOW confidence (<50%)
    - Validation: Handler tests with httptest

11. **Create ApplyPatternHandler**
    - Implement `POST /financial/transactions/{id}/apply-pattern`
    - Accept patternId in request body
    - Update transaction category
    - Link transaction to pattern
    - Validation: Handler tests

12. **Create SavePatternHandler**
    - Implement `POST /financial/transactions/{id}/save-as-pattern`
    - Accept saveAsRecurrent flag
    - Create planned_entry with is_saved_pattern=true
    - Validation: Handler tests

13. **Create IncomePlanningHandler**
    - Implement `GET /financial/income-planning?month={month}&year={year}`
    - Return planning report with status
    - Validation: Handler tests

14. **Update router configuration**
    - Register new routes in router
    - Add route group for `/financial/match-suggestions`
    - Validation: Test routing with curl

## Phase 6: Integration & Testing

15. **Write integration tests**
    - Test full workflow: import tx → get suggestions → apply pattern
    - Test saving pattern → matching future transaction
    - Test income planning calculation
    - Validation: All integration tests pass

16. **Performance testing**
    - Test matching with 100+ saved patterns
    - Ensure suggestions API <500ms
    - Test fuzzy matching performance
    - Validation: Performance benchmarks pass

17. **Update transaction import flow**
    - After importing transactions, auto-check for matches
    - Auto-apply HIGH confidence (>70%) matches
    - Store MEDIUM confidence (50-70%) for user review
    - Validation: Import flow applies matches correctly

## Phase 7: Frontend Integration (Optional for MVP)

18. **Update TypeScript types**
    - Add `MatchScore`, `MatchSuggestion`, `PlanningReport` interfaces
    - Update API client types
    - Validation: Frontend compiles

19. **Create MatchSuggestions component**
    - Show match suggestions for uncategorized transactions
    - Display match score visualization
    - Allow user to apply/reject suggestions
    - Validation: Component renders with mock data

20. **Add "Save as Pattern" button**
    - Add button to transaction detail view
    - Call save-as-pattern API
    - Show confirmation
    - Validation: Button creates pattern

21. **Create IncomePlanningAlert component**
    - Fetch income planning report
    - Show warning if threshold exceeded
    - Display unallocated amount and percentage
    - Validation: Alert shows when threshold exceeded

## Phase 8: Polish & Documentation

22. **Manual testing**
    - Test match suggestions with real transaction data
    - Test income planning warnings
    - Test save pattern workflow
    - Validation: All manual test cases pass

23. **Update API documentation**
    - Document new endpoints
    - Add request/response examples
    - Document match score calculation
    - Validation: Documentation reviewed

## Dependencies & Parallelization

**Critical Path**:
- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

**Can be parallelized**:
- Phase 7 (Frontend) can start after Phase 2 (knowing API contracts)
- Tasks 2-6 (matching algorithm) can be developed independently
- Tasks 10-13 (handlers) can be parallelized

**Blocking dependencies**:
- Task 1 (migration) blocks Phase 2 (needs column)
- Tasks 2-6 (algorithm) block Phase 3 (service uses algorithm)
- Phase 5 (handlers) blocks Phase 6 (integration tests need endpoints)

## Success Criteria per Phase

**Phase 1**: ✅ is_saved_pattern column exists, migration applied
**Phase 2**: ✅ Match scoring algorithm returns accurate scores
**Phase 3**: ✅ Pattern service can save/retrieve/apply patterns
**Phase 4**: ✅ Income planning correctly calculates unallocated %
**Phase 5**: ✅ All API endpoints return 200/201 for happy paths
**Phase 6**: ✅ Integration tests pass, performance acceptable
**Phase 7**: ✅ Frontend can display and apply match suggestions
**Phase 8**: ✅ Manual testing complete, docs updated
