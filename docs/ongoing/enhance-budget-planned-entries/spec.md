# Budget & Planned Entries Enhancement Specification

## Metadata
- **Change ID**: enhance-budget-planned-entries
- **Created**: 2026-01-17
- **Status**: draft

## Purpose

Enhance the budget management experience by making planned entries more visible, easier to manage, and integrated with transactions. Add new capabilities like tags, drag-and-drop reorganization, and budget pacing visualization for controllable categories.

---

## Feature 1: Enhanced Category Budget Modal

### Current State
When clicking a budget category card, the `CategoryTransactionsModal` opens showing only transactions for that category.

### Requirements

#### Requirement: Show Planned Entries in Modal
The modal SHALL display planned entries alongside transactions for the selected category.

##### Scenario: View Planned Entries
- GIVEN I click on a category budget card
- WHEN the CategoryTransactionsModal opens
- THEN I see a tabbed or sectioned view with both transactions AND planned entries

#### Requirement: Create Planned Entry from Modal
The modal SHALL allow creating new planned entries directly without leaving the context.

##### Scenario: Quick Add Planned Entry
- GIVEN I'm viewing a category's budget modal
- WHEN I click "Add Planned Entry"
- THEN a form appears (inline or sub-modal) pre-filled with the category
- AND the new entry appears in the list after saving

#### Requirement: Edit Planned Amount Inline
The modal SHALL allow editing the planned amount for existing entries without opening another modal.

##### Scenario: Inline Amount Edit
- GIVEN I see a planned entry in the modal
- WHEN I click on the amount value
- THEN it becomes editable inline
- AND I can save by pressing Enter or clicking away

---

## Feature 2: Fix Quick Pattern Description Text

### Current State
The "Criar Padrão Rápido" section shows:
> "Vincular transações automaticamente quando a descrição contiver 'Apple'"

This is misleading - "Apple" is the TARGET description (what transactions become), not the matching text.

### Requirements

#### Requirement: Accurate Pattern Description
The UI SHALL correctly explain that the pattern matches the original bank description and OUTPUTS the planned entry description.

##### Scenario: Clear Pattern Explanation
- GIVEN I'm creating a planned entry with description "Netflix"
- WHEN I see the quick pattern section
- THEN the text explains: "Transações do banco que contenham 'Netflix' serão renomeadas para 'Netflix' e categorizadas automaticamente"

---

## Feature 3: Fix Savings Goal Binding to Planned Entries

### Current State
User reports they cannot bind a savings goal to planned entries.

### Requirements

#### Requirement: Savings Goal Selection Works
The planned entry form SHALL allow selecting and saving a savings goal.

##### Scenario: Bind Goal to Entry
- GIVEN I'm creating or editing a planned entry
- WHEN I select a savings goal from the dropdown
- AND I save the entry
- THEN the goal is persisted and visible when viewing the entry

---

## Feature 4: Drag & Drop Planned Entries Between Categories

### Requirements

#### Requirement: Drag to Change Category
Users SHALL be able to drag a planned entry from one category card to another to change its category.

##### Scenario: Move Entry to Different Category
- GIVEN I have a planned entry "Almoço" in category "Alimentação"
- WHEN I drag it to the "Lazer" category card
- THEN the entry's category changes to "Lazer"
- AND the budget calculations update for both categories

##### Scenario: Visual Feedback During Drag
- GIVEN I'm dragging a planned entry
- WHEN I hover over a valid drop target (category card)
- THEN the target card shows a visual highlight
- AND invalid targets (different entry_type) are visually indicated

---

## Feature 5: Tags for Planned Entries

### Requirements

#### Requirement: Add Tags to Planned Entries
Planned entries SHALL support tags, similar to transactions.

##### Scenario: Create Entry with Tags
- GIVEN I'm creating a planned entry
- WHEN I add tags "recorrente, essencial"
- THEN the tags are saved with the entry

#### Requirement: Transfer Tags on Match
When a transaction is matched to a planned entry, the entry's tags SHALL be copied to the transaction.

##### Scenario: Tags Transfer on Match
- GIVEN a planned entry with tags "recorrente, empresa"
- WHEN I match it to a transaction
- THEN the transaction receives those tags
- AND existing transaction tags are preserved (merged)

---

## Feature 6: Controllable Categories (Budget Pacing)

### Requirements

#### Requirement: Mark Category as Controllable
Categories SHALL have an optional "controllable" flag indicating they should show pacing information.

##### Scenario: Enable Controllable Flag
- GIVEN I'm viewing category settings
- WHEN I toggle "Controlável" on
- THEN the category is marked for pacing display

#### Requirement: Dashboard Pacing Widget
The main dashboard SHALL show controllable categories with their current pace vs expected pace.

##### Scenario: Pacing Calculation
- GIVEN a controllable category "Lazer" with R$ 3000 planned for the month
- AND today is the 11th of a 30-day month (36.7% through)
- AND I've spent R$ 1500 (50% of budget)
- WHEN I view the dashboard
- THEN I see: "Lazer: R$ 1500 gasto / R$ 1100 esperado (+R$ 400 acima do ritmo)"

##### Scenario: Visual Pace Indicator
- GIVEN a controllable category
- WHEN spending is above expected pace
- THEN show red/warning indicator
- WHEN spending is below expected pace
- THEN show green/healthy indicator

---

## Feature 7: Clarify "Gasto" Label in Orçamentos

### Current State
The summary shows "Gasto" which may be confused with actual vs forecasted.

### Requirements

#### Requirement: Clear Spending Label
The UI SHALL clearly indicate whether the value is actual spending or forecasted.

##### Scenario: Tooltip Explanation
- GIVEN I'm viewing the budget summary
- WHEN I hover over "Gasto"
- THEN a tooltip explains the calculation method

---

## Database Changes

### New Fields

```sql
-- Add controllable flag to categories
ALTER TABLE categories ADD COLUMN is_controllable BOOLEAN DEFAULT FALSE;

-- Add tags support to planned_entries (junction table)
CREATE TABLE planned_entry_tags (
    planned_entry_id INTEGER REFERENCES planned_entries(planned_entry_id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (planned_entry_id, tag_id)
);
```

---

## Acceptance Criteria

### Feature 1: Enhanced Modal
- [ ] CategoryTransactionsModal shows both transactions and planned entries
- [ ] Can create planned entry from within modal
- [ ] Can edit planned amount inline

### Feature 2: Quick Pattern Fix
- [ ] Pattern description text accurately explains matching vs output

### Feature 3: Savings Goal Fix
- [ ] Can select and save savings goal on planned entry
- [ ] Goal persists after save and reload

### Feature 4: Drag & Drop
- [ ] Can drag planned entry between category cards
- [ ] Category updates on drop
- [ ] Visual feedback during drag

### Feature 5: Tags
- [ ] Can add tags to planned entries
- [ ] Tags transfer to transaction on match

### Feature 6: Controllable Categories
- [ ] Can mark category as controllable
- [ ] Dashboard shows pacing for controllable categories
- [ ] Correct calculation of expected vs actual pace

### Feature 7: Label Clarity
- [ ] "Gasto" label has tooltip or clearer labeling
