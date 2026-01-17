## ADDED Requirements

### Requirement: Category Management
The system SHALL allow users to create, view, update, and delete spending categories scoped to their organization.

A category MUST have:
- A name unique within the organization

A category MAY have:
- A color and icon for visual identification

#### Scenario: Create a new category
- **GIVEN** user is authenticated
- **WHEN** user creates a category named "Groceries"
- **THEN** the category is created successfully

#### Scenario: Prevent duplicate category names
- **GIVEN** user already has a category named "Groceries"
- **WHEN** user attempts to create another category named "Groceries"
- **THEN** the system returns a validation error
