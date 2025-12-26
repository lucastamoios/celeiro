# Budget UI Specification

## ADDED Requirements

### REQ-BUI-001: Budget Detail View

The system MUST provide a budget detail view that displays budget information and category allocations.

#### Scenario: View budget with items
- **Given** a budget exists with multiple category allocations
- **When** user navigates to budget detail view
- **Then** system SHALL display budget header (name, month, year, amount, type)
- **And** system SHALL display list of budget items with category name, emoji, and planned amount
- **And** system SHALL fetch and display actual spending for each category
- **And** system SHALL show progress bars colored by spending percentage (green <80%, yellow 80-100%, red >100%)

#### Scenario: View budget without items
- **Given** a budget exists with no category allocations
- **When** user navigates to budget detail view
- **Then** system SHALL display empty state message
- **And** system SHALL show "Add First Category" call-to-action button

### REQ-BUI-002: Create Budget Item

The system MUST allow users to add category allocations to budgets.

#### Scenario: Add new budget item
- **Given** user is viewing budget detail
- **When** user clicks "Add Category" button
- **Then** system SHALL display budget item form
- **And** form SHALL include category dropdown with all available categories
- **And** form SHALL include planned amount input field
- **When** user selects category and enters amount
- **And** user clicks save
- **Then** system SHALL POST to `/financial/budgets/{id}/items`
- **And** system SHALL refresh budget items list on success
- **And** system SHALL display success message

#### Scenario: Validate budget item input
- **Given** user is creating a budget item
- **When** user attempts to save with amount ≤ 0
- **Then** system SHALL display validation error "Amount must be greater than zero"
- **When** user attempts to save without selecting category
- **Then** system SHALL display validation error "Category is required"

### REQ-BUI-003: Update Budget Item

The system MUST allow users to edit existing budget item amounts.

#### Scenario: Edit budget item amount
- **Given** budget item exists in budget
- **When** user clicks on amount field
- **Then** system SHALL enable inline editing for that field
- **When** user changes amount and saves
- **Then** system SHALL PATCH to `/financial/budgets/{id}/items/{itemId}`
- **And** system SHALL refresh budget items list on success
- **And** system SHALL recalculate total budget amount

### REQ-BUI-004: Delete Budget Item

The system MUST allow users to remove category allocations from budgets.

#### Scenario: Delete budget item with confirmation
- **Given** budget item exists in budget
- **When** user clicks delete button for item
- **Then** system SHALL display confirmation dialog with category name
- **When** user confirms deletion
- **Then** system SHALL DELETE to `/financial/budgets/{id}/items/{itemId}`
- **And** system SHALL refresh budget items list on success
- **And** system SHALL recalculate total budget amount

#### Scenario: Cancel deletion
- **Given** user clicks delete button
- **When** user cancels in confirmation dialog
- **Then** system SHALL NOT delete the item
- **And** system SHALL close confirmation dialog

### REQ-BUI-005: Budget Navigation

The system MUST provide navigation between budget list and detail views.

#### Scenario: Navigate to budget detail
- **Given** user is viewing budget list
- **When** user clicks "Ver detalhes" button on budget card
- **Then** system SHALL navigate to budget detail view for that budget
- **And** system SHALL pass budget ID to detail component

#### Scenario: Navigate back to list
- **Given** user is viewing budget detail
- **When** user clicks "Back to Budgets" button
- **Then** system SHALL navigate back to budget list view

### REQ-BUI-006: Spending Visualization

The system MUST display actual spending compared to planned amounts for each category.

#### Scenario: Display spending progress
- **Given** budget item exists with planned amount
- **And** transactions exist in that category for budget period
- **When** system calculates actual spending
- **Then** system SHALL display planned amount
- **And** system SHALL display actual spent amount
- **And** system SHALL calculate spending percentage (actual / planned * 100)
- **And** system SHALL display progress bar:
  - Green if percentage < 80%
  - Yellow if percentage >= 80% and <= 100%
  - Red if percentage > 100%

#### Scenario: Handle zero spending
- **Given** budget item exists
- **And** no transactions exist in that category
- **When** viewing budget detail
- **Then** system SHALL show R$ 0,00 actual spending
- **And** system SHALL show 0% progress with green color

### REQ-BUI-007: Error Handling

The system MUST handle errors gracefully throughout budget item management.

#### Scenario: Handle API errors
- **Given** user performs any budget item operation
- **When** API request fails
- **Then** system SHALL display user-friendly error message
- **And** system SHALL NOT update UI state
- **And** system SHALL provide retry option for transient errors

#### Scenario: Handle loading states
- **Given** user performs any budget item operation
- **When** API request is in progress
- **Then** system SHALL display loading indicator
- **And** system SHALL disable action buttons to prevent duplicate requests
- **When** API request completes
- **Then** system SHALL remove loading indicator
- **And** system SHALL re-enable action buttons
