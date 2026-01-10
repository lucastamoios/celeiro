# System Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, Chi router, SQLX |
| Frontend | React 19, Vite, Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache/Sessions | Redis 7 |
| Observability | Grafana, Loki, OpenTelemetry |

## System Overview

```mermaid
flowchart TB
    subgraph Frontend
        React[React 19 + Vite]
    end

    subgraph Backend
        Handler[Handler Layer]
        Service[Service Layer]
        Repo[Repository Layer]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end

    React -->|HTTP/JSON| Handler
    Handler --> Service
    Service --> Repo
    Repo --> PG
    Handler -.->|Sessions| Redis
```

## Backend Layers

```mermaid
flowchart LR
    A[HTTP Request] --> B[Handler]
    B --> C[Service]
    C --> D[Repository]
    D --> E[(Database)]
```

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Handler | HTTP parsing, validation, auth | `internal/web/` |
| Service | Business logic, orchestration | `internal/application/` |
| Repository | Data access, single table only | `internal/application/*/repository.go` |

## Domain Model

```mermaid
erDiagram
    User ||--|| Organization : "belongs to"
    Organization ||--o{ Account : has
    Account ||--o{ Transaction : contains
    Transaction }o--o| Category : "classified by"
    Category ||--o{ CategoryBudget : "budgeted per month"
    Category ||--o{ PlannedEntry : "expected expenses"
    Category ||--o{ AdvancedPattern : "matched by"
```

## API Routes

All financial endpoints under `/financial` require authentication.

| Resource | Endpoints |
|----------|-----------|
| Categories | GET, POST, PATCH `/financial/categories` |
| Accounts | GET, POST `/financial/accounts` |
| Transactions | GET, POST import, PATCH `/financial/accounts/{id}/transactions` |
| Budgets | GET, POST, PUT `/financial/budgets/categories` |
| Patterns | GET, POST, PUT, DELETE `/financial/patterns` |

## Data Flow: OFX Import

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant H as Handler
    participant S as Service
    participant R as Repository
    participant DB as PostgreSQL

    FE->>H: POST /import (OFX file)
    H->>S: ImportTransactionsFromOFX
    S->>S: Parse OFX
    S->>R: BulkInsert
    R->>DB: INSERT ON CONFLICT DO NOTHING
    DB-->>FE: {inserted, skipped}
```

## Pattern Matching Flow

```mermaid
flowchart LR
    TX[New Transaction] --> PM[Pattern Matcher]
    PM --> AP[Advanced Patterns]
    AP -->|regex match| CAT[Assign Category]
    AP -->|no match| SP[Saved Patterns]
    SP -->|similarity| CAT
    SP -->|no match| UC[Uncategorized]
```

## Security

| Aspect | Implementation |
|--------|----------------|
| Authentication | Passwordless magic codes (4-digit, 10min expiry) |
| Sessions | Redis-stored, UUID tokens |
| Headers | `Authorization: Bearer <token>`, `X-Active-Organization: <id>` |
| Data isolation | All queries scoped by organization_id |
