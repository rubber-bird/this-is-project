-- 004_create_projects_table (up)

CREATE TABLE IF NOT EXISTS projects (
    id          CHAR(36) PRIMARY KEY,
    account_id  CHAR(36) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_by  CHAR(36) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_projects_account_name (account_id, name)
);
