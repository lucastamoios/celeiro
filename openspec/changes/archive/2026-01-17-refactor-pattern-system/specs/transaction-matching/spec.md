# Transaction Matching System - Delta Spec

## ADDED Requirements

### Requirement: Original Description Preservation
The system SHALL store the original transaction description from OFX import in a separate immutable field (`original_description`) that cannot be modified after import.

#### Scenario: OFX Import populates original description
- **WHEN** a transaction is imported from an OFX file
- **THEN** the `original_description` field is populated with the cleaned OFX description
- **AND** the `description` field is also populated with the same value initially

#### Scenario: Original description is immutable
- **WHEN** a user edits a transaction's description
- **THEN** only the `description` field is updated
- **AND** the `original_description` field remains unchanged

#### Scenario: Display uses user description when set
- **WHEN** displaying a transaction with a non-empty `description` field
- **THEN** the system displays the `description` value

#### Scenario: Display uses original description as fallback
- **WHEN** displaying a transaction with an empty or null `description` field
- **THEN** the system displays the `original_description` value

### Requirement: Pattern Matching Criteria
The pattern matching engine SHALL evaluate patterns against transactions using multiple criteria: description (regex), date (regex), weekday (regex), and amount range. For the description criterion, the engine SHALL use `original_description`, never the user-edited `description` field.

#### Scenario: Pattern matches on all criteria
- **GIVEN** a pattern with:
  - Description regex: `UBER.*TRIP`
  - Amount range: R$10.00 - R$100.00
  - Weekday pattern: `(1|2|3|4|5)` (weekdays only)
- **WHEN** evaluating a transaction with:
  - `original_description` = "UBER *TRIP ABC123"
  - Amount = R$25.00
  - Transaction date = Monday
- **THEN** the pattern matches the transaction

#### Scenario: Description matching uses original_description
- **WHEN** evaluating a pattern's description regex against a transaction
- **THEN** the regex is applied to `original_description`
- **AND** the `description` field (user-edited) is ignored for matching purposes

#### Scenario: Edited transaction still matches pattern
- **GIVEN** a transaction with `original_description` = "UBER *TRIP ABC123"
- **AND** a pattern with description regex `UBER.*TRIP`
- **WHEN** user edits `description` to "Uber ride to work"
- **THEN** the pattern still matches the transaction (uses `original_description`)

### Requirement: Retroactive Pattern Application
The system SHALL provide an option to apply a pattern retroactively to all existing transactions that match the pattern's criteria.

#### Scenario: Apply pattern retroactively on creation
- **GIVEN** user creates a new pattern with "Apply to existing transactions" enabled
- **WHEN** the pattern is saved
- **THEN** the system evaluates all existing transactions against the pattern
- **AND** matching transactions have their `category_id` and `description` updated
- **AND** matching transactions' `original_description` remains unchanged
- **AND** a summary is shown: "Pattern applied to X existing transactions"

#### Scenario: Apply pattern retroactively via button
- **GIVEN** an existing pattern in the pattern list
- **WHEN** user clicks "Apply to existing" button
- **THEN** the system evaluates all existing transactions against the pattern
- **AND** matching transactions are updated
- **AND** a confirmation shows how many transactions were updated

#### Scenario: Retroactive application skips already-categorized transactions
- **GIVEN** a transaction that already has a category assigned
- **WHEN** retroactive pattern application runs
- **THEN** the transaction is skipped (not overwritten)
- **AND** only uncategorized transactions are updated

## MODIFIED Requirements

### Requirement: Pattern System
The system SHALL provide a unified regex-based pattern matching system (replacing the previous dual simple/advanced pattern system). Patterns are stored in the `patterns` table and support regex matching on description, date, weekday, and amount range.

#### Scenario: Create pattern with regex
- **WHEN** user creates a pattern with description regex `PIX.*MERCADO`
- **AND** target category "Groceries"
- **AND** target description "Supermarket Purchase"
- **THEN** pattern is saved to `patterns` table
- **AND** pattern can be applied to matching transactions

#### Scenario: Pattern applies both category and description
- **GIVEN** a transaction matching pattern regex
- **WHEN** pattern is applied to transaction
- **THEN** transaction's `category_id` is set to pattern's target category
- **AND** transaction's `description` is set to pattern's target description
- **AND** transaction's `original_description` remains unchanged

#### Scenario: Auto-apply on import
- **GIVEN** an active pattern with matching criteria (description regex, amount range, date, weekday)
- **WHEN** a new transaction is imported via OFX
- **THEN** all active patterns are evaluated against the transaction
- **AND** pattern criteria are checked: description regex (against `original_description`), amount range, date pattern, weekday pattern
- **AND** the first fully matching pattern is automatically applied
- **AND** the transaction's `category_id` and `description` are set from the pattern
- **AND** the transaction's `original_description` remains unchanged

#### Scenario: Multiple patterns match
- **GIVEN** multiple active patterns that fully match a transaction's criteria
- **WHEN** the transaction is imported
- **THEN** patterns are evaluated in priority order (by creation date, oldest first)
- **AND** the first matching pattern is applied

## REMOVED Requirements

### Requirement: Simple Patterns (is_saved_pattern)
**Reason**: Simple patterns only stored category and exact description match. This was confusing alongside advanced patterns and less powerful than regex-based matching.

**Migration**: Users should create regex patterns for any important recurring transactions. The "Create Pattern" UI will be available from the transaction list.

### Requirement: Save Transaction as Pattern (One-click)
**Reason**: The one-click "Save as Pattern" button created simple patterns which are being removed. Users will now use "Create Pattern" which opens a form to define a proper regex pattern.

**Migration**: The new "Create Pattern" button pre-fills the pattern form with transaction data. User can then customize the regex before saving.

