-- +goose Up

-- System invites for backoffice: creates user + organization
CREATE TABLE system_invites (
    invite_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by_user_id INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP DEFAULT NULL,

    UNIQUE(email)
);

CREATE INDEX idx_system_invites_token ON system_invites(token);
CREATE INDEX idx_system_invites_email ON system_invites(email);

-- +goose Down
DROP TABLE IF EXISTS system_invites;
