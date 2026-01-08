# Deployment Guide

How the application is deployed and infrastructure is managed.

## Deployment Flow

### Application Deployment (Automatic)

**Push to `master` → GitHub Actions → Deployed**

1. Push code to `master` branch
2. GitHub Actions builds Docker images:
   - `celeiro-backend` - Go backend
   - `celeiro-frontend` - React app (nginx)
   - `celeiro-backoffice` - Admin panel (nginx)
3. Images pushed to GitHub Container Registry (ghcr.io)
4. Staging server pulls new images automatically

**No manual steps needed** for application code changes.

### Infrastructure Deployment (Manual)

For Caddy config, environment variables, or server setup changes:

```bash
cd ~/Code/Work/vodsafe
git checkout dev
# Make changes to infra/
git commit -m "chore: update caddy config"
git push origin dev
make master-staging
```

**Staging**: `make master-staging`
**Production**: `make master-production`

---

## Infrastructure Architecture

### Reverse Proxy (Caddy)

Caddy handles HTTPS and routing in production. Config location:

```
vodsafe/infra/roles/master/templates/Caddyfile.j2
```

**Routing rules**:
```
celeiro.catru.tech
├── /auth/*           → backend:9080
├── /accounts/*       → backend:9080
├── /financial/*      → backend:9080
├── /organizations/*  → backend:9080
├── /invites/*        → backend:9080
├── /webhooks/*       → backend:9080
└── /*                → frontend:9081
```

**Important**: To add new backend routes, add the path to `@api` matcher in Caddyfile.j2.

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Caddy (Host)                                               │
│  - HTTPS termination                                        │
│  - Route to containers                                      │
└─────────────────────────────────────────────────────────────┘
        │
        ├─────────────────────────────────────────────────────┐
        │                                                     │
        ▼                                                     ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────┐
│ celeiro_      │  │ celeiro_      │  │ celeiro_      │  │ celeiro_│
│ backend:9080  │  │ frontend:9081 │  │ backoffice:   │  │postgres │
│ (Go)          │  │ (nginx)       │  │ 9082 (nginx)  │  │         │
└───────────────┘  └───────────────┘  └───────────────┘  └─────────┘
```

**Note**: nginx inside frontend/backoffice is for serving static files only. Caddy handles external routing.

---

## Staging Environment

| Service | URL |
|---------|-----|
| Frontend | https://celeiro.catru.tech |
| Backoffice | https://bo.celeiro.catru.tech |
| API | https://celeiro.catru.tech/financial/* |

### SSH Access

```bash
ssh vodsafe@staging.vodsafe.com
# or
ssh master-staging  # if configured in ~/.ssh/config
```

### Viewing Logs

```bash
ssh vodsafe@staging.vodsafe.com
docker logs -f celeiro_backend
docker logs -f celeiro_frontend
docker logs -f celeiro_postgres
```

### Manual Container Restart

```bash
ssh vodsafe@staging.vodsafe.com
cd /var/celeiro
docker compose pull
docker compose up -d
```

---

## GitHub Actions Workflow

Location: `.github/workflows/docker-publish.yml`

**Triggers**: Push to `master`

**Jobs**:
1. `build-frontend` - Build and push frontend image
2. `build-backend` - Build and push backend image
3. `build-backoffice` - Build and push backoffice image

**Images**:
- `ghcr.io/lucastamoios/celeiro-backend:latest`
- `ghcr.io/lucastamoios/celeiro-frontend:latest`
- `ghcr.io/lucastamoios/celeiro-backoffice:latest`

---

## Environment Variables

### Production (managed by ansible)

Environment file: `/var/celeiro/.env`

Set in `vodsafe/infra/roles/celeiro/templates/celeiro.env.j2`

Key variables:
```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://celeiro.catru.tech
```

### Adding New Variables

1. Add to `vodsafe/infra/roles/celeiro/templates/celeiro.env.j2`
2. Add secret to vault if sensitive: `vodsafe/vault.yml`
3. Run `make master-staging` to deploy

---

## External Services

### Resend (Email)

**Dashboard**: https://resend.com/emails

**Sending emails**: Standard API for magic links, invites

**Receiving emails (webhooks)**:
- Endpoint: `POST /webhooks/email/inbound`
- Domain: `mail.celeiro.catru.tech`
- Signature verification: Svix (HMAC-SHA256)

**API Endpoints**:
- Sent email attachments: `GET /emails/:id/attachments/:id`
- Received email attachments: `GET /emails/receiving/:id/attachments/:id`

**Testing webhooks**:
1. Go to Resend dashboard → Emails → Select email
2. Click "Replay" to resend webhook

---

## Common Operations

### Deploy Code Change

```bash
git push origin master
# Wait for GitHub Actions (~2 min)
# Auto-deployed to staging
```

### Update Caddy Config

```bash
cd ~/Code/Work/vodsafe
git checkout dev
# Edit infra/roles/master/templates/Caddyfile.j2
git add -A && git commit -m "chore: update caddy"
git push origin dev
make master-staging
```

### Add New Backend Route

1. Add route in `backend/internal/web/router.go`
2. If new path prefix, add to Caddyfile.j2 `@api` matcher
3. Push to master (auto-deploys backend)
4. If Caddyfile changed, run `make master-staging` from vodsafe repo

### View Production Logs

```bash
ssh vodsafe@staging.vodsafe.com
docker logs -f celeiro_backend --tail 100
```

### Force Pull New Images

```bash
ssh vodsafe@staging.vodsafe.com
cd /var/celeiro
docker compose pull
docker compose up -d
```

---

## Troubleshooting

### 405 Method Not Allowed from nginx

**Cause**: Request hitting frontend nginx instead of backend

**Fix**: Add path to Caddy's `@api` matcher in Caddyfile.j2

### 502 Bad Gateway

**Cause**: Backend container not running

**Fix**:
```bash
ssh vodsafe@staging.vodsafe.com
docker logs celeiro_backend
docker restart celeiro_backend
```

### Changes Not Reflected

**Cause**: Old Docker image cached

**Fix**:
```bash
ssh vodsafe@staging.vodsafe.com
docker compose pull
docker compose up -d
```

---

## Related Repos

| Repo | Purpose |
|------|---------|
| `celeiro` | Application code (this repo) |
| `vodsafe` | Infrastructure (ansible, Caddyfile) |
