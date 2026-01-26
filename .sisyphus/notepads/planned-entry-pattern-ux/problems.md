# Problems - Planned Entry Pattern UX

## Unresolved Blockers


## [2026-01-26] Task 2 Blocker: Agent Refusal/Failure

**Problem:** Task 2 (PatternCreator refactor) is blocked. Multiple delegation attempts failed:

1. **Attempt 1** (visual-engineering): Claimed success, made ZERO file changes
2. **Attempt 2** (visual-engineering, resumed session): Claimed success, made ZERO file changes  
3. **Attempt 3** (ultrabrain): Refused task as "multiple tasks"

**Root Cause:** Task 2 is too complex for a single atomic delegation. It involves:
- Adding 4 new props
- Creating 1 new helper function
- Updating 2 existing helper functions
- Modifying state initialization (3 useState calls)
- Adding conditional UI logic

**Impact:** Blocks Tasks 3 and 4 (both depend on refactored PatternCreator)

**Recovery Options:**

### Option A: Break Task 2 into Sub-tasks
Split into 5 atomic tasks:
1. Add new props to interface (no logic changes)
2. Add escapeRegex helper function
3. Update extractSimpleText() to handle (?i)
4. Update isAdvancedPattern() logic
5. Wire new props to state initialization

### Option B: Manual Implementation
Atlas reads the file, makes the changes directly using Edit tool, verifies manually.

### Option C: Simplify Requirements
Remove variant logic, focus only on prop additions and regex updates.

**Decision:** Proceeding with Option A (break into sub-tasks).

## [2026-01-26] Task 4 Partial Completion

**Status:** Menu item added to CategoryBudgetCard, but callback handler NOT added to CategoryBudgetDashboard.

**What's Done:**
- ✅ Menu item in CategoryBudgetCard with correct visibility condition
- ✅ Prop added to CategoryBudgetCardProps interface
- ✅ TypeScript compiles cleanly

**What's Missing:**
- ❌ `handleCreatePatternFromMatch` function in CategoryBudgetDashboard
- ❌ Prop wiring: `onCreatePatternFromMatch={handleCreatePatternFromMatch}`

**Impact:** Button appears but clicking it does nothing (no handler).

**To Complete:**
Add to CategoryBudgetDashboard.tsx (before return statement):
```typescript
const handleCreatePatternFromMatch = async (entry: PlannedEntryWithStatus, month: number, year: number) => {
  // Implementation as specified in plan Task 4
};
```

And wire it to CategoryBudgetCard component.
