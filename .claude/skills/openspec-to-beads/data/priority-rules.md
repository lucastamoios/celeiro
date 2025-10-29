# Priority Assignment Rules

## Priority Logic (CRITICAL - don't just copy numbers)

### P0 - Infrastructure/Blockers
- Infrastructure/setup tasks
- Tasks with "migration", "schema", "config"
- Database setup or changes
- Environment configuration
- Dependency installation

**Examples:**
- "Setup PostgreSQL users table" → p0
- "Create database migration" → p0
- "Configure Redis connection" → p0

### P1 - Core Work
- Core business logic
- Implementation tasks
- Tasks with "test", "document" (quality is NOT optional)
- Tasks you suspect will balloon (resource-intensive = important)
- API endpoint implementation
- Service layer logic

**Examples:**
- "Implement JWT validation" → p1
- "Add transaction import API" → p1
- "Write integration tests" → p1
- "Document API endpoints" → p1

### P2 - Polish/Nice-to-haves
- UI polish
- Nice-to-have features
- Optional enhancements
- Non-critical documentation

**Examples:**
- "Add loading animation" → p2
- "Improve error messages" → p2
- "Add tooltip explanations" → p2

## Type Detection Rules

### `task` Type
- Contains: "setup", "configure", "install"
- Contains: "refactor", "improve", "optimize"
- Contains: "test", "validate"
- Administrative or supporting work

### `feature` Type
- Contains: "implement", "add", "create"
- New functionality
- New capabilities

### `chore` Type
- Contains: "document", "update docs"
- Contains: "cleanup", "remove deprecated"
- Maintenance work

### `epic` Type
- Parent container for multiple related tasks
- Represents entire OpenSpec change

## Complexity Labels

### `complexity:low`
- "setup", "config", "simple"
- Straightforward tasks
- Well-defined with clear steps

### `complexity:medium`
- "implement", "add", "integrate"
- Standard development work
- Requires design decisions

### `complexity:high`
- "refactor", "migrate", "redesign"
- Architectural changes
- Cross-cutting concerns
- High risk or uncertainty

## Time-Based Priority Adjustment

### Increase priority by 1 if task mentions:
- "urgent"
- "critical"
- "blocking"
- "security"

### Decrease priority by 1 if task mentions:
- "nice-to-have"
- "future"
- "optional"
- "enhancement"
