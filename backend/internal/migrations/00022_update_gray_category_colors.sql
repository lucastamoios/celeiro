-- +goose Up
-- +goose StatementBegin

-- Update gray categories with random colors from a nice palette
-- Colors: Amber, Blue, Pink, Lime, Violet, Teal, Orange, Red, Emerald, Indigo, Fuchsia, Cyan, Purple
WITH color_palette AS (
    SELECT unnest(ARRAY[
        '#F59E0B', -- Amber
        '#3B82F6', -- Blue
        '#EC4899', -- Pink
        '#84CC16', -- Lime
        '#8B5CF6', -- Violet
        '#14B8A6', -- Teal
        '#F97316', -- Orange
        '#EF4444', -- Red
        '#10B981', -- Emerald
        '#6366F1', -- Indigo
        '#F472B6', -- Fuchsia
        '#06B6D4', -- Cyan
        '#A855F7'  -- Purple
    ]) AS color
),
numbered_colors AS (
    SELECT color, row_number() OVER () AS rn
    FROM color_palette
),
gray_categories AS (
    SELECT category_id, row_number() OVER (ORDER BY category_id) AS rn
    FROM categories
    WHERE color IN ('#6B7280', '#808080', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', 'gray', '#gray')
       OR color IS NULL
       OR color = ''
)
UPDATE categories c
SET color = nc.color
FROM gray_categories gc
JOIN numbered_colors nc ON ((gc.rn - 1) % 13) + 1 = nc.rn
WHERE c.category_id = gc.category_id;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Revert to gray (though this loses the random assignment)
UPDATE categories
SET color = '#6B7280'
WHERE color IN (
    '#F59E0B', '#3B82F6', '#EC4899', '#84CC16', '#8B5CF6',
    '#14B8A6', '#F97316', '#EF4444', '#10B981', '#6366F1',
    '#F472B6', '#06B6D4', '#A855F7'
);

-- +goose StatementEnd
