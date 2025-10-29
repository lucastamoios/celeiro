# Smart Dependency Patterns

## Automatic Dependency Detection

### Pattern 1: Sequential within Category
**Rule:** Task X.2 ALWAYS blocks on X.1 by convention

```
Task 1.1: Setup database schema
Task 1.2: Create repository layer
Task 1.3: Add service layer

Dependencies:
1.2 blocks on 1.1
1.3 blocks on 1.2
```

### Pattern 2: Database → API
**Rule:** API/business logic blocks on database/migrations

```
Task 1.1: Create users table migration
Task 2.1: Add user registration endpoint

Dependencies:
2.1 blocks on 1.1
```

### Pattern 3: Config → Implementation
**Rule:** Configuration/setup blocks implementation

```
Task 1.1: Configure JWT secret in env
Task 2.1: Implement JWT generation

Dependencies:
2.1 blocks on 1.1
```

### Pattern 4: Implementation → Tests
**Rule:** Tests are RELATED to features (NOT blocking - parallel work)

```
Task 2.1: Implement user registration
Task 3.1: Write registration tests

Dependencies:
3.1 related-to 2.1 (NOT blocks)
```

### Pattern 5: Core → Polish
**Rule:** Extra features block on core functionality

```
Task 2.1: Basic transaction import
Task 4.1: Add import progress indicator

Dependencies:
4.1 blocks on 2.1
```

## Dependency Types

### `blocks`
Use when a task CANNOT start until another completes.

**Examples:**
- Database migration blocks on schema design
- API endpoint blocks on database table
- Service method blocks on repository method

### `related`
Use when tasks share context but can work in parallel.

**Examples:**
- Tests related to implementation
- Documentation related to feature
- Similar features in different domains

### `parent-child`
Use to link tasks to their epic container.

**Examples:**
- All spec tasks link to spec epic
- Sub-tasks link to parent task

### `discovered-from`
Use to track where gap was found.

**Examples:**
- Discovered security issue from original auth task
- Discovered monitoring gap from original feature

## Common Gap Detection Patterns

### Missing Rollback
```
If task involves "migration" but no rollback task exists:
→ Create: "[<change>] Add rollback migration"
→ Link: discovered-from original migration task
```

### Missing Rate Limiting
```
If task involves "API endpoint" but no rate limiting:
→ Create: "[<change>] Add rate limiting"
→ Link: discovered-from original API task
```

### Missing Error Handling
```
If task involves "external service" but no error handling:
→ Create: "[<change>] Add circuit breaker/retry logic"
→ Link: discovered-from original integration task
```

### Missing Monitoring
```
If task is "feature" but no monitoring:
→ Create: "[<change>] Add metrics/logging"
→ Link: discovered-from original feature task
```

### Missing Tests
```
If implementation task but no test task:
→ Create: "[<change>] Write tests for <feature>"
→ Link: related-to implementation task
```
