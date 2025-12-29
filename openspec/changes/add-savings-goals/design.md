## Context

Users want to track progress toward financial goals. This is distinct from expense tracking (categories) and budget management. The feature needs to support two different saving behaviors:

1. **Reserva (Reserve)**: Saving for a known future expense with a deadline
   - Example: "IPVA 2026" - R$1,500 due January 2026
   - User needs to know: "Am I saving enough each month to reach the target?"

2. **Investimento (Investment)**: Building long-term wealth without a specific deadline
   - Example: "Reserva de Emergência" - R$30,000 target
   - User needs to know: "How much have I accumulated? What's my progress?"

### Stakeholders
- End users tracking personal finances
- Celeiro development team

### Constraints
- Must integrate with existing transaction and planned entry systems
- Cannot break existing budget/category functionality
- Single-user/organization model (current architecture)

## Goals / Non-Goals

### Goals
- Allow users to create savings goals with names, target amounts, and optional due dates
- Track contributions to each goal via transaction linking
- Calculate monthly targets for time-bound goals (Reserva type)
- Integrate with planned entries for automatic transaction-to-goal linking
- Provide clear progress visualization

### Non-Goals
- Investment portfolio tracking (stocks, funds, crypto)
- Interest/returns calculation
- External account synchronization
- Multi-currency goals

## Decisions

### Decision 1: Goal Types
**What**: Two explicit types - "reserva" and "investimento"
**Why**: Different UX needs - reservas need monthly targets and deadline tracking; investimentos focus on total progress
**Alternatives**:
- Single type with optional due date: Simpler schema, but loses semantic meaning
- More types (emergency, vacation, etc.): Over-engineering for current needs

### Decision 2: Transaction Relationship
**What**: Optional `savings_goal_id` FK on transactions, orthogonal to `category_id`
**Why**: A transfer to savings account is both "Transferência" (category) and contributing to "Emergency Fund" (goal)
**Alternatives**:
- Replace category with goal: Would break existing categorization logic
- Separate linking table: Over-engineering for 1:1 relationship

### Decision 3: Monthly Target Calculation
**What**: For "reserva" type, calculate `monthly_target = (target_amount - current_saved) / months_remaining`
**Why**: Gives users actionable guidance on how much to save each month
**Alternatives**:
- Fixed monthly target set by user: Less adaptive to changes
- No monthly target: User must manually calculate

### Decision 4: Planned Entry Integration
**What**: Planned entries can reference a `savings_goal_id`. When a transaction matches, it inherits the goal.
**Why**: Automates the common pattern of regular savings contributions
**Alternatives**:
- Manual linking only: More friction for recurring savings
- Auto-suggest without linking: Good middle ground but more complex UI

## Database Schema

```sql
CREATE TABLE savings_goals (
    savings_goal_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),

    name VARCHAR(100) NOT NULL,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('reserva', 'investimento')),
    target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
    due_date DATE,  -- Required for 'reserva', optional for 'investimento'

    icon VARCHAR(10),  -- Emoji icon
    color VARCHAR(7),  -- Hex color

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,

    notes TEXT,

    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id)
);

-- Add FK to transactions
ALTER TABLE transactions
ADD COLUMN savings_goal_id INT REFERENCES savings_goals(savings_goal_id) ON DELETE SET NULL;

-- Add FK to planned_entries
ALTER TABLE planned_entries
ADD COLUMN savings_goal_id INT REFERENCES savings_goals(savings_goal_id) ON DELETE SET NULL;
```

## API Design

### Endpoints

```
GET    /financial/savings-goals              # List all goals
POST   /financial/savings-goals              # Create goal
GET    /financial/savings-goals/:id          # Get goal with progress
PUT    /financial/savings-goals/:id          # Update goal
DELETE /financial/savings-goals/:id          # Delete goal (soft delete via is_active)

GET    /financial/savings-goals/:id/contributions  # Get transactions linked to goal
GET    /financial/savings-goals/:id/progress       # Get detailed progress (monthly breakdown)
```

### Progress Response

```json
{
  "goal": { ... },
  "current_amount": 3500.00,
  "target_amount": 10000.00,
  "progress_percent": 35.0,
  "monthly_target": 541.67,  // For reserva type
  "months_remaining": 12,    // For reserva type
  "is_on_track": true,       // current_amount >= expected_by_now
  "monthly_contributions": [
    { "month": 1, "year": 2025, "amount": 500.00 },
    { "month": 2, "year": 2025, "amount": 750.00 }
  ]
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users might confuse goals with categories | Clear UI labeling, onboarding tips |
| Monthly target calculation edge cases (past due dates) | Handle gracefully, show warning |
| Performance with many transactions per goal | Index on savings_goal_id |
| Goal completion without spending (investimento) | Add manual "mark as complete" option |

## Migration Plan

1. Create `savings_goals` table (non-breaking)
2. Add `savings_goal_id` column to `transactions` (nullable, non-breaking)
3. Add `savings_goal_id` column to `planned_entries` (nullable, non-breaking)
4. Deploy backend endpoints
5. Deploy frontend UI
6. No data migration needed (new feature)

### Rollback
- Remove frontend UI
- Remove backend endpoints
- Drop columns and table (no data loss since it's a new feature)

## Resolved Questions

1. **Should we allow transferring money between goals?** → **Yes**
   - Users can reassign a transaction from one goal to another
   - Useful when priorities change or goals are consolidated

2. **Should we show goal contributions in monthly budget view?** → **Yes**
   - Goal contributions appear as a separate section in the budget view
   - Helps users see total savings alongside expenses

3. **Should completed goals be archived or just marked as complete?** → **Marked as complete**
   - Completed goals remain visible with `is_completed = true`
   - Users can filter to show/hide completed goals
   - No separate archive mechanism needed
