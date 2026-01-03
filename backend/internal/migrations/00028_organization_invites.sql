-- +goose Up
-- +goose StatementBegin
CREATE TABLE organization_invites (
    invite_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL REFERENCES roles(role_name),
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by_user_id INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP DEFAULT NULL,

    UNIQUE(organization_id, email)
);

CREATE INDEX idx_organization_invites_token ON organization_invites(token);
CREATE INDEX idx_organization_invites_email ON organization_invites(email);
CREATE INDEX idx_organization_invites_org ON organization_invites(organization_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS organization_invites;
-- +goose StatementEnd
