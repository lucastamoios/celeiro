## 1. Frontend - Transaction Edit Modal Component

- [ ] 1.1 Create `TransactionEditModal.tsx` component
- [ ] 1.2 Add form fields: description (text input), category (dropdown), notes (textarea)
- [ ] 1.3 Add "Create Pattern" button that opens PatternCreator with prefilled data
- [ ] 1.4 Implement save functionality (PATCH to existing update endpoint)
- [ ] 1.5 Handle modal open/close state and keyboard shortcuts (Escape to close)

## 2. Frontend - Transaction Table Modifications

- [ ] 2.1 Make entire transaction row clickable (opens edit modal)
- [ ] 2.2 Remove "Type" column from the table
- [ ] 2.3 Remove "Notes" column from the table
- [ ] 2.4 Display transaction type via amount sign styling (red for debit, green for credit)
- [ ] 2.5 Update responsive layout for simplified table

## 3. Pattern Creation Flow

- [ ] 3.1 Add callback from modal to PatternCreator with transaction data
- [ ] 3.2 Pre-fill pattern fields (description regex, amount, category) from transaction
- [ ] 3.3 After pattern creation, trigger retroactive application for current month+ transactions
- [ ] 3.4 Show success feedback in modal

## 4. Integration & Testing

- [ ] 4.1 Connect modal to TransactionList component
- [ ] 4.2 Test modal open/close/save flow
- [ ] 4.3 Test pattern creation from transaction
- [ ] 4.4 Verify table displays correctly without Type/Notes columns

