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
- [CLI para o sistema](https://github.com/charmbracelet/bubbletea)
- Flags and environment variables
- Migration System
- Folder structure (to be clarified when making the first services)
- Login/Register/Magic Link
	- Esquema geral do Service/Repository/Handler
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

Some services are common enough so we can just create then beforehand.

**Account service**
- Organization
- User
- Role
- Authorization
- Authentication


### Notas de Estilo

- Os verbos Fetch, Insert, Modify, Destroy ficam reservados á métodos de repository e é obrigatório usá-los como prefixo sempre que possível.


1. Algo é atualizado na DB que atualiza user (permissions etc.)
2. NeedsRevalidate = true na Session (InvalidateSession)
3. Middleware recusa se needsRevalidate = true e retorna 402 + código de erro específico
4. Front revalida a sessão e continua.