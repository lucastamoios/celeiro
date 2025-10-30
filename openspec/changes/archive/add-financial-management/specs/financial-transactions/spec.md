# Financial Transactions Specification

## ADDED Requirements

### OFX Import

Users can import bank transactions by uploading OFX files from their financial institutions.

#### Scenario: Import OFX file with 100 transactions

**Given** an authenticated user with account_id 10
**When** they upload a valid OFX file containing 100 transactions
**Then** the system parses the OFX file successfully
**And** 100 transactions are inserted into the transactions table
**And** each transaction has the correct account_id, date, amount, and description
**And** the response indicates "100 transactions imported, 0 duplicates"

#### Scenario: Re-import same OFX file (deduplication)

**Given** an account with account_id 10
**And** the account already has transactions with FITIDs: "ABC123", "DEF456"
**When** the user re-uploads the same OFX file
**Then** no duplicate transactions are created
**And** the unique constraint on (account_id, ofx_fitid) prevents duplicates
**And** the response indicates "0 transactions imported, 2 duplicates skipped"

### Transaction Classification

Transactions can be manually classified into categories or auto-classified via rules.

#### Scenario: Manually classify transaction

**Given** an unclassified transaction with transaction_id 500
**When** the user assigns category_id 3 ("Alimentação")
**Then** the transaction.category_id is updated to 3
**And** the transaction.is_classified is set to true
**And** the transaction appears in the category's transaction list

#### Scenario: Auto-classify via rule

**Given** a classification rule: "description LIKE '%UBER%' → category_id 2 (Transporte)"
**And** a new transaction with description "UBER TRIP SAO PAULO"
**When** the classification service processes the transaction
**Then** the transaction is automatically assigned category_id 2
**And** the transaction.is_classified is set to true

### Transaction Queries

Users can view, filter, and aggregate their transactions.

#### Scenario: List transactions by date range

**Given** an account with 200 transactions spanning January to December
**When** the user queries transactions from March 1 to March 31
**Then** only transactions within that date range are returned
**And** results are sorted by transaction_date DESC

#### Scenario: Get monthly spending summary

**Given** an account with transactions totaling -R$5,000 in expenses for April
**When** the user requests the monthly summary for April
**Then** the response includes total_spent: 5000.00
**And** the response includes transaction_count: 50
**And** the response includes spending_by_category breakdown
