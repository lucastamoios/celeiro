# 🚀 Celeiro - Startup Guide

## Prerequisites

- Go 1.24+
- Docker + Docker Compose
- PostgreSQL client (psql)

## Quick Start
This repo is meant to be run via Docker Compose.

```bash
cd backend
cp .envrc .env.dev
make up
```

Services:
- Frontend: http://localhost:13000
- Backend API: http://localhost:9090
- Postgres: localhost:54330
- Redis: localhost:63800

## Quick Test Workflow

Here's a complete workflow to test the financial management system:

```bash
# 1. Request magic code
curl -X POST http://localhost:9090/auth/request/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","organization_name":"Test Org"}'

# 2. Check local mailer or logs for the 4-digit code, then authenticate
curl -X POST http://localhost:9090/auth/validate/ \
  -H "Content-Type: application/json" \
  -d '{"code":"1234","email":"test@example.com"}'

# 3. Save the token
export TOKEN="your-token-here"

# 4. List system categories
curl -X GET http://localhost:9090/financial/categories \
  -H "Authorization: Bearer $TOKEN"

# 5. Create an account
curl -X POST http://localhost:9090/financial/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conta Corrente",
    "account_type": "checking",
    "bank_name": "Banco do Brasil"
  }'

# 6. Save the account_id from response
export ACCOUNT_ID=1

# 7. Upload OFX file
curl -X POST "http://localhost:9090/financial/accounts/$ACCOUNT_ID/transactions/import" \
  -H "Authorization: Bearer $TOKEN" \
  -F "ofx_file=@/path/to/your/file.ofx"

# 8. View imported transactions
curl -X GET "http://localhost:9090/financial/accounts/$ACCOUNT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN"
```

## API Endpoints

### Authentication

#### Request Magic Link
```bash
POST /auth/request/
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Test User",
  "organization_name": "My Organization"
}
```

#### Authenticate
```bash
POST /auth/validate/
Content-Type: application/json

{
  "code": "123456",  # From magic link email (check console logs)
  "email": "user@example.com"
}

# Returns: { "token": "session-token-here" }
```

### Financial Endpoints

#### List Categories
```bash
GET /financial/categories
Authorization: Bearer <token>
```

#### Create Account
```bash
POST /financial/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Checking Account",
  "account_type": "checking",
  "bank_name": "Banco do Brasil",
  "balance": 5000.00,
  "currency": "BRL"
}
```

#### Upload OFX File
```bash
POST /financial/accounts/:accountId/transactions/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

# File: ofx_file (your .ofx file)
```

#### List Transactions
```bash
GET /financial/accounts/:accountId/transactions?limit=50&offset=0
Authorization: Bearer <token>
```

## Testing Flow

### 1. Create a User and Get Token

```bash
# Request magic code
curl -X POST http://localhost:9090/auth/request/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "organization_name": "Test Org"
  }'

# Check local mailer or logs for the magic code (4 digits)
# Then authenticate
curl -X POST http://localhost:9090/auth/validate/ \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1234",
    "email": "test@example.com"
  }'

# Save the returned token
export TOKEN="your-token-here"
```

### 2. Create an Account

```bash
curl -X POST http://localhost:9090/financial/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conta Corrente",
    "account_type": "checking",
    "bank_name": "Banco do Brasil"
  }'

# Save the returned account_id
export ACCOUNT_ID=1
```

### 3. Upload OFX File

```bash
curl -X POST "http://localhost:9090/financial/accounts/$ACCOUNT_ID/transactions/import" \
  -H "Authorization: Bearer $TOKEN" \
  -F "ofx_file=@/path/to/your/file.ofx"
```

### 4. View Transactions

```bash
curl -X GET "http://localhost:9090/financial/accounts/$ACCOUNT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN"
```

## Database Access

### Connect to PostgreSQL

```bash
make dbshell

# Or manually:
PGPASSWORD=celeiro_password psql -h localhost -p 54330 -U celeiro_user -d celeiro_db
```

### Useful Queries

```sql
-- View all categories
SELECT * FROM categories ORDER BY is_system DESC, name;

-- View all accounts
SELECT account_id, name, account_type, balance FROM accounts;

-- View recent transactions
SELECT
  t.transaction_id,
  t.description,
  t.amount,
  t.transaction_date,
  c.name as category
FROM transactions t
LEFT JOIN categories c ON c.category_id = t.category_id
ORDER BY t.transaction_date DESC
LIMIT 20;

-- Check budget summary
SELECT
  b.name,
  b.month,
  b.year,
  b.budget_type,
  b.amount,
  COUNT(bi.budget_item_id) as item_count
FROM budgets b
LEFT JOIN budget_items bi ON bi.budget_id = b.budget_id
GROUP BY b.budget_id
ORDER BY b.year DESC, b.month DESC;
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if postgres is running
docker ps | grep celeiro_postgres

# Restart postgres
docker restart celeiro_postgres

# View logs
docker logs celeiro_postgres
```

### Reset Database

```bash
# Stop and remove postgres
docker stop celeiro_postgres && docker rm celeiro_postgres

# Start fresh
docker run -d \
  --name celeiro_postgres \
  -e POSTGRES_USER=celeiro_user \
  -e POSTGRES_PASSWORD=celeiro_password \
  -e POSTGRES_DB=celeiro_db \
  -p 54330:5432 \
  postgres:16-alpine

sleep 5
make migrate
```

### Build Issues

```bash
# Clean build
go clean
go mod tidy
go build ./...
```

## Development

### Run Tests

```bash
# All tests
make test

# Financial module only
go test -v ./internal/application/financial/...

# With coverage
go test -cover ./internal/application/financial/...
```

### Hot Reload

The project uses `air` for hot reloading during development:

```bash
make run

# Any code changes will automatically restart the server
```

## Next Steps

1. ✅ Database is running
2. ✅ Migrations applied
3. ✅ Categories seeded
4. 🔄 Create user and account
5. 🔄 Upload first OFX file
6. 🔄 View imported transactions
7. 📊 Create budget and classification rules

## Support

- Check logs: `docker logs celeiro_postgres`
- Server logs: Console output from `make run`
- Database queries: Use `make dbshell`
