# Implementation Tasks: Transaction Matching System

These tasks are maintained as an OpenSpec-friendly checklist.

## 1. Core Implementation
- [x] Extend `planned_entries` with `is_saved_pattern` (migration + index)
- [x] Add matching models/constants (`MatchScore`, thresholds, weights)
- [x] Implement normalization + Levenshtein distance + fuzzy description scoring
- [x] Implement `CalculateMatchScore` and `FindMatches` with optimizations
- [x] Implement pattern APIs:
  - [x] `GET /financial/match-suggestions`
  - [x] `POST /financial/transactions/{id}/apply-pattern`
  - [x] `POST /financial/transactions/{id}/save-as-pattern`
- [x] Implement income planning endpoint:
  - [x] `GET /financial/income-planning`
- [x] Update OFX import to auto-apply HIGH confidence matches
- [x] Add integration + performance tests for matching

## 2. Remaining Work
- [ ] Manual testing with real transaction data
- [ ] Update API documentation for matching endpoints (request/response examples + score explanation)
