## Why

Currently, editing a transaction requires inline editing in the table, which is limited. Users need a richer interface to edit transaction details (description, category, notes) and easily create patterns from existing transactions. The main table also shows unnecessary columns (Type, Notes) that clutter the view.

## What Changes

- **Add Transaction Edit Modal**: Clicking anywhere on a transaction row opens a modal for editing
  - Edit description
  - Select/change category
  - Add/edit notes
  - Button to create a pattern based on current transaction data
- **Pattern Creation from Transaction**: When creating a pattern from the modal, it uses the transaction data as defaults and auto-applies to matching transactions (current month and future)
- **Simplify Transaction Table**: Remove Type and Notes columns
  - Transaction type will be indicated by the amount sign (positive = credit, negative = debit)
  - Notes can be viewed/edited in the modal

## Impact

- Affected specs: `transaction-matching`
- Affected code:
  - `frontend/src/components/TransactionList.tsx` - Add modal, modify table columns
  - `frontend/src/components/TransactionEditModal.tsx` - New component
  - May need minor backend changes for pattern creation workflow

