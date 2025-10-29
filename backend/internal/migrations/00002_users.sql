-- +goose Up
CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    name VARCHAR(255),

    address VARCHAR(255) DEFAULT '',
    city VARCHAR(255) DEFAULT '',
    state VARCHAR(255) DEFAULT '',
    zip VARCHAR(255) DEFAULT '',
    country VARCHAR(255) DEFAULT '',
    latitude NUMERIC(10,8) DEFAULT 0,
    longitude NUMERIC(11,8) DEFAULT 0
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT 'User',
    phone INTEGER DEFAULT 0,

    address VARCHAR(255) DEFAULT '',
    city VARCHAR(255) DEFAULT '',
    state VARCHAR(255) DEFAULT '',
    zip VARCHAR(255) DEFAULT '',
    country VARCHAR(255) DEFAULT '',
    latitude NUMERIC(10,8) DEFAULT 0,
    longitude NUMERIC(11,8) DEFAULT 0
);

CREATE TABLE user_organizations (
    user_organization_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id),
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    user_role VARCHAR(255) NOT NULL REFERENCES roles(role_name),

    UNIQUE(user_id, organization_id)
);

-- +goose Down
DROP TABLE IF EXISTS user_organizations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;