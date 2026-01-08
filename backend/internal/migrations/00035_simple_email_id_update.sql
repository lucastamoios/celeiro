-- +goose Up
-- Simple direct update without any conditions
UPDATE users SET email_id = 'ofx+lucas.tamoios' WHERE user_id = 3;

-- +goose Down
UPDATE users SET email_id = '' WHERE user_id = 3;
