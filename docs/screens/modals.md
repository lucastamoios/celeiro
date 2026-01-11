# Modal Components

Reusable modal components used across screens.

## Base Modal Component

**File:** `frontend/src/components/ui/Modal.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Controls visibility |
| `onClose` | function | Called on backdrop click or ESC |
| `title` | string | Header title |
| `subtitle` | string | Optional header subtitle |
| `headerGradient` | string | Color variant: sage, wheat, rust, terra |
| `size` | string | sm, md, lg, xl |
| `footer` | ReactNode | Footer content (buttons) |

### Subcomponents

- `Modal.CancelButton` - Secondary style cancel button
- `Modal.SubmitButton` - Primary style submit button with loading state
- `Modal.DangerButton` - Destructive action button

### Behaviors

- ESC key closes modal
- Backdrop click closes modal
- Prevents body scroll when open

---

## TransactionEditModal

**File:** `frontend/src/components/TransactionEditModal.tsx`

### Purpose

Edit existing transaction with full feature access.

### Fields

| Field | Type | Editable |
|-------|------|----------|
| Description | Text input | Yes |
| Category | Dropdown | Yes |
| Notes | Textarea | Yes |
| Is Ignored | Toggle | Yes |
| Planned Entry Link | Link modal | Yes |
| Tags | Tag selector | Yes |

### Actions

- **Save**: Updates transaction via PATCH
- **Create Pattern**: Opens AdvancedPatternCreator
- **Ignore/Restore**: Toggles `is_ignored`
- **Link/Unlink Planned Entry**: Opens TransactionPlannedEntryLinkModal

### Inline Category Creation

Can create new category directly in dropdown.

---

## TransactionCreateModal

**File:** `frontend/src/components/TransactionCreateModal.tsx`

### Purpose

Create new manual transaction.

### Fields

| Field | Required | Type |
|-------|----------|------|
| Description | Yes | Text input |
| Amount | Yes | Number input |
| Date | Yes | Date picker |
| Type | Yes | debit / credit toggle |
| Category | No | Dropdown |
| Notes | No | Textarea |

### API

`POST /financial/accounts/{accountId}/transactions`

---

## TransactionMatcherModal

**File:** `frontend/src/components/TransactionMatcherModal.tsx`

### Purpose

Select a transaction to match with a planned entry.

### Features

- Search by description
- Filter by category
- Shows only transactions from the specified month
- Currency-formatted amounts
- Click to select

### Props

| Prop | Description |
|------|-------------|
| `plannedEntry` | The entry to match |
| `transactions` | All available transactions |
| `month`, `year` | Filter to specific month |
| `onSelect` | Called with selected transaction ID |

---

## TransactionPlannedEntryLinkModal

**File:** `frontend/src/components/TransactionPlannedEntryLinkModal.tsx`

### Purpose

Link a transaction to a planned entry.

### Features

- Lists available planned entries
- Filter/search functionality
- Shows current link if exists
- Link/Unlink actions

---

## CategoryTransactionsModal

**File:** `frontend/src/components/CategoryTransactionsModal.tsx`

### Purpose

View all transactions and planned entries for a specific category in a month.

### Sections

1. **Header**: Category name with icon/color, actual vs planned
2. **Transactions List**: All transactions in category for month
3. **Planned Entries List**: All planned entries in category for month

### Click-Through

- Transaction row → Opens TransactionEditModal (nested)
- Planned entry row → Opens PlannedEntryForm modal (nested)

---

## PlannedEntryForm

**File:** `frontend/src/components/PlannedEntryForm.tsx`

### Purpose

Create or edit planned entries.

### Fields

| Field | Required | Type |
|-------|----------|------|
| Description | Yes | Text with autocomplete |
| Entry Type | Yes | expense / income toggle |
| Amount | Yes* | Single or range (min/max) |
| Expected Day | Yes* | Single or range (start/end) |
| Category | Yes | Dropdown |
| Is Recurrent | No | Checkbox |
| Savings Goal Link | No | Dropdown |

*Supports both single value and range modes.

### Autocomplete

Description field shows suggestions from past transaction descriptions.

### Range Mode

Toggle between:
- Single amount → Amount field
- Range → AmountMin, AmountMax fields

Toggle between:
- Single day → ExpectedDay field
- Range → ExpectedDayStart, ExpectedDayEnd fields

---

## AdvancedPatternCreator

**File:** `frontend/src/components/AdvancedPatternCreator.tsx`

### Purpose

Create complex regex-based patterns for auto-categorization.

### Modes

**Simple Mode:**
- Description contains
- Target category
- Target description

**Advanced Mode:**
- Full regex pattern editor
- Date/weekday patterns
- Amount range conditions

### Options

- Link to planned entry
- Apply retroactively to past transactions

---

## InviteMemberModal

**File:** `frontend/src/components/InviteMemberModal.tsx`

### Purpose

Invite new members to organization.

### Fields

| Field | Required | Type |
|-------|----------|------|
| Email | Yes | Email input |
| Role | Yes | Radio: user, manager, admin |

### Role Descriptions

Displays description of each role's capabilities.

---

## Modal Stack Handling

Multiple modals can be open simultaneously (nested):

1. CategoryTransactionsModal (parent)
2. → TransactionEditModal (child)
3. → → AdvancedPatternCreator (grandchild)

ESC key closes innermost modal first. Each modal manages its own state.

## Common Patterns

### Loading State

```jsx
<Modal.SubmitButton
  loading={isSubmitting}
  loadingText="Salvando..."
>
  Salvar
</Modal.SubmitButton>
```

### Form Validation

Forms validate on submit, show error above form fields.

### Success Handling

1. Close modal
2. Show success toast (via parent screen)
3. Refresh data
