-- +goose Up
ALTER TABLE patterns
    ADD COLUMN action TEXT NOT NULL DEFAULT 'categorize';

ALTER TABLE patterns
    ALTER COLUMN target_description DROP NOT NULL,
    ALTER COLUMN target_category_id DROP NOT NULL;

ALTER TABLE patterns
    ADD CONSTRAINT patterns_action_valid
        CHECK (action IN ('categorize', 'ignore')),
    ADD CONSTRAINT patterns_action_targets_valid
        CHECK (
            (action = 'categorize' AND target_description IS NOT NULL AND target_category_id IS NOT NULL)
            OR
            (action = 'ignore' AND target_description IS NULL AND target_category_id IS NULL)
        ),
    ADD CONSTRAINT patterns_ignore_not_retroactive
        CHECK (action <> 'ignore' OR apply_retroactively = FALSE);

-- +goose Down
DELETE FROM patterns WHERE action = 'ignore';

ALTER TABLE patterns
    DROP CONSTRAINT IF EXISTS patterns_ignore_not_retroactive,
    DROP CONSTRAINT IF EXISTS patterns_action_targets_valid,
    DROP CONSTRAINT IF EXISTS patterns_action_valid;

ALTER TABLE patterns
    ALTER COLUMN target_description SET NOT NULL,
    ALTER COLUMN target_category_id SET NOT NULL;

ALTER TABLE patterns
    DROP COLUMN action;
