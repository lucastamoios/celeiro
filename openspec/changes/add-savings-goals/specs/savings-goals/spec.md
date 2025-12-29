## ADDED Requirements

### Requirement: Savings Goal Management
The system SHALL allow users to create, view, update, and delete savings goals.

A savings goal MUST have:
- A unique name within the user's organization
- A goal type: "reserva" (for planned future expenses) or "investimento" (for long-term savings)
- A target amount greater than zero
- An icon (emoji) and color for visual identification

A savings goal MAY have:
- A due date (required for "reserva" type, optional for "investimento")
- Notes/description

#### Scenario: Create reserva goal with due date
- **GIVEN** user is authenticated
- **WHEN** user creates a goal with type "reserva", name "IPVA 2026", target R$1,500, due date "2026-01-15"
- **THEN** the goal is created successfully
- **AND** the system calculates monthly target based on due date

#### Scenario: Create investimento goal without due date
- **GIVEN** user is authenticated
- **WHEN** user creates a goal with type "investimento", name "Reserva de Emergência", target R$30,000
- **THEN** the goal is created successfully without due date requirement

#### Scenario: Reserva goal requires due date
- **GIVEN** user is authenticated
- **WHEN** user attempts to create a goal with type "reserva" without a due date
- **THEN** the system returns a validation error

#### Scenario: Delete goal unlinks transactions
- **GIVEN** user has a goal with linked transactions
- **WHEN** user deletes the goal
- **THEN** the goal is deactivated (soft delete)
- **AND** linked transactions retain their data but savings_goal_id is set to NULL

---

### Requirement: Transaction Goal Linking
The system SHALL allow transactions to be linked to a savings goal independently of category assignment.

A transaction MAY be linked to at most one savings goal.
A transaction MAY have both a category and a savings goal simultaneously.

#### Scenario: Link transaction to goal
- **GIVEN** user has a transaction and a savings goal
- **WHEN** user sets the transaction's savings goal to the goal
- **THEN** the transaction is linked to the goal
- **AND** the goal's progress is updated to include this transaction amount

#### Scenario: Transaction has both category and goal
- **GIVEN** user has a transaction categorized as "Transferência"
- **WHEN** user links the transaction to goal "Reserva de Emergência"
- **THEN** the transaction retains its category "Transferência"
- **AND** the transaction is linked to the savings goal

#### Scenario: Unlink transaction from goal
- **GIVEN** user has a transaction linked to a goal
- **WHEN** user removes the goal link
- **THEN** the transaction's savings_goal_id is set to NULL
- **AND** the goal's progress is recalculated

---

### Requirement: Planned Entry Goal Linking
The system SHALL allow planned entries to be linked to a savings goal.

When a transaction matches a planned entry that has a savings goal, the transaction SHALL automatically inherit the goal.

#### Scenario: Create planned entry with goal
- **GIVEN** user has a savings goal "Investimento Mensal"
- **WHEN** user creates a planned entry for R$500/month linked to that goal
- **THEN** the planned entry stores the savings_goal_id

#### Scenario: Matched transaction inherits goal
- **GIVEN** user has a planned entry linked to goal "Investimento Mensal"
- **WHEN** a transaction matches the planned entry
- **THEN** the transaction is automatically linked to "Investimento Mensal"

---

### Requirement: Goal Progress Tracking
The system SHALL calculate and display progress toward each savings goal.

For all goal types, the system MUST track:
- Current amount (sum of linked transaction amounts)
- Progress percentage (current / target * 100)
- List of contributing transactions

For "reserva" type goals, the system MUST additionally calculate:
- Months remaining until due date
- Monthly target amount needed to reach goal on time
- On-track status (whether current savings meet expected progress)

#### Scenario: Calculate progress percentage
- **GIVEN** a goal with target R$10,000
- **AND** linked transactions totaling R$3,500
- **WHEN** user views the goal
- **THEN** progress shows 35%

#### Scenario: Calculate monthly target for reserva
- **GIVEN** a reserva goal with target R$6,000, due in 6 months
- **AND** current savings of R$1,200
- **WHEN** user views the goal
- **THEN** monthly target shows R$800 ((6000 - 1200) / 6)

#### Scenario: Show on-track status
- **GIVEN** a reserva goal with target R$6,000, due in 6 months
- **AND** we are 2 months into the period (expected R$2,000 saved)
- **AND** actual savings of R$2,500
- **WHEN** user views the goal
- **THEN** status shows "on track" (ahead of schedule)

#### Scenario: Show behind schedule warning
- **GIVEN** a reserva goal with target R$6,000, due in 6 months
- **AND** we are 2 months into the period (expected R$2,000 saved)
- **AND** actual savings of R$800
- **WHEN** user views the goal
- **THEN** status shows "behind schedule" warning

---

### Requirement: Goal Completion
The system SHALL track goal completion status.

A goal can be marked as completed manually by the user or automatically when progress reaches 100%.

#### Scenario: Auto-complete on reaching target
- **GIVEN** a goal with target R$5,000 and current R$4,800
- **WHEN** a R$300 transaction is linked to the goal
- **THEN** the goal is marked as completed automatically
- **AND** completed_at timestamp is set

#### Scenario: Manual completion
- **GIVEN** a goal with current amount below target
- **WHEN** user manually marks the goal as complete
- **THEN** the goal is marked as completed
- **AND** completed_at timestamp is set

#### Scenario: Reopen completed goal
- **GIVEN** a completed goal
- **WHEN** user reopens the goal
- **THEN** is_completed is set to false
- **AND** completed_at is cleared

#### Scenario: Filter completed goals
- **GIVEN** user has 3 active goals and 2 completed goals
- **WHEN** user views goals with "show completed" filter enabled
- **THEN** all 5 goals are displayed
- **AND** completed goals are visually distinguished

#### Scenario: Hide completed goals by default
- **GIVEN** user has active and completed goals
- **WHEN** user views goals list without filters
- **THEN** only active (non-completed) goals are shown

---

### Requirement: Goal Transfer
The system SHALL allow users to transfer a transaction from one goal to another.

Transferring a transaction updates both goals' progress calculations.

#### Scenario: Transfer transaction between goals
- **GIVEN** user has transaction T linked to goal A
- **AND** user has goal B
- **WHEN** user transfers transaction T from goal A to goal B
- **THEN** transaction T's savings_goal_id changes to goal B
- **AND** goal A's progress is recalculated (decreased)
- **AND** goal B's progress is recalculated (increased)

#### Scenario: Bulk transfer transactions
- **GIVEN** user has multiple transactions linked to goal A
- **WHEN** user selects multiple transactions and transfers to goal B
- **THEN** all selected transactions are reassigned to goal B
- **AND** both goals' progress is recalculated

---

### Requirement: Budget View Integration
The system SHALL display goal contributions in the monthly budget view.

Goal contributions MUST appear as a separate section showing:
- Total amount contributed to goals in the month
- Breakdown by individual goal
- Comparison with planned savings (from planned entries linked to goals)

#### Scenario: Show goal contributions in budget
- **GIVEN** user contributed R$500 to "Emergency Fund" and R$300 to "Vacation" in January
- **WHEN** user views the January budget
- **THEN** a "Savings Goals" section shows total R$800
- **AND** breakdown shows each goal's contribution

#### Scenario: Show planned vs actual savings
- **GIVEN** user has planned entry "Save R$500/month" linked to goal "Emergency Fund"
- **AND** actual contributions in the month total R$400
- **WHEN** user views the monthly budget
- **THEN** goal section shows "Emergency Fund: R$400 / R$500 planned"
- **AND** indicates underfunding status
