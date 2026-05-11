import type { Task, TaskPriority } from './types';
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
    deadline?: string | null;
    priority?: TaskPriority;
  },
): Promise<Task> {
  return apiRequest<Task>(
    `/projects/${encodeURIComponent(projectId)}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: body.title,
        blockNoteData: body.blockNoteData ?? null,
        deadline: body.deadline ?? null,
        priority: body.priority ?? undefined,
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
    assigned_to?: string | null;
    deadline?: string | null;
    priority?: TaskPriority;
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

export function deleteTask(
  projectId: string,
  taskId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
    },
  );
}
