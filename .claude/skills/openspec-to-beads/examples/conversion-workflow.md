# OpenSpec to Beads Conversion Examples

## Example 1: Feature Implementation - Add Authentication

### User Request
```
User: "Let's implement add-auth"
```

### Conversion Analysis
```
⚠️  Conversion Analysis for 'add-auth':

Issues detected:
- Task 1.1 "Implement JWT system" is too broad (suggest: split into generate/validate/refresh)
- No testing tasks found (recommend: add integration tests section)
- Task 2.3 "Setup Redis" has no fallback plan (risk: production blocker)

Proceed with conversion? I can:
a) Convert as-is and create discovery issues for gaps
b) Wait for you to refine tasks.md first
c) Auto-create additional tasks for missing work
```

### Successful Conversion Output
```
✅ Converted 'add-auth' → 8 Beads issues (bd-42 to bd-49)

📊 Breakdown:
- 3 infrastructure tasks (p0) - MUST complete first
- 4 implementation tasks (p1) - Core work
- 1 documentation task (p1)

🔍 Proactive discoveries (auto-created):
- bd-50: Add JWT refresh token rotation (security best practice)
- bd-51: Add auth metrics to monitoring (observability gap)

🚦 Ready to start:
bd-42: Setup PostgreSQL users table (no blockers)

📝 Dependency chains:
bd-42 → bd-43 → bd-44 (sequential setup)
bd-45, bd-46 (parallel implementation after setup)

🎬 Next steps:
1. Review: `bd dep tree bd-42` (visualize full chain)
2. Start: `bd ready` (shows bd-42)
3. Track: `bd list --labels spec:add-auth`

⚠️  When complete, run:
`openspec archive add-auth` (finalizes spec as source of truth)
```

## Example 2: Bug Fix Spec

### User Request
```
User: "implement the duplicate-transaction-fix spec"
```

### Context Gathering (Silent)
```bash
openspec show duplicate-transaction-fix
bd list --json
```

### Conversion with Gap Detection
```
✅ Converted 'duplicate-transaction-fix' → 4 Beads issues (bd-120 to bd-123)

📊 Breakdown:
- 1 bug reproduction test (p0)
- 1 database constraint fix (p0)
- 1 API logic update (p1)
- 1 migration rollback plan (p1)

🔍 Proactive discoveries:
- bd-124: Add unique constraint to other transaction tables (consistency)
- bd-125: Add duplicate detection logging (monitoring)

🚦 Ready to start:
bd-120: Write failing test for duplicate FITID
```
