-- 001_create_users_table (up)

CREATE TABLE IF NOT EXISTS users (
    id         CHAR(36) PRIMARY KEY,
    given_name VARCHAR(255) NOT NULL,
    family_name VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
