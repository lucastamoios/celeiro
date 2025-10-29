-- +goose Up

CREATE TABLE roles (
    role_name VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    permission VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    role_name VARCHAR(255) NOT NULL REFERENCES roles(role_name),
    permission VARCHAR(255) NOT NULL REFERENCES permissions(permission),

    UNIQUE (role_name, permission)
);

INSERT INTO roles
(role_name) VALUES
('admin'),
('regular_manager'),
('regular_user');


INSERT INTO permissions
(permission) VALUES
-- Admin
('view_organizations'),
('edit_organizations'),
('create_organizations'),
('delete_organizations'),

-- Regular Manager
('view_regular_users'),
('edit_regular_users'),
('create_regular_users'),
('delete_regular_users');

INSERT INTO role_permissions
(role_name, permission) VALUES
('regular_manager', 'view_regular_users'),
('regular_manager', 'edit_regular_users'),
('regular_manager', 'create_regular_users'),
('regular_manager', 'delete_regular_users');

-- +goose Down
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;
TRUNCATE TABLE roles;

DROP TABLE roles;
DROP TABLE permissions;
DROP TABLE role_permissions;
