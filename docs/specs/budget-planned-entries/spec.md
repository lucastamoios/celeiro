# Budget & Planned Entries

## Purpose

Document the budgeting and planned-entry capabilities (planned entries, matching, tags, controllable pacing, and drag & drop organization) as the stable, “current truth” of the system.

## Scope

This capability covers:
- Category budgets (fixed / calculated / maior)
- Planned entries (monthly status, match/unmatch, dismiss/undismiss)
- Planned entry tags (and transfer to transactions on match)
- Controllable categories + pacing widget
- Drag & drop moving planned entries across categories

For UI behavior and user flows, see `docs/screens/budgets.md` and `docs/screens/dashboard.md`.

## Requirements

### Requirement: Show Planned Entries in Budget Category Modal
The system SHALL display planned entries alongside transactions for a selected category.

#### Scenario: View planned entries for a category
- GIVEN I click a category budget card
- WHEN the category modal opens
- THEN I see the category transactions and its planned entries

### Requirement: Create Planned Entry from Category Modal
The system SHALL allow creating a planned entry from within the category modal context.

#### Scenario: Quick add planned entry
- GIVEN I am viewing a category modal
- WHEN I choose to add a planned entry
- THEN the planned entry form opens pre-filled with the current category
- AND the planned entry appears in the list after saving

### Requirement: Inline Edit Planned Amount
The system SHALL allow editing a planned entry amount inline from the category modal.

#### Scenario: Edit planned amount inline
- GIVEN I see a planned entry amount in the category modal
- WHEN I edit the amount
- THEN it is persisted

### Requirement: Planned Entry Tags
Planned entries SHALL support tags and transfer them to matched transactions.

#### Scenario: Create planned entry with tags
- GIVEN I create or edit a planned entry
- WHEN I select tags
- THEN the entry stores those tags

#### Scenario: Transfer tags on match
- GIVEN a planned entry has tags
- WHEN I match a transaction to the planned entry
- THEN the transaction receives the entry tags
- AND existing transaction tags are preserved

### Requirement: Controllable Categories
Categories SHALL support an optional controllable flag to enable pacing.

#### Scenario: Toggle category controllable
- GIVEN I edit a category
- WHEN I toggle controllable on/off
- THEN the category is updated

### Requirement: Budget Pacing Endpoint
The system SHALL expose budget pacing data for controllable categories.

#### Scenario: Fetch controllable category pacing
- GIVEN I request pacing for a given month/year
- WHEN the API returns
- THEN I receive per-category budget, spent, expected, variance, and status

### Requirement: Drag & Drop Planned Entries
Users SHALL be able to drag a planned entry between category cards to change its category.

#### Scenario: Move planned entry to another category
- GIVEN I have a planned entry in a category
- WHEN I drag it onto another category card
- THEN the planned entry category_id is updated
- AND budget calculations refresh

#### Scenario: Prevent invalid drops
- GIVEN I am dragging an income planned entry
- WHEN I hover an expense category card
- THEN the UI indicates the target is invalid
- AND dropping does not change the category

## Data Model

See `docs/database.md` for schema references.

- `categories.is_controllable` (boolean)
- `planned_entry_tags(planned_entry_id, tag_id)`

## Related Documentation

- `docs/screens/budgets.md`
- `docs/screens/dashboard.md`
- `docs/database.md`
- `docs/domains.md`
- `docs/conventions.md`
