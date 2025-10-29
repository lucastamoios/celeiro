# Issue Creation Templates

## Basic Issue Creation

```bash
bd create "[<change>] <category>: <task-description>" \
  --priority <smart-priority> \
  --type <smart-type> \
  --labels "spec:<change>,category:<category-slug>,complexity:<low|medium|high>" \
  --json
```

## Epic Issue Creation

```bash
bd create "🎯 [EPIC] <change-name>" \
  --type epic \
  --priority 0 \
  --labels "spec:<change>,epic,openspec" \
  --json
```

## Discovery Issue Creation

```bash
bd create "[<change>] DISCOVERED: <gap-description>" \
  --type task \
  --priority 1 \
  --labels "spec:<change>,discovered,proactive" \
  --json
```

## Dependency Creation

### Sequential dependencies within category
```bash
# Task 1.2 ALWAYS blocks on 1.1 by convention
bd dep add <bd-1.2> <bd-1.1> --type blocks
```

### Cross-category dependencies
```bash
# API endpoints block on database setup
bd dep add <api-task-id> <db-task-id> --type blocks

# Tests related to features (NOT blocking)
bd dep add <test-task-id> <feature-task-id> --type related
```

### Parent-child relationships
```bash
# Link task to epic
bd dep add <task-id> <epic-id> --type parent-child
```

### Discovery relationships
```bash
# Link discovered issue to parent
bd dep add <discovery-id> <parent-task-id> --type discovered-from
```
