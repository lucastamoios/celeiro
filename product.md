# Celeiro - Sistema de Gestão Financeira Pessoal

## Visão Geral

Celeiro é um sistema de controle financeiro pessoal que permite importar extratos bancários via formato OFX, classificar transações automaticamente através de regras customizáveis, e gerenciar orçamentos mensais por categoria.

O nome "Celeiro" reflete a ideia de **armazenar e organizar recursos** de forma estruturada, assim como um celeiro agrícola guarda grãos para uso futuro.

## Problema que Resolve

Usuários enfrentam dificuldades em:
1. **Consolidar dados financeiros**: Múltiplas contas bancárias em diferentes instituições
2. **Classificar gastos manualmente**: Processo tedioso e propenso a erros
3. **Controlar orçamentos**: Falta de visibilidade sobre gastos por categoria
4. **Entender padrões de consumo**: Ausência de histórico estruturado

## Solução

Sistema web que oferece:
- **Importação automática** de extratos OFX (crédito e débito)
- **Classificação inteligente** através de regras customizáveis
- **Orçamentos flexíveis** por categoria (fixos, calculados ou híbridos)
- **Visão consolidada** de gastos mensais
- **Histórico estruturado** para análise de padrões

## Modelo de Uso

### Versão Atual (MVP): Uso Individual
- **1 usuário = 1 organização** (criada automaticamente no primeiro login)
- Experiência totalmente pessoal e privada
- Todas as contas, transações e orçamentos pertencem ao usuário

### Versão Futura: Uso Compartilhado
- **Multi-usuário** dentro da mesma organização (ex: casais, famílias)
- **Contas compartilhadas** visíveis para todos os membros
- **Permissões por função** (administrador vs visualização)
- **Orçamentos individuais ou compartilhados**

**Migração:** Sistema já preparado para multi-usuário, mas interface focada em experiência individual por enquanto.

## Features Core (MVP)

### 1. Gestão de Contas Bancárias
- Cadastro manual de contas (nome, tipo: corrente/poupança/crédito)
- Múltiplas contas por usuário
- **Simplificação MVP**: Crédito e débito são tratados como mesma conta (compra no crédito = débito imediato)
- **Futuro**: Suporte a parcelamento e postergação de débito

### 2. Importação de Transações (OFX)
- Upload manual de arquivos OFX
- Parse automático de transações
- Detecção de duplicatas via `FITID` do OFX
- Suporte a múltiplas importações (incremental)
- **Arquivos separados**: Um OFX para crédito, outro para débito (mesmo que mesma conta)

### 3. Categorização de Transações
- **Categorias padrão do sistema**: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros
- Criação de categorias customizadas pelo usuário
- **Classificação manual**: Tela com tabela de transações não classificadas
- **Sistema de regras automáticas** baseado em:
  - Descrição (regex/contains)
  - Valor (ranges)
  - Data (dia da semana, período do mês)
  - Combinações (AND/OR)
- Prioridade de regras (primeira que bater ganha)

### 4. Orçamentos Mensais
- Criação de orçamento por categoria + mês/ano
- **Três tipos de orçamento**:
  - **Fixo**: Valor definido pelo usuário (ex: R$ 500 em Alimentação)
  - **Calculado**: Soma de itens previstos (ex: Netflix R$50 + Spotify R$30 = R$80)
  - **Híbrido**: Maior valor entre fixo e calculado
- Se não houver orçamento definido: herda valor real do mês anterior (ou zero se primeiro mês)
- **Budget items** (gastos previstos) são opcionais

### 5. Visualização e Controle
- Dashboard mensal com:
  - Gastos por categoria vs orçamento
  - Status visual (OK/Warning/Over) - Valores acima de 0.5% sem finalidade é considerado Warning
  - Total gasto vs total orçado
- Lista de transações com filtros:
  - Por período
  - Por categoria
  - Por conta
  - Classificadas vs não classificadas

## Decisões de Produto Importantes

### Por que OFX manual e não Open Banking?
**Segurança e controle**: Open Banking requer credenciais bancárias ou integrações complexas. OFX manual é:
- Mais seguro (usuário baixa do banco e faz upload)
- Mais simples (sem manutenção de integrações)
- Mais confiável (bancos sempre suportam OFX)

### Por que crédito = débito imediato?
**Simplicidade cognitiva**: Maioria dos usuários pensa "gastei hoje" mesmo se pagar depois. Evita complexidade de:
- Conciliação de faturas
- Transações "pendentes"
- Fluxo de caixa vs competência

Quando necessário, adicionaremos parcelamento/postergação como feature opcional.

### Por que não sincronização automática?
**Privacidade e latência aceitável**: Importação manual 1x por semana é suficiente para 95% dos casos. Evita:
- Armazenar credenciais bancárias
- Complexidade de manutenção de APIs
- Custos de integrações bancárias

## Stack Técnica

### Backend
- **Linguagem**: Go 1.24+
- **Framework**: Chi (HTTP router)
- **Database**: PostgreSQL 16 (principal) + Redis (sessões)
- **ORM**: SQLX + pgx (SQL direto, sem ORM pesado)
- **Migrations**: Goose
- **Auth**: Passwordless (magic codes via email)
- **Tests**: Testcontainers

### Frontend
- **Framework**: React 18+ com TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **State**: Native Context API

### DevOps
- **Containers**: Docker + Docker Compose
- **Observability**: OpenTelemetry + Grafana + Loki
- **CI/CD**: GitHub Actions

### Ferramentas de Desenvolvimento com IA
- **Specs**: OpenSpec (spec-driven development)
- **Tasks**: Beads (issue tracking para coding agents)
- **Coding Agent**: Claude Code

## Autenticação e Segurança

### Sistema Passwordless
- **Sem senhas**: Login via código de 4 dígitos enviado por email
- **Magic codes**: Códigos temporários (10 minutos de validade)
- **Auto-registro**: Novos usuários criados automaticamente no primeiro login
- **Sessões**: Gerenciadas via Redis com tokens seguros

### Controle de Acesso
- **RBAC** (Role-Based Access Control)
- **Funções**: admin, regular_manager, regular_user
- **Permissões**: Controle granular de ações (view, edit, create, delete)
- **Organizações**: Isolamento de dados entre organizações diferentes

**Detalhes técnicos:** Ver [docs/auth-system.md](./docs/auth-system.md)

## Glossário

- **OFX (Open Financial Exchange)**: Formato padrão de arquivo para troca de dados financeiros
- **FITID**: Identificador único de transação no formato OFX (evita duplicatas)
- **Classification Rule**: Regra automática para atribuir categoria a transações
- **Budget Item**: Item individual dentro de um orçamento calculado (ex: "Netflix R$50")
- **Vertical Slice**: Implementação completa de uma feature (banco → API → UI)
