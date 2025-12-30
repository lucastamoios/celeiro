## ADDED Requirements

### Requirement: Harvest Color System
The frontend SHALL use the "Harvest" color palette as the primary design system, replacing the current multi-color approach.

The system SHALL provide these semantic color tokens:
- `wheat` (amber tones): Primary brand color, main CTAs
- `sage` (muted green): Success states, income, on-track budget
- `terra` (terracotta): Warning states, attention needed
- `rust` (muted red): Error states, over-budget
- `stone` (warm gray): All neutral colors

#### Scenario: Primary button uses wheat color
- **WHEN** a primary action button is rendered
- **THEN** it SHALL use `bg-wheat-500` as background
- **AND** `hover:bg-wheat-600` for hover state

#### Scenario: Budget status shows semantic colors
- **WHEN** a budget category is under 80% spent
- **THEN** the progress bar SHALL use `bg-sage-500`
- **WHEN** a budget category is between 80-100% spent
- **THEN** the progress bar SHALL use `bg-terra-500`
- **WHEN** a budget category exceeds 100%
- **THEN** the progress bar SHALL use `bg-rust-500`

#### Scenario: Category colors are muted
- **WHEN** displaying category badges or icons
- **THEN** the system SHALL use muted neutral tones from a 6-color palette
- **AND** NOT use the previous 15-color rainbow palette

---

### Requirement: Typography System
The frontend SHALL use Inter as the primary font family with a defined type scale.

Financial data SHALL be displayed using tabular (monospace) numbers for alignment.

#### Scenario: Currency values align in columns
- **WHEN** displaying a list of currency amounts
- **THEN** the amounts SHALL use `tabular-nums` font-variant
- **AND** numbers SHALL align vertically

#### Scenario: Headings follow type scale
- **WHEN** displaying a page title
- **THEN** it SHALL use the `text-h1` class (30px, font-weight 700)
- **WHEN** displaying a section title
- **THEN** it SHALL use the `text-h2` class (24px, font-weight 600)

---

### Requirement: Dashboard Hero Status
The Dashboard SHALL display a hero status card as the primary element showing overall budget health.

Users SHALL be able to determine their budget status within 2 seconds of viewing the dashboard.

#### Scenario: User sees budget status immediately
- **WHEN** user opens the Dashboard
- **THEN** a hero status card SHALL be displayed prominently at the top
- **AND** the card SHALL show one of: "Você está no caminho certo", "Atenção ao orçamento", or "Orçamento excedido"
- **AND** the available amount for the month SHALL be displayed in large text

#### Scenario: Hero card reflects accurate status
- **WHEN** total spending is under 80% of total budget
- **THEN** the hero card SHALL display a success status with sage color accent
- **WHEN** total spending is between 80-100% of total budget
- **THEN** the hero card SHALL display a warning status with terra color accent
- **WHEN** total spending exceeds 100% of total budget
- **THEN** the hero card SHALL display an over-budget status with rust color accent

---

### Requirement: Attention Items Display
The Dashboard SHALL display an attention section for items requiring user action.

#### Scenario: Uncategorized transactions shown
- **WHEN** there are uncategorized transactions for the current month
- **THEN** the attention section SHALL display the count
- **AND** provide a link to categorize them

#### Scenario: Over-budget categories highlighted
- **WHEN** any budget category exceeds 100%
- **THEN** the attention section SHALL list those categories
- **AND** provide a link to view details

#### Scenario: No attention items
- **WHEN** there are no uncategorized transactions AND no over-budget categories
- **THEN** the attention section SHALL NOT be displayed

---

### Requirement: Category Budget Status Indicators
Budget category rows SHALL display visual status indicators (✓ ⚠ ✗) to show budget health at a glance.

#### Scenario: On-track indicator
- **WHEN** a category is under 85% of budget
- **THEN** a checkmark (✓) indicator SHALL be displayed
- **AND** the indicator SHALL use sage color

#### Scenario: Warning indicator
- **WHEN** a category is between 85-100% of budget
- **THEN** a warning (⚠) indicator SHALL be displayed
- **AND** the indicator SHALL use terra color

#### Scenario: Over-budget indicator
- **WHEN** a category exceeds 100% of budget
- **THEN** an over-budget (✗) indicator SHALL be displayed
- **AND** the indicator SHALL use rust color

---

### Requirement: Single Month Budget Focus
The Budget view SHALL focus on a single month at a time, with navigation to other months.

#### Scenario: Month navigation
- **WHEN** user views the Budget page
- **THEN** only the selected month's budget SHALL be displayed
- **AND** navigation arrows SHALL allow moving to previous/next months

#### Scenario: Month header shows summary
- **WHEN** viewing a month's budget
- **THEN** a header SHALL display: total planned, total spent, total available
- **AND** an overall progress bar for the month

---

### Requirement: Quick Transaction Categorization
Uncategorized transactions SHALL provide inline categorization without requiring a modal.

#### Scenario: Quick category dropdown
- **WHEN** viewing an uncategorized transaction in the list
- **THEN** a "Categorizar" dropdown button SHALL be displayed inline
- **WHEN** user clicks the dropdown
- **THEN** recent categories SHALL be shown first
- **AND** all categories SHALL be available in a scrollable list
- **AND** a "Criar regra" option SHALL be available

#### Scenario: Categorization updates immediately
- **WHEN** user selects a category from the dropdown
- **THEN** the transaction SHALL be categorized without page reload
- **AND** the dropdown SHALL be replaced with the category badge

---

### Requirement: Transaction Date Grouping
The Transaction list SHALL group transactions by date for easier scanning.

#### Scenario: Transactions grouped by date
- **WHEN** displaying the transaction list
- **THEN** transactions SHALL be grouped under date headers
- **AND** each header SHALL show: date, day of week, transaction count, daily total

#### Scenario: Date groups are collapsible
- **WHEN** user clicks a date header
- **THEN** the transactions for that date MAY be collapsed/expanded

---

### Requirement: Savings Goal Progress Visualization
Savings goal cards SHALL display enhanced progress visualization with milestone markers.

#### Scenario: Progress bar shows milestones
- **WHEN** displaying a savings goal card
- **THEN** the progress bar SHALL show visual markers at 25%, 50%, 75%
- **AND** markers SHALL be styled differently when passed

#### Scenario: Monthly savings suggestion
- **WHEN** a goal has a due date
- **THEN** the card SHALL display the monthly amount needed to reach the goal on time

#### Scenario: Goal completion celebration
- **WHEN** a goal reaches 100% progress
- **THEN** a celebration modal SHALL be displayed
- **AND** the modal SHALL show the total amount saved
- **AND** include an encouraging message

---

### Requirement: Consistent Component Library
All UI components SHALL follow standardized patterns defined in the Harvest design system.

#### Scenario: Buttons use standard variants
- **WHEN** rendering any button in the application
- **THEN** it SHALL use one of: primary, secondary, ghost, or danger variants
- **AND** follow the defined padding, border-radius, and color specifications

#### Scenario: Cards use standard styling
- **WHEN** rendering any card component
- **THEN** it SHALL use: white background, rounded-xl border-radius, shadow-warm-sm
- **AND** consistent padding (p-6 for standard, p-4 for compact)

#### Scenario: Modals follow standard structure
- **WHEN** displaying any modal
- **THEN** it SHALL have: header with title and close button, scrollable body, footer with actions
- **AND** use rounded-2xl border-radius
- **AND** support ESC key and backdrop click to dismiss

---

### Requirement: Warm Visual Tone
The application SHALL maintain a warm, confident visual tone consistent with the "Celeiro" (granary/storehouse) brand.

#### Scenario: Shadows use warm tint
- **WHEN** any shadow is applied to a component
- **THEN** the shadow SHALL use warm-tinted colors (stone-500 based)
- **AND** NOT use default cold gray shadows

#### Scenario: Background uses warm neutral
- **WHEN** rendering the page background
- **THEN** it SHALL use `bg-stone-50` (#FAFAF9)
- **AND** NOT use cold blue-gray colors

#### Scenario: Text uses warm gray
- **WHEN** rendering secondary text
- **THEN** it SHALL use stone color variants (stone-500, stone-600)
- **AND** NOT use default gray colors
