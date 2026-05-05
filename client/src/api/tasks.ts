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
    blockNoteData?: string | null;
  },
): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: body.title,
        blockNoteData: body.blockNoteData ?? null,
      }),
    },
  );
}

export function updateTask(
  projectId: string,
  taskId: string,
  body: {
    title?: string;
    blockNoteData?: string | null;
    workflow_status_id?: string;
  },
): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}
