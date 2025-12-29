## Why

Users need to track savings toward specific goals, separate from expense categorization. Currently, there's no way to answer "How much have I saved for my vacation?" or "Am I on track to pay my IPVA next January?"

Two distinct use cases exist:
1. **Reserva (Reserve)**: Money set aside for known future expenses (taxes, planned purchases, annual insurance)
2. **Investimento (Investment)**: Long-term wealth building (emergency fund, retirement, investment accounts)

## What Changes

- **NEW**: `savings_goals` table to store goals with type, target amount, and optional due date
- **NEW**: Transaction can optionally reference a savings goal (orthogonal to category)
- **NEW**: Planned entry can optionally reference a savings goal (auto-links matched transactions)
- **NEW**: API endpoints for CRUD operations on savings goals
- **NEW**: API endpoint to get goal progress (total contributions, monthly breakdown)
- **NEW**: Frontend UI to create/manage savings goals
- **NEW**: Frontend UI to link transactions to goals
- **NEW**: Dashboard widget showing goal progress

## Impact

- Affected specs: `savings-goals` (new capability)
- Affected code:
  - Backend: New `savings_goals` table, repository, service, handler
  - Backend: Modify `transactions` table (add `savings_goal_id` FK)
  - Backend: Modify `planned_entries` table (add `savings_goal_id` FK)
  - Frontend: New components for goal management
  - Frontend: Modify transaction edit modal to include goal selection

## Key Design Decisions

1. **Two goal types**: "reserva" for short-term planned spending, "investimento" for long-term savings
2. **Orthogonal to categories**: A transaction can have both a category AND a savings goal
3. **Monthly targets for Reserva**: System calculates required monthly contribution based on target and due date
4. **Auto-linking via planned entries**: When a planned entry with a goal matches a transaction, the goal is auto-assigned
