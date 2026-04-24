-- 006_create_tasks_table (up)

ALTER TABLE workflow_statuses
    ADD CONSTRAINT uq_ws_project_id IF NOT EXISTS UNIQUE (project_id, id);

CREATE TABLE IF NOT EXISTS tasks (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    workflow_status_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_ws_in_project FOREIGN KEY (project_id, workflow_status_id) REFERENCES workflow_statuses(project_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_tasks_project (project_id),
    KEY idx_tasks_workflow_status (workflow_status_id)
);
