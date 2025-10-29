# Financial Categories Specification

## ADDED Requirements

### System Categories

The system provides default categories that all users can use immediately.

#### Scenario: New user sees system categories

**Given** a newly registered user
**When** they request the list of categories
**Then** they see 7 system categories:
  - Alimentação 🍔
  - Transporte 🚗
  - Moradia 🏠
  - Saúde 💊
  - Educação 📚
  - Lazer 🎮
  - Outros 📦
**And** all system categories have is_system = true
**And** all system categories have user_id = NULL

#### Scenario: Prevent deletion of system categories

**Given** a system category with category_id 1 and is_system = true
**When** a user attempts to delete the category
**Then** the request is denied with 400 Bad Request
**And** the error message indicates "Cannot delete system category"

### User Categories

Users can create custom categories for their specific needs.

#### Scenario: Create custom category

**Given** an authenticated user with user_id 100
**When** they create a category with name "Pets" and icon "🐶"
**Then** the category is created with user_id = 100
**And** the category.is_system is set to false
**And** the category appears in the user's category list
**And** other users cannot see this custom category

#### Scenario: Update custom category

**Given** a user-created category with category_id 50
**When** the user updates the name to "Pet Care" and icon to "🐱"
**Then** the category name and icon are updated
**And** existing transactions using this category remain linked

### Category Usage

Categories can be assigned to transactions and used in budgets.

#### Scenario: View transactions by category

**Given** category "Alimentação" with category_id 1
**And** 20 transactions assigned to this category
**When** the user requests transactions for category_id 1
**Then** all 20 transactions are returned
**And** each transaction has category_id = 1
