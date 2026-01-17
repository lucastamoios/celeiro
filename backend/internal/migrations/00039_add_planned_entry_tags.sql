-- +goose Up
-- Junction table for many-to-many relationship between planned_entries and tags
-- Tags on planned entries will be transferred to transactions when matched

CREATE TABLE planned_entry_tags (
    planned_entry_tag_id SERIAL PRIMARY KEY,
    planned_entry_id INT NOT NULL REFERENCES planned_entries(planned_entry_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planned_entry_id, tag_id)
);

CREATE INDEX idx_planned_entry_tags_planned_entry_id ON planned_entry_tags(planned_entry_id);
CREATE INDEX idx_planned_entry_tags_tag_id ON planned_entry_tags(tag_id);

-- +goose Down
DROP TABLE IF EXISTS planned_entry_tags CASCADE;
