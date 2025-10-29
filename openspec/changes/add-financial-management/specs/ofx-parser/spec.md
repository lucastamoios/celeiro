# OFX Parser Specification

## ADDED Requirements

### OFX 1.x Parsing (SGML Format)

The parser can extract transaction data from OFX 1.x files (SGML-based).

#### Scenario: Parse OFX 1.x checking account file

**Given** a valid OFX 1.x file with SGML format
**And** the file contains 50 checking account transactions
**When** the parser processes the file
**Then** 50 transactions are extracted
**And** each transaction includes:
  - FITID (unique transaction ID)
  - DTPOSTED (transaction date)
  - TRNAMT (transaction amount)
  - NAME or MEMO (description)
  - TRNTYPE (DEBIT, CREDIT, etc.)

#### Scenario: Parse OFX 1.x with special characters

**Given** an OFX 1.x file with transactions containing:
  - Accented characters: "Pão de Açúcar"
  - Special symbols: "R$ 50,00"
**When** the parser processes the file
**Then** all special characters are preserved correctly
**And** transaction descriptions match the original data

### OFX 2.x Parsing (XML Format)

The parser can extract transaction data from OFX 2.x files (XML-based).

#### Scenario: Parse OFX 2.x credit card file

**Given** a valid OFX 2.x file with XML format
**And** the file contains 75 credit card transactions
**When** the parser processes the file
**Then** 75 transactions are extracted
**And** all transaction fields are parsed correctly
**And** XML namespaces are handled properly

### Format Auto-Detection

The parser automatically detects OFX version and uses the appropriate parsing strategy.

#### Scenario: Auto-detect OFX 1.x

**Given** a file starting with "OFXHEADER:100" (OFX 1.x marker)
**When** the parser analyzes the file
**Then** the parser identifies the format as OFX 1.x
**And** the SGML parsing strategy is used

#### Scenario: Auto-detect OFX 2.x

**Given** a file starting with "<?xml version" (XML marker)
**When** the parser analyzes the file
**Then** the parser identifies the format as OFX 2.x
**And** the XML parsing strategy is used

### Error Handling

The parser gracefully handles malformed OFX files and provides useful error messages.

#### Scenario: Parse malformed OFX file

**Given** an OFX file with invalid XML structure
**When** the parser attempts to process the file
**Then** the parser returns an error
**And** the error message indicates "Invalid OFX format"
**And** the raw OFX data is stored in raw_ofx_data for debugging

#### Scenario: Parse OFX with missing required fields

**Given** an OFX file with transactions missing FITID
**When** the parser processes the file
**Then** the parser returns an error
**And** the error message indicates "Missing required field: FITID"

### Transaction Data Extraction

The parser extracts all relevant transaction fields for storage.

#### Scenario: Extract complete transaction data

**Given** a valid OFX file with a transaction:
  - FITID: "2025010112345"
  - DTPOSTED: "20250101120000"
  - TRNAMT: "-150.50"
  - NAME: "RESTAURANT ABC"
  - TRNTYPE: "DEBIT"
**When** the parser processes this transaction
**Then** the extracted transaction has:
  - ofx_fitid: "2025010112345"
  - transaction_date: 2025-01-01
  - amount: -150.50
  - description: "RESTAURANT ABC"
  - transaction_type: "DEBIT"

#### Scenario: Handle missing optional fields

**Given** an OFX transaction with FITID and TRNAMT but no NAME
**When** the parser processes the transaction
**Then** the transaction is extracted successfully
**And** the description field uses MEMO if available
**And** the description field is empty string if both NAME and MEMO are missing
