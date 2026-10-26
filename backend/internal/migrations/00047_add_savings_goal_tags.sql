-- +goose Up
-- Junction table for many-to-many relationship between savings_goals and tags.
-- Tags configured on a goal are copied onto the planned entries it generates,
-- and from there transfer to transactions when matched.

CREATE TABLE savings_goal_tags (
    savings_goal_tag_id SERIAL PRIMARY KEY,
    savings_goal_id INT NOT NULL REFERENCES savings_goals(savings_goal_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(savings_goal_id, tag_id)
);

CREATE INDEX idx_savings_goal_tags_savings_goal_id ON savings_goal_tags(savings_goal_id);
CREATE INDEX idx_savings_goal_tags_tag_id ON savings_goal_tags(tag_id);

-- +goose Down
DROP TABLE IF EXISTS savings_goal_tags CASCADE;
