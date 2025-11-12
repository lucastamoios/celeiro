-- ============================================================================
-- Seed Script: Lucas's Real Budget Data
-- ============================================================================
-- This script populates categories, category budgets, and planned entries
-- based on the real spreadsheet data from November 2025
--
-- Usage:
--   psql -h localhost -p 54330 -U celeiro_user -d celeiro_db -f seed_lucas_budget.sql
--
-- Note: Update user_id and organization_id as needed (currently using 1)
-- ============================================================================

\set user_id 1
\set org_id 1
\set current_month 11
\set current_year 2025

-- ============================================================================
-- 1. Create Categories (if they don't exist)
-- ============================================================================

-- Get or create categories with proper icons
INSERT INTO categories (name, icon, is_system, user_id)
VALUES
    ('Receita', '💰', false, :user_id),
    ('Caixa', '🏦', false, :user_id),
    ('Saque Economias', '💸', false, :user_id),
    ('Economias', '💎', false, :user_id),
    ('Dívidas', '💳', false, :user_id),
    ('Moradia', '🏠', false, :user_id),
    ('Mercado', '🛒', false, :user_id),
    ('Educação', '📚', false, :user_id),
    ('Saúde', '🏥', false, :user_id),
    ('Transporte', '🚗', false, :user_id),
    ('TV/Internet/Telefone', '📱', false, :user_id),
    ('Empresa', '💼', false, :user_id),
    ('Cuidados pessoais', '💅', false, :user_id),
    ('Estilo de vida', '✨', false, :user_id),
    ('Bares e Restaurantes', '🍽️', false, :user_id),
    ('Pessoal - Saque', '💵', false, :user_id),
    ('Compras - Essenciais', '🛍️', false, :user_id),
    ('Compras - Supérfluos', '🎁', false, :user_id),
    ('Compras - Não Recorrente', '📦', false, :user_id),
    ('Presentes e doações', '🎁', false, :user_id)
ON CONFLICT (name, COALESCE(user_id, 0)) DO NOTHING;

-- ============================================================================
-- 2. Create Category Budgets for November 2025
-- ============================================================================

-- Helper: Get category_id by name
CREATE TEMP TABLE category_lookup AS
SELECT category_id, name FROM categories WHERE user_id = :user_id OR is_system = true;

-- Insert category budgets with the correct budget_type
-- budget_type: 'fixed', 'calculated', or 'maior'
INSERT INTO category_budgets (user_id, organization_id, category_id, month, year, budget_type, planned_amount)
SELECT
    :user_id,
    :org_id,
    c.category_id,
    :current_month,
    :current_year,
    budget_data.budget_type,
    budget_data.planned_amount
FROM (VALUES
    -- (category_name, budget_type, planned_amount)
    ('Receita', 'fixed', 0.00),
    ('Caixa', 'fixed', 0.00),
    ('Saque Economias', 'fixed', 0.00),
    ('Economias', 'fixed', 3000.00),
    ('Dívidas', 'fixed', 0.00),
    ('Moradia', 'maior', 8500.00),      -- R$ 8.500,00 (usar o maior entre fixo e calculado)
    ('Mercado', 'maior', 3500.00),       -- R$ 3.500,00
    ('Educação', 'maior', 300.00),       -- R$ 300,00
    ('Saúde', 'maior', 3000.00),         -- R$ 3.000,00
    ('Transporte', 'maior', 2000.00),    -- R$ 2.000,00
    ('TV/Internet/Telefone', 'maior', 900.00),   -- R$ 900,00
    ('Empresa', 'maior', 5800.00),       -- R$ 5.800,00
    ('Cuidados pessoais', 'maior', 300.00),      -- R$ 300,00
    ('Estilo de vida', 'maior', 370.00), -- R$ 370,00
    ('Bares e Restaurantes', 'maior', 1500.00),  -- R$ 1.500,00
    ('Pessoal - Saque', 'maior', 100.00),        -- R$ 100,00
    ('Compras - Essenciais', 'calculated', 0.00),    -- Calculated (no fixed)
    ('Compras - Supérfluos', 'calculated', 0.00),    -- Calculated (no fixed)
    ('Compras - Não Recorrente', 'fixed', 0.00),
    ('Presentes e doações', 'fixed', 0.00)
) AS budget_data(category_name, budget_type, planned_amount)
JOIN category_lookup c ON c.name = budget_data.category_name
ON CONFLICT (user_id, organization_id, category_id, month, year)
DO UPDATE SET
    budget_type = EXCLUDED.budget_type,
    planned_amount = EXCLUDED.planned_amount,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. Create Planned Entries (Recurring and One-time)
-- ============================================================================

-- Insert all planned entries from the spreadsheet
-- For recurring entries: is_recurrent = true, expected_day = day of month
-- For one-time: is_recurrent = false, parent_entry_id = NULL

INSERT INTO planned_entries (
    user_id,
    organization_id,
    category_id,
    description,
    amount,
    is_recurrent,
    expected_day,
    is_active,
    is_saved_pattern
)
SELECT
    :user_id,
    :org_id,
    c.category_id,
    entry_data.description,
    entry_data.amount,
    entry_data.is_recurrent,
    entry_data.expected_day,
    true,
    entry_data.is_saved_pattern
FROM (VALUES
    -- (category_name, description, amount, is_recurrent, expected_day, is_saved_pattern)

    -- Caixa
    ('Caixa', 'Caixa', 700.00, false, NULL, false),

    -- Cuidados pessoais
    ('Cuidados pessoais', 'Salão Lucas', 35.00, true, NULL, false),

    -- Dívidas
    ('Dívidas', 'Dinheiro Mãe', 12200.00, false, 3, false),
    ('Dívidas', 'Cartão Nubank', 8886.13, false, 5, false),

    -- Economias
    ('Economias', 'Reserva Emergência', 1000.00, true, NULL, false),
    ('Economias', 'Investimento', 2000.00, true, NULL, false),

    -- Educação
    ('Educação', 'Escola', 2500.00, true, NULL, false),
    ('Educação', 'Livros', 300.00, false, NULL, false),

    -- Empresa
    ('Empresa', 'Reserva', 0.00, true, NULL, false),
    ('Empresa', 'Férias Dardi', 505.00, false, 5, false),
    ('Empresa', 'Salário Dardiane', 2300.00, true, NULL, false),
    ('Empresa', 'Contador', 350.00, true, NULL, false),
    ('Empresa', 'Coworking', 300.00, true, NULL, false),
    ('Empresa', 'Impostos FGTS + INSS', 622.56, true, NULL, false),
    ('Empresa', 'Impostos - Simples', 2259.82, true, NULL, false),
    ('Empresa', 'MEI', 80.00, true, NULL, false),

    -- Estilo de vida
    ('Estilo de vida', 'Seguro de Vida', 235.62, true, NULL, false),
    ('Estilo de vida', 'Seguro de Vida - NuBank', 23.98, true, NULL, false),

    -- Moradia
    ('Moradia', 'Reserva IPTU', 100.00, true, NULL, false),
    ('Moradia', 'Parcela da Caixa', 7500.00, true, 5, false),
    ('Moradia', 'Conta de Energia Elétrica', 485.58, true, NULL, false),
    ('Moradia', 'Conta de Água', 360.55, true, NULL, false),
    ('Moradia', 'Condomínio', 310.00, true, NULL, false),
    ('Moradia', 'Conserto Leds escada', 951.00, false, 4, false),

    -- Presentes e doações
    ('Presentes e doações', 'Dinha', 300.00, true, NULL, false),
    ('Presentes e doações', 'Arautos', 260.00, true, NULL, false),
    ('Presentes e doações', 'Opus Dei', 0.00, true, NULL, false),
    ('Presentes e doações', 'Dízimo Carmelo', 400.00, true, NULL, false),

    -- Receita
    ('Receita', 'Lucros CatruTech', 4100.00, false, 5, false),
    ('Receita', 'Salário', 45840.25, true, 5, false),

    -- Saúde
    ('Saúde', 'Plano de saúde (último mês unim)', 1372.70, false, NULL, false),
    ('Saúde', 'Terapia', 220.00, true, NULL, false),
    ('Saúde', 'Personal Raquel', 600.00, true, NULL, false),
    ('Saúde', 'Muay Thai', 390.00, true, NULL, false),
    ('Saúde', 'Avelar (Seguro)', 123.00, true, NULL, false),
    ('Saúde', 'Natação Crianças', 611.75, true, NULL, false),
    ('Saúde', 'Plano Amil', 1200.00, true, NULL, false),

    -- Transporte
    ('Transporte', 'IPVA', 500.00, true, NULL, false),
    ('Transporte', 'Seguro Carro', 500.00, true, NULL, false),

    -- TV/Internet/Telefone
    ('TV/Internet/Telefone', 'Google One', 7.99, true, NULL, false),
    ('TV/Internet/Telefone', 'Conta VIVO Raquel', 95.00, true, NULL, false),
    ('TV/Internet/Telefone', 'Apple', 14.90, true, NULL, false),
    ('TV/Internet/Telefone', 'Jetbrains', 138.73, true, NULL, false),
    ('TV/Internet/Telefone', 'Conta VIVO Lucas', 45.00, true, NULL, false),
    ('TV/Internet/Telefone', 'Internet', 109.90, true, NULL, false),
    ('TV/Internet/Telefone', 'ChatGPT', 130.00, true, NULL, false),
    ('TV/Internet/Telefone', 'Apple iCloud', 49.90, true, NULL, false),
    ('TV/Internet/Telefone', 'Deezer', 34.90, true, NULL, false),
    ('TV/Internet/Telefone', 'YouTube', 32.90, true, NULL, false),
    ('TV/Internet/Telefone', 'Apple storage Lucas', 14.90, true, NULL, false),
    ('TV/Internet/Telefone', 'Google Photos', 11.99, true, NULL, false),
    ('TV/Internet/Telefone', 'Amazon Prime', 19.90, true, NULL, false),
    ('TV/Internet/Telefone', 'Cursor', 120.00, true, NULL, false)
) AS entry_data(category_name, description, amount, is_recurrent, expected_day, is_saved_pattern)
JOIN category_lookup c ON c.name = entry_data.category_name;

-- ============================================================================
-- Summary Report
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'Seed Script Completed Successfully!'
\echo '============================================================================'
\echo ''
\echo 'Categories created/updated:'
SELECT COUNT(*) AS category_count FROM categories WHERE user_id = :user_id OR is_system = true;

\echo ''
\echo 'Category budgets for November 2025:'
SELECT
    c.name AS category,
    cb.budget_type,
    cb.planned_amount
FROM category_budgets cb
JOIN categories c ON c.category_id = cb.category_id
WHERE cb.user_id = :user_id
  AND cb.month = :current_month
  AND cb.year = :current_year
ORDER BY c.name;

\echo ''
\echo 'Planned entries created:'
SELECT COUNT(*) AS entry_count FROM planned_entries WHERE user_id = :user_id;

\echo ''
\echo 'Recurring vs One-time breakdown:'
SELECT
    is_recurrent,
    COUNT(*) as count
FROM planned_entries
WHERE user_id = :user_id
GROUP BY is_recurrent;

\echo ''
\echo '============================================================================'
\echo 'Next Steps:'
\echo '1. Visit your frontend to see the budgets: http://localhost:13000'
\echo '2. Generate monthly instances for recurring entries'
\echo '3. Create patterns for transaction matching'
\echo '============================================================================'
