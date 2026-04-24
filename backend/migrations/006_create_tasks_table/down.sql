-- 006_create_tasks_table (down)

DROP TABLE IF EXISTS tasks;

ALTER TABLE workflow_statuses DROP KEY uq_ws_project_id;
