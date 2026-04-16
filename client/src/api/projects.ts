import type { Project } from './types';
import { apiRequest } from './http';

export function listProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/projects');
}

export function getProject(id: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`);
}

export function createProject(body: { name: string; description?: string | null }): Promise<Project> {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      description: body.description ?? null,
    }),
  });
}

export function updateProject(
  id: string,
  patch: { name?: string; description?: string | null },
): Promise<Project> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.description !== undefined) body.description = patch.description;
  return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteProject(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
