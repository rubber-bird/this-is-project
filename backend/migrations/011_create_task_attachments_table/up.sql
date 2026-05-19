-- 011_create_task_attachments_table (up)

CREATE TABLE IF NOT EXISTS task_attachments (
    id CHAR(36) PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    uploaded_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ta_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
    KEY idx_ta_task (task_id)
);
