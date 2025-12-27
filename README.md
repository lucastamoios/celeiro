# Celeiro - Sistema de Gestão Financeira Pessoal

> Um sistema de controle financeiro pessoal com importação OFX, classificação automática e orçamentos flexíveis.

## 🎯 Visão Rápida

**Problema**: Gerenciar finanças pessoais é tedioso - múltiplas contas, classificação manual, sem controle de orçamento.

**Solução**: Importa OFX → Classifica automaticamente → Controla orçamentos por categoria.

## 📚 Documentação

- **[product.md](./product.md)** - Visão de produto, features e decisões de negócio
- **[docs/setup.md](./docs/setup.md)** - Guia de instalação e configuração
- **[docs/architecture.md](./docs/architecture.md)** - Arquitetura do sistema e padrões de design
- **[docs/database.md](./docs/database.md)** - Modelo de dados completo (auth + financeiro)
- **[docs/auth-system.md](./docs/auth-system.md)** - Sistema de autenticação e RBAC
- **[docs/development.md](./docs/development.md)** - Workflow de desenvolvimento e convenções
- **[docs/testing.md](./docs/testing.md)** - Estratégia de testes e exemplos

## 📁 Estrutura do Projeto

```
celeiro/
├── backend/              # API Go + PostgreSQL
│   ├── cmd/             # Entry points
│   ├── internal/        # Código privado da aplicação
│   │   ├── domain/      # Entidades e interfaces
│   │   ├── repository/  # Acesso a dados
│   │   ├── service/     # Lógica de negócio
│   │   └── web/         # HTTP handlers
│   ├── migrations/      # SQL migrations (Goose)
│   └── pkg/             # Código reutilizável
│       └── ofx/         # Parser OFX
├── frontend/            # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── services/    # API clients
│   │   └── types/       # TypeScript types
│   └── public/
├── docs/                # Documentação
└── openspec/            # Especificações OpenSpec (mudanças em openspec/changes/)
```

## 🚀 Quick Start

Fluxo recomendado (Docker):

```bash
make up
```

Acesse http://localhost:13000

👉 **Guia completo**: [docs/setup.md](./docs/setup.md)

## 🏗️ Arquitetura

**Backend:** Repository → Service → Handler (Go + PostgreSQL + SQLX)
**Frontend:** React + TypeScript + Tailwind CSS
**DevOps:** Docker + GitHub Actions

👉 **Detalhes completos**: [docs/architecture.md](./docs/architecture.md)

## 📊 Modelo de Dados

```
users → accounts → transactions → categories → budgets → budget_items
                                             ↘ classification_rules
```

**Principais decisões:**
- Serial IDs (não UUID) para performance
- FITID único por conta previne duplicatas
- Budget com 3 tipos: fixo, calculado, híbrido
- Raw OFX em JSONB para auditoria

👉 **Schema completo**: [docs/database.md](./docs/database.md)

## 🛠️ Desenvolvimento

**Workflow:** OpenSpec (proposal/change) → Implementação → Review

```bash
# Comandos principais
make test                         # Rodar testes backend
npm test                          # Rodar testes frontend
```

👉 **Guia completo**: [docs/development.md](./docs/development.md)
👉 **Convenções**: [CLAUDE.md](./CLAUDE.md)

## 🧪 Testes

```bash
# Backend
make test           # Unit + Integration tests
make test-coverage  # Coverage report (target: >80%)

# Frontend
npm test            # Jest + React Testing Library
npm test -- --coverage
```

👉 **Estratégia completa**: [docs/testing.md](./docs/testing.md)

## 📝 Tech Stack

**Backend:** Go 1.24, Chi, PostgreSQL 16, Redis, SQLX, Goose
**Frontend:** React 18, TypeScript, Tailwind CSS, Vite
**Auth:** Passwordless (magic codes via email)
**DevOps:** Docker, GitHub Actions
**AI Tools:** OpenSpec, Claude Code

👉 **Convenções de código**: [docs/development.md](./docs/development.md)
👉 **Regras de serviço**: [CLAUDE.md](./CLAUDE.md) - Services Architecture
👉 **Sistema de auth**: [docs/auth-system.md](./docs/auth-system.md)

## 🐛 Troubleshooting

```bash
# Backend não inicia
docker ps | grep postgres  # Verificar PostgreSQL
docker logs celeiro-postgres
make down
docker volume prune  # Careful: removes all unused volumes
make up

# Migrations falham
make migrate.rollback

# Frontend sem dados
curl -i localhost:9090/accounts/me/  # Testar backend
cat frontend/.env  # Verificar VITE_API_URL
```

👉 **Mais soluções**: [docs/setup.md#troubleshooting](./docs/setup.md#troubleshooting)

## 🤝 Contribuindo

1. Criar especificação no OpenSpec
2. Implementar seguindo [docs/development.md](./docs/development.md)
3. Garantir que testes passam
4. Criar PR com descrição clara

## 📄 Licença

Proprietário - Lucas Tamoios
