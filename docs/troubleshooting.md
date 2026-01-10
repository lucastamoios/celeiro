# Troubleshooting

## Startup Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| `make up` fails | Ports in use | Check `lsof -i :9090`, `lsof -i :13000` |
| Missing .env.dev | No env file | Run `make env` |
| PostgreSQL connection refused | Container not running | `docker restart celeiro_postgres` |

## Backend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Migrations fail | Bad migration | `make migrate.rollback` then `make migrate` |
| 401 Unauthorized | Missing headers | Add `Authorization` and `X-Active-Organization` headers |
| 500 Internal Error | Unknown | Check `docker logs -f celeiro_backend` |

## Frontend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Blank page | JS error | Check browser console (F12) |
| CORS error | Wrong port | Check VITE_API_URL in frontend/.env |
| Login fails | Email issue | Check backend logs, or backend/localmailer/ for local mail |

## Database Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Can't connect | Container down | `docker ps`, then `docker restart celeiro_postgres` |
| Data not showing | Wrong org | Check organization_id matches in queries |
| Duplicates on import | Different FITIDs | Check OFX file has consistent FITIDs |

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `pq: relation "X" does not exist` | Missing table | `make migrate` |
| `duplicate key value violates unique constraint` | Duplicate data | Check unique constraints |
| `context deadline exceeded` | Timeout | Check DB connection |
| `redis: connection refused` | Redis down | `docker start celeiro_redis` |
| `session not found` | Expired token | Re-authenticate |

## Debug Steps

1. Check container logs: `docker logs celeiro_backend`
2. Check database: `make dbshell`
3. Check recent commits: `git log --oneline -10`

## Full Reset

```
make down
docker volume prune
make up
make migrate
```
