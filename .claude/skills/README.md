# Claude Code Skills

This directory contains custom skills for Claude Code to help with the OpenSpec + Beads workflow and Test-Driven Development practices.

## 📁 Skills Organization

Each skill follows this structure:

```
skill-name/
├── SKILL.md           # Main skill definition (frontmatter + logic)
├── examples/          # Real-world usage examples
├── templates/         # Code and command templates
└── data/              # Reference data, rules, guidelines
```

## 🎯 Available Skills

### 1. **beads-retrospective**
Analyzes completed Beads issues to identify patterns, tech debt, and gaps. Suggests new OpenSpec proposals based on discovered work.

**Structure:**
- `SKILL.md` - Core retrospective analysis logic (89 lines)
- `examples/pattern-detection.md` - Real pattern examples
- `templates/report-output.md` - Report format template
- `data/bd-commands.md` - Beads command reference

**Use when:**
- Closing final issue in a spec
- User asks "what's next?" or "what should we prioritize?"
- User says "analyze my beads issues"

### 2. **openspec-to-beads**
Converts approved OpenSpec specifications into trackable Beads issues with smart prioritization, dependency detection, and gap discovery.

**Structure:**
- `SKILL.md` - Conversion workflow logic (175 lines)
- `examples/conversion-workflow.md` - Complete conversion scenarios
- `templates/issue-creation.md` - Beads command templates
- `data/priority-rules.md` - Smart priority assignment rules
- `data/dependency-patterns.md` - Dependency detection patterns

**Use when:**
- User runs `openspec apply <change>`
- User says "implement this spec" or "start working on X"
- User explicitly asks to convert spec to issues

### 3. **tdd**
Enforces Test-Driven Development practices with RED-GREEN-REFACTOR cycle guidance for Go backend development.

**Structure:**
- `SKILL.md` - TDD workflow and rules (254 lines)
- `examples/feature-implementation.md` - Feature and bug fix examples
- `examples/dialogue-examples.md` - How to interact with users
- `templates/test-structure.md` - Test patterns and mock templates
- `data/naming-conventions.md` - Test naming guidelines
- `data/coverage-guidelines.md` - What to test and skip

**Use when:**
- Implementing new features
- Adding new methods to services/repositories
- Fixing bugs
- Refactoring existing code

## 📊 File Size Comparison

### Before Reorganization
- **beads-retrospective**: 118 lines (monolithic)
- **openspec-to-beads**: 551 lines (monolithic)
- **tdd**: 494 lines (monolithic)
- **Total**: 1,163 lines in 3 files

### After Reorganization
- **SKILL.md files**: 518 lines (core logic only)
- **Supporting files**: 15 files organized by purpose
- **Total**: More maintainable, reusable structure

## 🎨 Benefits of This Structure

1. **Maintainability**: Core logic separated from examples and data
2. **Reusability**: Templates and data can be referenced by multiple skills
3. **Clarity**: SKILL.md focuses on "what" and "when", supporting files show "how"
4. **Extensibility**: Easy to add new examples without touching core logic
5. **Discoverability**: Clear file organization makes content easy to find

## 🔄 How Skills Are Loaded

Claude Code automatically discovers skills from:
1. **Project Skills**: `.claude/skills/` (this directory)
2. **Personal Skills**: `~/.claude/skills/`
3. **Plugin Skills**: Bundled with installed plugins

Each skill must:
- Be in its own subdirectory
- Contain a file named exactly `SKILL.md` (uppercase)
- Have valid YAML frontmatter with `name` and `description`

## 📝 Skill Frontmatter Format

```yaml
---
name: skill-name-lowercase
description: Clear description of what it does and when to use it (max 1024 chars)
---
```

## 🚀 Using Skills

Skills activate automatically based on their description matching user requests. Claude will:
1. Read the SKILL.md for core logic
2. Reference examples/ for real-world patterns
3. Use templates/ for generating code/commands
4. Consult data/ for rules and guidelines

You can also explicitly invoke a skill using the Skill tool.

## 🔗 Integration with Workflow

```
┌─────────────┐
│  OpenSpec   │  Planning phase
│  (Proposal) │  What to build
└──────┬──────┘
       │
       │  openspec-to-beads skill
       ▼
┌─────────────┐
│    Beads    │  Execution phase
│   (Issues)  │  Trackable work
└──────┬──────┘
       │
       │  tdd skill (during implementation)
       ▼
┌─────────────┐
│    Code     │  Implementation
│  (Tested)   │  Working software
└──────┬──────┘
       │
       │  beads-retrospective skill
       ▼
┌─────────────┐
│  Insights   │  Learning phase
│ (Patterns)  │  Improve planning
└──────┬──────┘
       │
       └──────► Back to OpenSpec (new proposals)
```

## 📚 Additional Resources

- [Claude Code Skills Documentation](https://docs.claude.com/en/docs/claude-code/skills.md)
- [OpenSpec Documentation](../AGENTS.md)
- [Beads Issue Tracker](https://github.com/steveyegge/beads)
