# Savings Goals Screen

**File:** `frontend/src/components/SavingsGoalsPage.tsx`

## Purpose

Track long-term savings goals with contributions, progress visualization, and completion management.

## What the User Sees

### Header

- Title: "Metas de Poupança" with target icon
- Subtitle: "Acompanhe suas metas de economia e investimento"
- "+ Nova Meta" button

### Summary Cards

Three cards (only shown if goals exist):
- **Total das Metas**: Sum of all target amounts
- **Total Acumulado**: Sum of current amounts (green)
- **Progresso Geral**: Overall percentage with progress bar

### Filters

- **Tipo dropdown**: Todos, Reserva, Investimento
- **Checkbox**: "Mostrar concluídos"

### Goals Grid

Grid of `SavingsGoalCard` components showing:
- Goal icon and name
- Type badge (Reserva / Investimento)
- Progress bar with custom color
- Current amount / Target amount
- Remaining amount
- Due date (if set)
- Dropdown actions menu

### Empty State

When no goals match filters:
- Target icon placeholder
- "Nenhuma meta encontrada"
- "Criar Meta" button

## Goal Types

| Type | Label | Description |
|------|-------|-------------|
| `reserva` | Reserva | Date-bound goals (due date required) |
| `investimento` | Investimento | Open-ended savings (due date optional) |

## Data Sources

| Data | API Function |
|------|--------------|
| Goals list | `listSavingsGoals()` |
| Goal progress | `getSavingsGoalProgress()` |
| Create | `createSavingsGoal()` |
| Update | `updateSavingsGoal()` |
| Delete | `deleteSavingsGoal()` |
| Complete | `completeSavingsGoal()` |
| Reopen | `reopenSavingsGoal()` |
| Contribute | `addContribution()` |

## Business Rules

### Goal Creation

Required fields:
- Name
- Goal type
- Target amount (> 0)
- Due date (required for `reserva`, optional for `investimento`)

### Progress Calculation

- `current_amount`: Sum of all contributions
- `progress`: `(current_amount / target_amount) * 100`
- Overall progress: Sum of all current / Sum of all targets

### Contributions

- Can be positive (deposit) or negative (withdrawal)
- No minimum/maximum validation
- Updates `current_amount` on goal

### Completion

- User manually marks as complete
- Completed goals hidden by default (toggle filter)
- Can reopen completed goals

## Click Behaviors

| Element | Action |
|---------|--------|
| "+ Nova Meta" | Opens create form modal |
| Goal card actions → Edit | Opens edit form modal |
| Goal card actions → Delete | Confirm dialog → `deleteSavingsGoal()` |
| Goal card actions → Complete | Confirm dialog → `completeSavingsGoal()` |
| Goal card actions → Reopen | `reopenSavingsGoal()` |
| Goal card actions → Add contribution | Opens contribution modal |

## Modals

### Create/Edit Goal Modal

Form fields:
- **Nome da Meta** (required)
- **Tipo de Meta** (only for create): radio cards with descriptions
- **Valor da Meta** (required): R$ input
- **Data Limite**: date picker (required for reserva)
- **Ícone**: 20+ emoji options
- **Cor da Barra de Progresso**: 12 color swatches
- **Observações**: textarea

### Contribution Modal

Simple form:
- Goal name display
- Amount input (positive or negative)
- Hint: "Use valores positivos para adicionar ou negativos para subtrair"

## Visual Customization

### Icons (GOAL_ICONS)

Available emojis: 🎯 💰 🏠 🚗 ✈️ 📚 💻 🎓 💍 👶 🏖️ 🎸 📱 🏋️ 🎨 🌱 ⭐ 🔒 💎 🎁

### Colors (GOAL_COLORS)

12 hex colors for progress bar customization.

## Links to Other Features

- **Planned Entries**: Goals can be linked to planned entries (see [budgets.md](./budgets.md))
- **Dashboard**: Goal progress could be shown (not currently implemented)
