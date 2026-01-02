# planned-entries-management Specification

## Purpose
TBD - created by archiving change add-category-centric-budgeting. Update Purpose after archive.
## Requirements
### Requirement: Create planned entries
The system MUST allow users to be able to create planned entries for categories.

#### Scenario: Create one-time planned entry
GIVEN a user has category "Restaurants"
WHEN creating a planned entry with description="Team Dinner", amount=100.00, is_recurrent=false
THEN the entry must be saved with is_recurrent=FALSE and parent_entry_id=NULL
AND if the category budget type is "calculated" or "maior", the budget's planned_amount must be recalculated

#### Scenario: Create recurrent planned entry
GIVEN a user has category "Restaurants"
WHEN creating a recurrent planned entry with description="Weekly Lunch", amount=400.00, is_recurrent=true, expected_day=5
THEN the entry must be saved as a template with is_recurrent=TRUE and parent_entry_id=NULL
AND monthly instances must NOT be created yet (lazy)

### Requirement: Generate monthly instances from recurrent templates
Recurrent entries MUST spawn monthly instances when a month is accessed.

#### Scenario: Generate instances for new month
GIVEN a recurrent entry "Weekly Lunch" (R$ 400, expected_day=5)
WHEN generating instances for October 2025
THEN a new planned_entry must be created with:
- description="Weekly Lunch"
- amount=400.00
- is_recurrent=FALSE
- parent_entry_id=<template ID>
- expected_day=5
- is_active=TRUE

#### Scenario: Modify monthly instance independently
GIVEN a monthly instance for "Weekly Lunch" in October
WHEN updating the instance amount to R$ 450
THEN only the October instance amount must change
AND the parent template amount must remain R$ 400
AND future months must still use R$ 400

### Requirement: Update planned entries
The system MUST recalculate affected budgets.

#### Scenario: Update entry amount
GIVEN a planned entry with amount=100.00 for category "Restaurants"
AND category budget type is "calculated"
WHEN updating the entry amount to 150.00
THEN the entry must be updated
AND the category budget's planned_amount must be recalculated
AND the new planned_amount must equal the sum of all planned entries for that category

### Requirement: Delete planned entries
The system MUST delete planned entries and recalculate budgets and handle recurrent templates correctly.

#### Scenario: Delete one-time entry
GIVEN a one-time planned entry for category "Restaurants"
WHEN deleting the entry
THEN the entry must be removed
AND the category budget's planned_amount must be recalculated

#### Scenario: Delete recurrent template
GIVEN a recurrent template "Weekly Lunch"
AND 3 monthly instances exist (October, November, December)
WHEN deleting the template
THEN the template must be soft-deleted (is_active=FALSE)
AND all future instances must also be soft-deleted
AND existing instances for past/current months must remain active

