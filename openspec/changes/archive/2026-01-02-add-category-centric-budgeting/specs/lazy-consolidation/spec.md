# Lazy Consolidation

## Summary
Automatic month initialization and budget consolidation triggered lazily when users access a new month.

## ADDED Requirements

### Requirement: Lazy month initialization
The system MUST automatically create them from the previous month.

#### Scenario: First access to new month copies previous month
GIVEN a user has category budgets for October 2025
AND no budgets exist for November 2025
WHEN requesting category budgets for November 2025
THEN budgets must be created for all categories in November by copying October budgets:
- Same budget_type
- Same planned_amount for "fixed" type
- Recalculated planned_amount for "calculated" type (sum of active planned entries)
- Max(fixed_amount, calculated_amount) for "maior" type
AND all budgets must have is_consolidated=FALSE

#### Scenario: Initialize from categories when no previous month exists
GIVEN a user has 5 categories
AND no budgets exist for any month
WHEN requesting category budgets for October 2025
THEN budgets must be created for all 5 categories with:
- budget_type="fixed"
- planned_amount=0.00
- is_consolidated=FALSE

#### Scenario: Add new category mid-month
GIVEN budgets exist for October 2025 with 5 categories
WHEN a user creates a 6th category "Entertainment"
AND requests category budgets for October
THEN a budget for "Entertainment" must be created with:
- budget_type="fixed"
- planned_amount=0.00
- month=10, year=2025

### Requirement: Month consolidation
The system MUST freeze budgets at month end and create historical snapshots.

#### Scenario: Consolidate ended month
GIVEN it is November 5, 2025
AND category budgets exist for October 2025
AND October budgets are NOT consolidated
WHEN requesting October budgets
THEN all October budgets must be consolidated:
- is_consolidated=TRUE
- consolidated_at=<current timestamp>
AND monthly_snapshots must be created for each budget with:
- planned_amount=<budget planned_amount>
- actual_amount=<sum of transactions for category in October>
- variance_percent=((actual - planned) / planned) * 100
- budget_type=<budget type>

#### Scenario: Consolidated months are immutable
GIVEN October 2025 is consolidated
WHEN attempting to update a consolidated budget
THEN the update must be rejected with error "Cannot modify consolidated budget"

#### Scenario: Manual batch consolidation via UI
GIVEN it is November 5, 2025
AND category budgets exist for October 2025
AND some October budgets are NOT consolidated
WHEN user clicks "Consolidar Mês" button on the Orçamentos page
THEN all unconsolidated October budgets must be consolidated in parallel:
- is_consolidated=TRUE
- consolidated_at=<current timestamp>
AND monthly_snapshots must be created for each budget
AND user must see success message with count of consolidated budgets
AND the "Consolidar Mês" button must disappear (all budgets now consolidated)

#### Scenario: Consolidate button only appears for ended months
GIVEN it is November 5, 2025
AND viewing October 2025 budgets (past month)
AND at least one budget is NOT consolidated
THEN the "Consolidar Mês" button must be visible

GIVEN it is November 5, 2025
AND viewing November 2025 budgets (current month)
THEN the "Consolidar Mês" button must NOT be visible

### Requirement: Generate planned entry instances during initialization
The system MUST create instances from recurrent templates.

#### Scenario: Create instances during month init
GIVEN a recurrent template "Weekly Lunch" (R$ 400)
AND no budgets exist for November 2025
WHEN initializing November budgets
THEN a monthly instance must be created for "Weekly Lunch" in November
AND the instance must have parent_entry_id=<template ID>
AND if category budget is "calculated", planned_amount must include this R$ 400

## Related Capabilities
- Depends on: category-budgets-data (requires category_budgets, monthly_snapshots)
- Depends on: planned-entries-management (generates instances)
- Related to: variance-warnings (consolidation calculates variance)
