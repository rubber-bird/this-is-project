-- 007_add_assigned_to_to_tasks (down)

ALTER TABLE tasks
DROP FOREIGN KEY fk_tasks_assigned_to,
DROP KEY idx_tasks_assigned_to,
DROP COLUMN assigned_to;
