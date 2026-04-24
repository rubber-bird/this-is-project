import type { WorkflowStatus } from './types';
import { apiRequest } from './http';

export function listWorkflowStatuses(projectId: string): Promise<WorkflowStatus[]> {
  return apiRequest<WorkflowStatus[]>(
    `/projects/${encodeURIComponent(projectId)}/workflow-statuses`,
  );
}

export function createWorkflowStatuses(
  projectId: string,
  statuses: { name: string; color?: string | null }[],
): Promise<WorkflowStatus[]> {
  return apiRequest<WorkflowStatus[]>(
    `/projects/${encodeURIComponent(projectId)}/workflow-statuses`,
    {
      method: 'POST',
      body: JSON.stringify({ statuses }),
    },
  );
}

export function updateWorkflowStatus(
  projectId: string,
  statusId: string,
  patch: { name?: string; color?: string | null },
): Promise<WorkflowStatus> {
  return apiRequest<WorkflowStatus>(
    `/projects/${encodeURIComponent(projectId)}/workflow-statuses/${encodeURIComponent(statusId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
}

export function reorderWorkflowStatuses(
  projectId: string,
  order: string[],
): Promise<WorkflowStatus[]> {
  return apiRequest<WorkflowStatus[]>(
    `/projects/${encodeURIComponent(projectId)}/workflow-statuses`,
    {
      method: 'PUT',
      body: JSON.stringify({ order }),
    },
  );
}
