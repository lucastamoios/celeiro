# Beads Command Reference for Retrospective Analysis

## Data Gathering Commands

### Get all issues from a specific spec
```bash
bd list --labels spec:<change-name> --json
```

### Get discovered issues (gaps found during execution)
```bash
bd list --labels discovered --json
```

### Get tech debt accumulation
```bash
bd list --labels tech-debt --json
```

### Get blocked issues (friction points)
```bash
bd list --status blocked --json
```

### Get closed issues for analysis
```bash
bd list --status closed --json
```

### Get issues by priority
```bash
bd list --priority 0 --json  # Critical issues
bd list --priority 1 --json  # High priority
bd list --priority 2 --json  # Medium priority
```

### Get dependency information
```bash
bd dep tree <issue-id>  # Show full dependency tree
bd dep list <issue-id>  # List direct dependencies
```
