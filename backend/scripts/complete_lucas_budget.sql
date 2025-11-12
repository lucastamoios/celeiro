-- ============================================================================
-- Complete Lucas's Budget Data (Remaining Categories and Entries)
-- ============================================================================

\set user_id 1
\set org_id 1

-- Insert remaining categories (that don't exist yet)
INSERT INTO categories (name, icon, is_system, user_id)
SELECT * FROM (VALUES
    ('Receita', '💰', false, 1),
    ('Caixa', '🏦', false, 1),
    ('Saque Economias', '💸', false, 1),
    ('Economias', '💎', false, 1),
    ('Dívidas', '💳', false, 1),
    ('Mercado', '🛒', false, 1),
    ('TV/Internet/Telefone', '📱', false, 1),
    ('Empresa', '💼', false, 1),
    ('Cuidados pessoais', '💅', false, 1),
    ('Estilo de vida', '✨', false, 1),
    ('Bares e Restaurantes', '🍽️', false, 1),
    ('Pessoal - Saque', '💵', false, 1),
    ('Compras - Essenciais', '🛍️', false, 1),
    ('Compras - Supérfluos', '🎁', false, 1),
    ('Compras - Não Recorrente', '📦', false, 1),
    ('Presentes e doações', '🎁', false, 1)
) AS new_cats(name, icon, is_system, user_id)
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.name = new_cats.name
    AND (c.user_id = new_cats.user_id OR (c.user_id IS NULL AND c.is_system = true))
);

-- Get all category IDs
CREATE TEMP TABLE cat_ids AS
SELECT category_id, name FROM categories WHERE user_id = 1 OR is_system = true;

-- Insert remaining planned entries
INSERT INTO planned_entries (
    user_id, organization_id, category_id,
    description, amount, is_recurrent, expected_day, is_active
)
SELECT
    1, 1, c.category_id,
    e.description, e.amount, e.is_recurrent, e.expected_day, true
FROM (VALUES
    -- Remaining entries not yet inserted
    ('Caixa', 'Caixa', 700.00, false, NULL),
    ('Cuidados pessoais', 'Salão Lucas', 35.00, true, NULL),
    ('Dívidas', 'Dinheiro Mãe', 12200.00, false, 3),
    ('Dívidas', 'Cartão Nubank', 8886.13, false, 5),
    ('Economias', 'Reserva Emergência', 1000.00, true, NULL),
    ('Economias', 'Investimento', 2000.00, true, NULL),
    ('Educação', 'Escola', 2500.00, true, NULL),
    ('Educação', 'Livros', 300.00, false, NULL),
    ('Empresa', 'Reserva', 0.00, true, NULL),
    ('Empresa', 'Férias Dardi', 505.00, false, 5),
    ('Empresa', 'Salário Dardiane', 2300.00, true, NULL),
    ('Empresa', 'Contador', 350.00, true, NULL),
    ('Empresa', 'Coworking', 300.00, true, NULL),
    ('Empresa', 'Impostos FGTS + INSS', 622.56, true, NULL),
    ('Empresa', 'Impostos - Simples', 2259.82, true, NULL),
    ('Empresa', 'MEI', 80.00, true, NULL),
    ('Estilo de vida', 'Seguro de Vida', 235.62, true, NULL),
    ('Estilo de vida', 'Seguro de Vida - NuBank', 23.98, true, NULL),
    ('Presentes e doações', 'Dinha', 300.00, true, NULL),
    ('Presentes e doações', 'Arautos', 260.00, true, NULL),
    ('Presentes e doações', 'Opus Dei', 0.00, true, NULL),
    ('Presentes e doações', 'Dízimo Carmelo', 400.00, true, NULL),
    ('Receita', 'Lucros CatruTech', 4100.00, false, 5),
    ('Receita', 'Salário', 45840.25, true, 5),
    ('Saúde', 'Plano de saúde (último mês unim)', 1372.70, false, NULL),
    ('Saúde', 'Terapia', 220.00, true, NULL),
    ('Saúde', 'Personal Raquel', 600.00, true, NULL),
    ('Saúde', 'Muay Thai', 390.00, true, NULL),
    ('Saúde', 'Avelar (Seguro)', 123.00, true, NULL),
    ('TV/Internet/Telefone', 'Google One', 7.99, true, NULL),
    ('TV/Internet/Telefone', 'Conta VIVO Raquel', 95.00, true, NULL),
    ('TV/Internet/Telefone', 'Apple', 14.90, true, NULL),
    ('TV/Internet/Telefone', 'Jetbrains', 138.73, true, NULL),
    ('TV/Internet/Telefone', 'Conta VIVO Lucas', 45.00, true, NULL),
    ('TV/Internet/Telefone', 'Internet', 109.90, true, NULL),
    ('TV/Internet/Telefone', 'ChatGPT', 130.00, true, NULL),
    ('TV/Internet/Telefone', 'Apple iCloud', 49.90, true, NULL),
    ('TV/Internet/Telefone', 'Deezer', 34.90, true, NULL),
    ('TV/Internet/Telefone', 'YouTube', 32.90, true, NULL),
    ('TV/Internet/Telefone', 'Apple storage Lucas', 14.90, true, NULL),
    ('TV/Internet/Telefone', 'Google Photos', 11.99, true, NULL),
    ('TV/Internet/Telefone', 'Amazon Prime', 19.90, true, NULL),
    ('TV/Internet/Telefone', 'Cursor', 120.00, true, NULL)
) AS e(category_name, description, amount, is_recurrent, expected_day)
JOIN cat_ids c ON c.name = e.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM planned_entries pe
    WHERE pe.description = e.description
    AND pe.user_id = 1
);

-- Insert category budgets for November 2025
INSERT INTO category_budgets (user_id, organization_id, category_id, month, year, budget_type, planned_amount)
SELECT
    1, 1, c.category_id, 11, 2025,
    b.budget_type, b.planned_amount
FROM (VALUES
    ('Receita', 'fixed', 0.00),
    ('Caixa', 'fixed', 0.00),
    ('Saque Economias', 'fixed', 0.00),
    ('Economias', 'fixed', 3000.00),
    ('Dívidas', 'fixed', 0.00),
    ('Moradia', 'maior', 8500.00),
    ('Mercado', 'maior', 3500.00),
    ('Educação', 'maior', 300.00),
    ('Saúde', 'maior', 3000.00),
    ('Transporte', 'maior', 2000.00),
    ('TV/Internet/Telefone', 'maior', 900.00),
    ('Empresa', 'maior', 5800.00),
    ('Cuidados pessoais', 'maior', 300.00),
    ('Estilo de vida', 'maior', 370.00),
    ('Bares e Restaurantes', 'maior', 1500.00),
    ('Pessoal - Saque', 'maior', 100.00),
    ('Compras - Essenciais', 'maior', 2000.00),
    ('Compras - Supérfluos', 'maior', 1200.00),
    ('Compras - Não Recorrente', 'fixed', 0.00),
    ('Presentes e doações', 'fixed', 0.00)
) AS b(category_name, budget_type, planned_amount)
JOIN cat_ids c ON c.name = b.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM category_budgets cb
    WHERE cb.category_id = c.category_id
    AND cb.month = 11 AND cb.year = 2025 AND cb.user_id = 1
);

-- Summary
\echo '============================================================================'
\echo 'Data Loading Complete!'
\echo '============================================================================'
\echo ''
SELECT 'Total Categories:' as metric, COUNT(*)::text as value FROM categories WHERE user_id = 1 OR is_system = true
UNION ALL
SELECT 'Total Planned Entries:', COUNT(*)::text FROM planned_entries WHERE user_id = 1
UNION ALL
SELECT 'Recurring Entries:', COUNT(*)::text FROM planned_entries WHERE user_id = 1 AND is_recurrent = true
UNION ALL
SELECT 'One-time Entries:', COUNT(*)::text FROM planned_entries WHERE user_id = 1 AND is_recurrent = false
UNION ALL
SELECT 'November Budgets:', COUNT(*)::text FROM category_budgets WHERE user_id = 1 AND month = 11 AND year = 2025;
