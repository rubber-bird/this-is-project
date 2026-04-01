-- 003_create_accounts_table (down)

ALTER TABLE users DROP FOREIGN KEY fk_users_account;
ALTER TABLE users DROP COLUMN account_id;
DROP TABLE IF EXISTS accounts;
