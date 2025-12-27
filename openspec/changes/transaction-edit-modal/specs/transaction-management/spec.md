## ADDED Requirements

### Requirement: Transaction Edit Modal

The system SHALL provide a modal dialog for editing transaction details when the user clicks on any part of a transaction row.

#### Scenario: Opening edit modal

- **WHEN** user clicks anywhere on a transaction row in the transaction list
- **THEN** the system opens a modal dialog displaying the transaction details
- **AND** the modal contains editable fields for: description, category, and notes

#### Scenario: Editing transaction description

- **WHEN** user modifies the description field in the edit modal
- **AND** clicks the save button
- **THEN** the system updates the transaction with the new description
- **AND** closes the modal
- **AND** refreshes the transaction list to show the updated description

#### Scenario: Changing transaction category

- **WHEN** user selects a different category from the dropdown in the edit modal
- **AND** clicks the save button
- **THEN** the system updates the transaction with the new category
- **AND** closes the modal

#### Scenario: Adding notes to transaction

- **WHEN** user enters or modifies notes in the edit modal
- **AND** clicks the save button
- **THEN** the system saves the notes with the transaction
- **AND** closes the modal

#### Scenario: Closing modal without saving

- **WHEN** user presses Escape key or clicks outside the modal
- **THEN** the modal closes without saving any changes

### Requirement: Pattern Creation from Transaction

The system SHALL allow users to create a pattern directly from a transaction via the edit modal.

#### Scenario: Initiating pattern creation

- **WHEN** user clicks "Create Pattern" button in the edit modal
- **THEN** the system opens the Pattern Creator component
- **AND** pre-fills the pattern fields based on the transaction data (description → description regex, amount, category)

#### Scenario: Pattern auto-application after creation

- **WHEN** user successfully creates a pattern from the edit modal
- **THEN** the system automatically applies the pattern to all matching uncategorized transactions from the current month onwards
- **AND** shows a success message indicating how many transactions were affected

### Requirement: Simplified Transaction Table Display

The system SHALL display transactions in a simplified table format without dedicated Type and Notes columns.

#### Scenario: Transaction type via amount sign

- **WHEN** displaying a transaction in the table
- **AND** the transaction is a debit (expense)
- **THEN** the amount is displayed with a negative sign and red color styling

#### Scenario: Credit transaction display

- **WHEN** displaying a transaction in the table
- **AND** the transaction is a credit (income)
- **THEN** the amount is displayed with a positive sign and green color styling

#### Scenario: Notes accessible via modal only

- **WHEN** a transaction has notes
- **THEN** the notes are NOT displayed in the main table
- **AND** are only visible when opening the edit modal for that transaction

## REMOVED Requirements

### Requirement: Type Column in Transaction Table

**Reason**: Transaction type is now indicated by the amount sign/color, making a dedicated column redundant.
**Migration**: No data migration needed; this is a display-only change.

### Requirement: Notes Column in Transaction Table

**Reason**: Notes clutter the main table view. They are now accessible via the edit modal.
**Migration**: No data migration needed; notes remain in the database and are visible in the modal.

