# Celeiro - Personal Finance Management System

## Overview

Celeiro is a personal finance management system that allows importing bank statements via OFX format, automatically classifying transactions through customizable rules, and managing monthly budgets by category.

The name "Celeiro" (Portuguese for "barn") reflects the idea of **storing and organizing resources** in a structured way, just as a barn stores grain for future use.

## Problem Statement

Users face difficulties with:
1. **Consolidating financial data**: Multiple bank accounts across different institutions
2. **Manually classifying expenses**: Tedious and error-prone process
3. **Controlling budgets**: Lack of visibility into spending by category
4. **Understanding spending patterns**: No structured history

## Solution

A web system that offers:
- **Automatic import** of OFX statements (credit and debit)
- **Smart classification** through customizable rules
- **Flexible budgets** by category (fixed, calculated, or hybrid)
- **Consolidated view** of monthly expenses
- **Structured history** for pattern analysis

## Usage Model

### Current Version (MVP): Individual Use
- **1 user = 1 organization** (created automatically on first login)
- Fully personal and private experience
- All accounts, transactions, and budgets belong to the user

### Future Version: Shared Use
- **Multi-user** within the same organization (e.g., couples, families)
- **Shared accounts** visible to all members
- **Role-based permissions** (admin vs view-only)
- **Individual or shared budgets**

**Migration:** The system is already prepared for multi-user, but the interface is focused on individual experience for now.

## Core Features (MVP)

### 1. Bank Account Management
- Manual account creation (name, type: checking/savings/credit)
- Multiple accounts per user
- **MVP simplification**: Credit and debit are treated as the same account (credit purchase = immediate debit)
- **Future**: Support for installments and deferred debits

### 2. Transaction Import (OFX)
- Manual OFX file upload
- Automatic transaction parsing
- Duplicate detection via OFX `FITID`
- Support for multiple imports (incremental)
- **Separate files**: One OFX for credit, another for debit (even if same account)

### 3. Transaction Categorization
- **Default system categories**: Food, Transportation, Housing, Health, Education, Leisure, Other
- User-created custom categories
- **Manual classification**: Screen with table of unclassified transactions
- **Automatic rule system** based on:
  - Description (regex/contains)
  - Amount (ranges)
  - Date (day of week, period of month)
  - Combinations (AND/OR)
- Rule priority (first match wins)

### 4. Monthly Budgets
- Budget creation by category + month/year
- **Three budget types**:
  - **Fixed**: User-defined amount (e.g., R$500 for Food)
  - **Calculated**: Sum of planned items (e.g., Netflix R$50 + Spotify R$30 = R$80)
  - **Hybrid**: Higher value between fixed and calculated
- If no budget is defined: inherits actual value from previous month (or zero if first month)
- **Budget items** (planned expenses) are optional

### 5. Visualization and Control
- Monthly dashboard with:
  - Spending by category vs budget
  - Visual status (OK/Warning/Over) — Values above 0.5% without a purpose are considered Warning
  - Total spent vs total budgeted
- Transaction list with filters:
  - By period
  - By category
  - By account
  - Classified vs unclassified

## Key Product Decisions

### Why manual OFX instead of Open Banking?
**Security and control**: Open Banking requires bank credentials or complex integrations. Manual OFX is:
- More secure (user downloads from bank and uploads)
- Simpler (no integration maintenance)
- More reliable (banks always support OFX)

### Why credit = immediate debit?
**Cognitive simplicity**: Most users think "I spent today" even if they pay later. Avoids the complexity of:
- Invoice reconciliation
- "Pending" transactions
- Cash flow vs accrual accounting

When needed, we'll add installments/deferral as an optional feature.

### Why no automatic sync?
**Privacy and acceptable latency**: Manual import once a week is sufficient for 95% of cases. Avoids:
- Storing bank credentials
- API maintenance complexity
- Banking integration costs

## Tech Stack

### Backend
- **Language**: Go 1.24+
- **Framework**: Chi (HTTP router)
- **Database**: PostgreSQL 16 (primary) + Redis (sessions)
- **ORM**: SQLX + pgx (direct SQL, no heavy ORM)
- **Migrations**: Goose
- **Auth**: Passwordless (magic codes via email)
- **Tests**: Testcontainers

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **State**: Native Context API

### DevOps
- **Containers**: Docker + Docker Compose
- **Observability**: OpenTelemetry + Grafana + Loki
- **CI/CD**: GitHub Actions

### AI Development Tools
- **Specs**: OpenSpec (spec-driven development)
- **Tasks**: Beads (issue tracking for coding agents)
- **Coding Agent**: Claude Code

## Authentication and Security

### Passwordless System
- **No passwords**: Login via 4-digit code sent by email
- **Magic codes**: Temporary codes (10-minute validity)
- **Auto-registration**: New users created automatically on first login
- **Sessions**: Managed via Redis with secure tokens

### Access Control
- **RBAC** (Role-Based Access Control)
- **Roles**: admin, regular_manager, regular_user
- **Permissions**: Granular action control (view, edit, create, delete)
- **Organizations**: Data isolation between different organizations

**Technical details:** See [docs/auth-system.md](./docs/auth-system.md)

## Glossary

- **OFX (Open Financial Exchange)**: Standard file format for financial data exchange
- **FITID**: Unique transaction identifier in OFX format (prevents duplicates)
- **Classification Rule**: Automatic rule to assign categories to transactions
- **Budget Item**: Individual item within a calculated budget (e.g., "Netflix R$50")
- **Vertical Slice**: Complete feature implementation (database → API → UI)
