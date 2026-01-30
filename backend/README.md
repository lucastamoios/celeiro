# Scaffold

This project is meant to be used as a model for other projects. We can also just copy paste parts of it that are needed.

## Tech Debt
 This is a backlog and also a To Do list

 - [ ] Add the tracer to the database, using the query's title (first line) as the span name
 - [ ] When logging the internal errors we should also log other things like user IP, and as much information as possible

## Content

### Backend

- Database accessor
    - Make it easier to get the query
- [Background Jobs](https://github.com/hibiken/asynq)
- Authentication
- Logs/Metrics/Trace
- [System CLI](https://github.com/charmbracelet/bubbletea)
- Flags and environment variables
- Migration System
- Folder structure (to be clarified when making the first services)
- Login/Register/Magic Link
	- General Service/Repository/Handler schema
- Integration Test (no login)
- Makefile
- Testing with testcontainers

If we want to create some templates, instead of just a copy-paste structure, we can try using [this lib](https://pkg.go.dev/text/template).
We may follow [this project standard](https://github.com/golang-standards/project-layout).

### Infra
- Ansible scripts
	- iptables
	- docker
	- configure ssh (have a centralize repository for the keys)
- Docker
- CI
    - Deploy
    - Staging
    - Backup
- Grafana
    - Loki
    - Tempo
    - Prometheus
    - OTEL Collector
- Posthog
- Redis
- Postgres
- Asinq [dashboard](https://github.com/hibiken/asynq)

### Services

Some services are common enough so we can just create them beforehand.

**Account service**
- Organization
- User
- Role
- Authorization
- Authentication


### Style Notes

- The verbs Fetch, Insert, Modify, Destroy are reserved for repository methods and must be used as prefixes whenever possible.


1. Something is updated in the DB that affects the user (permissions, etc.)
2. NeedsRevalidate = true on the Session (InvalidateSession)
3. Middleware rejects if needsRevalidate = true and returns 402 + specific error code
4. Frontend revalidates the session and continues.
