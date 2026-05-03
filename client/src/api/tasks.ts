import type { Task } from './types';
import { apiRequest } from './http';

export function listTasks(projectId: string): Promise<Task[]> {
  return apiRequest<Task[]>(
    `/projects/${encodeURIComponent(projectId)}/tasks`,
  );
}

export function getTask(projectId: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
  );
}

export function createTask(
  projectId: string,
  body: {
    title: string;
    description?: string | null;
  },
): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: body.title,
        description: body.description ?? null,
      }),
    },
  );
}

export function updateTask(
  projectId: string,
  taskId: string,
  patch: { workflow_status_id?: string },
): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
}
