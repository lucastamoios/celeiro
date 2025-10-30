# Financial Accounts Specification

## ADDED Requirements

### Account Management

Users can create and manage bank accounts (checking, savings, credit cards) within their organization.

#### Scenario: Create checking account

**Given** an authenticated user with a valid organization
**When** they create an account with name "Nubank Checking" and type "checking"
**Then** the account is created with a unique account_id
**And** the account is linked to both user_id and organization_id
**And** the account appears in the user's account list

#### Scenario: Prevent cross-organization access

**Given** user A in organization 1 with account_id 100
**And** user B in organization 2
**When** user B attempts to access account_id 100
**Then** the request is denied with 403 Forbidden
**And** no account data is returned

### Account Types

The system supports three types of accounts: checking, savings, and credit.

#### Scenario: Create credit card account

**Given** an authenticated user
**When** they create an account with type "credit"
**Then** the account is created successfully
**And** the account_type is stored as "credit"
**And** transactions for this account can be imported

### Account Lifecycle

Users can update and delete their accounts with proper data cleanup.

#### Scenario: Delete account with transactions

**Given** an account with account_id 100
**And** the account has 50 transactions
**When** the user deletes the account
**Then** all 50 transactions are deleted (CASCADE)
**And** the account is removed from the database
**And** the account no longer appears in the user's list
