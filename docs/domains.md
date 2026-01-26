# Domain Guide

## Domain Overview

```mermaid
flowchart TD
    subgraph accounts["Accounts Domain"]
        User
        Organization
        Session
        Invite
    end

    subgraph financial["Financial Domain"]
        Account
        Transaction
        Category
        CategoryBudget
         PlannedEntry
         PlannedEntryStatus
         PlannedEntryTag
         Pattern
         SavingsGoal
         Tag

    end

    User --> Organization
    Organization --> Account
    Account --> Transaction
    Category --> Transaction
    Category --> CategoryBudget
    Category --> PlannedEntry
     PlannedEntry --> PlannedEntryStatus
     PlannedEntry --> PlannedEntryTag
     PlannedEntryTag --> Tag
     Pattern --> Category
     SavingsGoal --> Transaction
     SavingsGoal --> PlannedEntry
     Tag --> Transaction
```

## Accounts Domain

**Location**: `backend/internal/application/accounts/`

| Entity | Purpose |
|--------|---------|
| User | Authenticated user with email, optional password |
| Organization | Multi-tenant container |
| Session | Redis-backed authentication token |
| OrganizationInvite | Pending member invitation |
| SystemInvite | System-wide admin invitation |

### Key Operations

| Operation | Description |
|-----------|-------------|
| RequestMagicCode | Sends 4-digit code via email |
| Authenticate | Validates code/password/Google, creates user if new |
| GetByID | Returns user with org memberships |
| InviteMember | Creates org invitation |
| AcceptInvite | Joins organization |

## Financial Domain

**Location**: `backend/internal/application/financial/`

### Category

Transaction classifier with visual identity.

| Field | Purpose |
|-------|---------|
| name | Display name |
| icon | Emoji icon |
| color | Hex color code |
| category_type | expense or income |
| is_system | System-provided vs user-created |
| is_controllable | Whether category shows pacing widgets (see `docs/budget-pacing.md`) |

### Account

Bank account container for transactions.

| Field | Purpose |
|-------|---------|
| account_type | checking, savings, credit_card, investment |
| bank_name | Institution name |
| balance | Current balance |

### Transaction

Individual financial transaction.

| Field | Purpose |
|-------|---------|
| description | User-editable description |
| original_description | Immutable OFX value (for pattern matching) |
| amount | Transaction amount |
| category_id | Optional classification |
| savings_goal_id | Optional savings goal contribution |
| is_classified | Has been categorized |
| is_ignored | Soft delete flag |
| ofx_fitid | OFX unique identifier |

### CategoryBudget

Monthly budget for a specific category.

| Field | Purpose |
|-------|---------|
| category_id | Target category |
| month / year | Budget period |
| budget_type | fixed, calculated, or maior |
| planned_amount | Budget amount (for fixed type) |

**Budget Type Calculation**:
- fixed: Uses planned_amount directly
- calculated: Sum of planned entries
- maior: MAX(planned_amount, sum of entries)

### PlannedEntry

Expected expense or income ("Entrada Planejada").

| Field | Purpose |
|-------|---------|
| description | Expected description |
| amount_min / amount_max | Expected amount range |
| expected_day_start / end | Day range (1-31) |
| is_recurrent | Repeats monthly |
| entry_type | expense or income |
| category_id | Target category |
| savings_goal_id | Optional linked goal |

### PlannedEntryStatus

Monthly tracking for planned entries.

| Field | Purpose |
|-------|---------|
| planned_entry_id | Parent entry |
| month / year | Period |
| status | pending, matched, dismissed, missing |
| matched_transaction_id | Linked transaction when matched |
| matched_amount | Amount at time of match |
| matched_at | Timestamp of match |
| dismissed_at | Timestamp of dismissal |
| dismissal_reason | Optional reason for dismissal |

**Important**: When changing status back to `pending` (unmatch or reactivate), the related fields must be explicitly cleared. See "Clearing Status Fields" in conventions.md.

### Pattern

Regex-based automatic categorization rule.

| Field | Purpose |
|-------|---------|
| description_pattern | Regex to match original_description |
| weekday_pattern | Regex for day of week (0-6) |
| amount_min / amount_max | Amount range filter |
| target_category_id | Category to assign |
| target_description | Description to set |

### SavingsGoal

Long-term savings target ("Reserva" or "Investimento").

| Field | Purpose |
|-------|---------|
| name | Goal name |
| target_amount | Target to save |
| current_amount | Current progress |
| goal_type | reserva (short-term) or investimento (long-term) |
| status | active, completed, cancelled |

### PlannedEntryTag

Junction entity linking planned entries to tags.

| Field | Purpose |
|-------|---------|
| planned_entry_id | Planned entry |
| tag_id | Tag |

### Tag

User-defined transaction label.

| Field | Purpose |
|-------|---------|
| name | Tag name |
| color | Hex color code |

## Transaction Categorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant TX as Transaction
    participant AP as Pattern
    participant PE as PlannedEntry
    participant CAT as Category

    U->>TX: Import OFX
    TX->>AP: Check patterns
    alt Pattern matches
        AP->>CAT: Auto-assign category
        AP->>TX: Set target_description
    else No match
        TX->>TX: Stays uncategorized
    end

    U->>TX: View uncategorized
    TX->>PE: Get planned entry suggestions
    PE-->>U: Show matches by description/amount
    U->>TX: Link to planned entry
    TX->>CAT: Assign category from entry
```

## Planned Entry Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Month starts
    Pending --> Matched: Transaction linked
    Pending --> Dismissed: User dismisses
    Pending --> Missing: Month ends unmatched
    Matched --> Pending: Unmatch
    Dismissed --> Pending: Reactivate
    Matched --> [*]
    Dismissed --> [*]
    Missing --> [*]
```

**Reverse Transitions**:
- **Unmatch**: Clears `matched_transaction_id`, `matched_amount`, `matched_at`
- **Reactivate**: Clears `dismissed_at`, `dismissal_reason`

### Matching Side Effects

When a transaction is matched to a planned entry:

```mermaid
sequenceDiagram
    participant U as User
    participant S as Service
    participant PE as PlannedEntry
    participant TX as Transaction

    U->>S: Match(transaction_id, planned_entry_id)
    S->>PE: Update status → matched
    S->>PE: Adjust amount from TX
    Note over PE: Exact: replace amount<br/>Range: expand if outside
    S->>TX: Copy description from PE
    S->>TX: Copy category_id from PE
    S-->>U: Success
```

**Amount adjustment**: Planned entries "learn" from actual transactions. If a bill varies monthly, the entry amount updates to reflect reality.

## Tables by Domain

### Accounts Domain
- users, organizations, user_organizations
- roles, permissions, role_permissions
- organization_invites, system_invites

### Financial Domain
- accounts, transactions, transaction_tags
- categories, tags
- budgets, budget_items (legacy)
- category_budgets, monthly_snapshots
- planned_entries, planned_entry_statuses, planned_entry_tags
- patterns
- savings_goals
