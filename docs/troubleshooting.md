# Troubleshooting Guide

Common issues and their solutions.

## Startup Issues

### Docker services won't start

**Symptom**: `make up` fails or containers exit immediately

**Solutions**:
```bash
# Check if ports are in use
lsof -i :9090   # Backend
lsof -i :13000  # Frontend
lsof -i :54330  # Postgres
lsof -i :63800  # Redis

# View container logs
docker logs celeiro_backend
docker logs celeiro_postgres

# Full reset
cd backend
make down
docker volume prune  # Careful: removes all unused volumes
make up
```

### Missing .env.dev file

**Symptom**: `Missing .env.dev file!` error

**Solution**:
```bash
cd backend
cp .envrc .env.dev
```

### PostgreSQL connection refused

**Symptom**: `connection refused` or `could not connect to server`

**Solutions**:
```bash
# Check if postgres container is running
docker ps | grep celeiro_postgres

# View postgres logs
docker logs celeiro_postgres

# Restart postgres
docker restart celeiro_postgres

# Wait for postgres to be ready, then retry
sleep 5 && make migrate
```

---

## Backend Issues

### Migrations fail

**Symptom**: `goose` migration errors

**Solutions**:
```bash
# Check migration status
cd backend
goose -dir ./internal/migrations postgres "$DATABASE_URL" status

# View specific migration
cat internal/migrations/XXXXX_name.sql

# Rollback last migration
make migrate.rollback

# Full reset (DESTROYS DATA)
make migrate.reset
make migrate
```

### Handler returns 401 Unauthorized

**Symptom**: All API calls return 401

**Checklist**:
1. Check `Authorization: Bearer <token>` header
2. Check `X-Active-Organization: <id>` header
3. Verify session exists in Redis:
   ```bash
   docker exec -it celeiro_redis redis-cli
   > KEYS session:*
   ```
4. Check if token expired (sessions have TTL)

### Handler returns 500 Internal Server Error

**Symptom**: API returns 500 with no useful message

**Solutions**:
```bash
# Check backend logs
docker logs -f celeiro_backend

# Enable debug logging
# In .env.dev: LOG_LEVEL=debug
# Then restart: make restart
```

---

## Frontend Issues

### Blank page / React errors

**Symptom**: White screen or console errors

**Checklist**:
1. Check browser console (F12 -> Console)
2. Check network tab for failed API calls
3. Verify `VITE_API_URL` in `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:9090
   ```
4. Clear browser cache and hard refresh

### API calls fail with CORS error

**Symptom**: `Access-Control-Allow-Origin` errors in console

**Cause**: Usually frontend running on different port than expected

**Solutions**:
- Ensure backend CORS allows your frontend origin
- Check `backend/internal/web/router.go` CORS configuration
- Verify `VITE_API_URL` matches backend port

### Login doesn't work

**Symptom**: Magic code never arrives or validation fails

**Checklist**:
1. Check if using local mailer:
   ```bash
   cat backend/.env.dev | grep MAILER_TYPE
   # If MAILER_TYPE=local, check:
   ls backend/localmailer/
   cat backend/localmailer/*.eml  # View sent emails
   ```
2. Check backend logs for email sending errors
3. Verify email format is valid (no typos)

---

## Database Issues

### Can't connect to database

**Symptom**: Connection errors from app or psql

**Solutions**:
```bash
# Check postgres is running
docker ps | grep celeiro_postgres

# Check port mapping
docker port celeiro_postgres

# Connect manually
PGPASSWORD=celeiro_password psql -h localhost -p 54330 -U celeiro_user -d celeiro_db
```

### Data not showing up

**Symptom**: Created data doesn't appear in lists

**Checklist**:
1. Check organization ID matches:
   ```sql
   SELECT * FROM accounts WHERE organization_id = 1;
   SELECT * FROM transactions WHERE account_id IN (SELECT account_id FROM accounts WHERE organization_id = 1);
   ```
2. Verify user has access to organization:
   ```sql
   SELECT * FROM user_organizations WHERE user_id = 1;
   ```
3. Check `is_ignored` flag for transactions:
   ```sql
   SELECT * FROM transactions WHERE is_ignored = false;
   ```

### Duplicate transaction on import

**Symptom**: Same transaction appears multiple times

**Note**: This should NOT happen due to `UNIQUE (account_id, ofx_fitid)` constraint.

**Check**:
```sql
SELECT ofx_fitid, COUNT(*)
FROM transactions
WHERE account_id = X
GROUP BY ofx_fitid
HAVING COUNT(*) > 1;
```

If duplicates exist, the OFX file has different FITIDs for same transaction.

---

## Testing Issues

### Tests fail with connection error

**Symptom**: `connection refused` in test output

**Solution**: Tests require running database
```bash
cd backend
make up        # Start services
make test      # Run tests
```

### Tests fail with "table does not exist"

**Symptom**: SQL errors about missing tables

**Solution**: Run migrations before tests
```bash
cd backend
make migrate
make test
```

---

## Performance Issues

### Slow transaction list

**Symptom**: `/financial/accounts/{id}/transactions` is slow

**Checklist**:
1. Check for missing indexes:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM transactions WHERE account_id = X ORDER BY transaction_date DESC LIMIT 50;
   ```
2. Add pagination if fetching too many records
3. Check if `idx_transactions_account_date` index exists

### Slow budget calculations

**Symptom**: Budget dashboard loads slowly

**Cause**: Aggregating many transactions

**Solutions**:
1. Pre-aggregate with monthly snapshots
2. Check for N+1 queries in logs
3. Limit date range in query

---

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `pq: relation "X" does not exist` | Missing table | Run `make migrate` |
| `pq: duplicate key value violates unique constraint` | Inserting duplicate | Check unique constraints |
| `context deadline exceeded` | Timeout | Check DB connection, query performance |
| `redis: connection refused` | Redis not running | `docker start celeiro_redis` |
| `session not found` | Expired/invalid token | Re-authenticate |

---

## Getting Help

1. **Check logs first**:
   ```bash
   docker logs celeiro_backend 2>&1 | tail -50
   ```

2. **Check database state**:
   ```bash
   cd backend && make dbshell
   ```

3. **Review recent changes**:
   ```bash
   git log --oneline -10
   git diff HEAD~5
   ```
