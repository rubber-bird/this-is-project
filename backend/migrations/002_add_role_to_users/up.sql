-- 002_add_role_to_users (up)

ALTER TABLE users ADD COLUMN role ENUM('owner', 'admin', 'user') NOT NULL DEFAULT 'user';
