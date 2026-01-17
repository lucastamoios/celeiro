## 1. Frontend - Transaction Edit Modal Component

- [x] 1.1 Create `TransactionEditModal.tsx` component
- [x] 1.2 Add form fields: description (text input), category (dropdown), notes (textarea)
- [x] 1.3 Add "Create Pattern" button that opens PatternCreator with prefilled data
- [x] 1.4 Implement save functionality (PATCH to existing update endpoint)
- [x] 1.5 Handle modal open/close state and keyboard shortcuts (Escape to close)

## 2. Frontend - Transaction Table Modifications

- [x] 2.1 Make entire transaction row clickable (opens edit modal)
- [x] 2.2 Remove "Type" column from the table
- [x] 2.3 Remove "Notes" column from the table
- [x] 2.4 Display transaction type via amount sign styling (red for debit, green for credit)
- [x] 2.5 Update responsive layout for simplified table

## 3. Pattern Creation Flow

- [x] 3.1 Add callback from modal to PatternCreator with transaction data
- [x] 3.2 Pre-fill pattern fields (description regex, amount, category) from transaction
- [x] 3.3 After pattern creation, trigger retroactive application for current month+ transactions
- [x] 3.4 Show success feedback in modal

## 4. Integration & Testing

- [x] 4.1 Connect modal to TransactionList component
- [x] 4.2 Test modal open/close/save flow
- [x] 4.3 Test pattern creation from transaction
- [x] 4.4 Verify table displays correctly without Type/Notes columns

