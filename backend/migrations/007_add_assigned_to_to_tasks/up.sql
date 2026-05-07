-- 007_add_assigned_to_to_tasks (up)

ALTER TABLE tasks
ADD COLUMN assigned_to CHAR(36) NULL AFTER created_by,
ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
ADD KEY idx_tasks_assigned_to (assigned_to);
