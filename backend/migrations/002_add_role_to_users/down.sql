-- 002_add_role_to_users (down)

ALTER TABLE users DROP COLUMN role;
