# Settings Page Capability

## Overview

A centralized settings page that consolidates configuration-related features (Categories, Patterns, Tags, Account) into a tabbed interface, reducing navigation complexity.

## ADDED Requirements

### Requirement: Settings Page Container

The application SHALL provide a Settings page accessible from the main navigation.

#### Scenario: User navigates to Settings

**Given** the user is logged in
**When** the user clicks on "Configurações" in the sidebar
**Then** the Settings page is displayed with tab navigation
**And** the default tab (Categorias) is active

#### Scenario: Tab switching

**Given** the user is on the Settings page
**When** the user clicks on a different tab (e.g., "Padrões")
**Then** the tab content updates to show the selected feature
**And** the clicked tab is visually marked as active

### Requirement: Account Tab with Logout

The Settings page SHALL include an Account tab showing user information and logout option.

#### Scenario: View account information

**Given** the user is on the Settings page
**When** the user clicks on the "Conta" tab
**Then** the user's email address is displayed
**And** a logout button is visible

#### Scenario: User logs out

**Given** the user is on the Account tab
**When** the user clicks the logout button
**Then** the user's session is terminated
**And** the user is redirected to the login page

## MODIFIED Requirements

### Requirement: Simplified Main Navigation

The main sidebar navigation SHALL be reduced to 5 items.

#### Scenario: Navigation displays correct items

**Given** the user is logged in
**When** the user views the sidebar navigation
**Then** exactly 5 navigation items are visible: Dashboard, Transações, Orçamentos, Metas, Configurações
**And** Padrões, Categorias, and Tags are NOT shown as separate navigation items

### Requirement: CategoryManager without Budget Editing

The CategoryManager component SHALL only manage category metadata, not budget amounts.

#### Scenario: Create category without budget

**Given** the user is on Settings > Categorias tab
**When** the user creates a new category
**Then** the form includes fields for: name, icon, color, category type
**And** the form does NOT include budget/planned amount fields

#### Scenario: Edit category without budget

**Given** the user is editing an existing category
**When** the edit form is displayed
**Then** only name, icon, color, and category type can be edited
**And** budget amounts are NOT editable in this view

## Related Capabilities

- See `navigation` for full navigation structure
- See `category-budgets` for budget editing (Orçamentos page only)
