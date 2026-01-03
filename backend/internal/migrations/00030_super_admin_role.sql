-- +goose Up

-- Add super_admin role for system-wide administration
INSERT INTO roles (role_name) VALUES ('super_admin');

-- Add system-wide permissions for backoffice
INSERT INTO permissions (permission) VALUES
('view_all_users'),
('create_system_invites'),
('view_all_organizations');

-- Grant all existing permissions to super_admin
INSERT INTO role_permissions (role_name, permission)
SELECT 'super_admin', permission FROM permissions;

-- +goose Down
DELETE FROM role_permissions WHERE role_name = 'super_admin';
DELETE FROM permissions WHERE permission IN ('view_all_users', 'create_system_invites', 'view_all_organizations');
DELETE FROM roles WHERE role_name = 'super_admin';
