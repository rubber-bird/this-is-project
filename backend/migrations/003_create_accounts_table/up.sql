-- 003_create_accounts_table (up)

CREATE TABLE IF NOT EXISTS accounts (
    id         CHAR(36) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN account_id CHAR(36) NOT NULL AFTER id;
ALTER TABLE users ADD CONSTRAINT fk_users_account FOREIGN KEY (account_id) REFERENCES accounts(id);
