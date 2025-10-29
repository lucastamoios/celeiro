# Pattern Detection Examples

## A) Repeated Discoveries Across Specs

```
spec:add-auth → bd-50: Add rate limiting (discovered)
spec:add-payments → bd-89: Add rate limiting (discovered)
spec:add-exports → bd-134: Add rate limiting (discovered)

PATTERN: Rate limiting is consistently missing from planning
INSIGHT: Need cross-cutting concern spec for "API Rate Limiting Infrastructure"
```

## B) Tech Debt Accumulation

```
bd-51: TODO: Refactor auth middleware (closed but marked tech-debt)
bd-52: TODO: Extract validation logic (closed but marked tech-debt)
bd-53: TODO: Add retry logic (closed but marked tech-debt)

PATTERN: 3 refactoring todos created in add-auth
INSIGHT: Original spec was too aggressive on timeline, created shortcuts
ACTION: Create "Auth System Refactor" spec to address properly
```

## C) Scope Creep Patterns

```
spec:add-auth had 8 planned tasks
Final execution: 14 issues (6 discovered during work)

PATTERN: Discovered 75% more work than planned
INSIGHT: Auth specs need better templates
ACTION: Create checklist for security features
```
