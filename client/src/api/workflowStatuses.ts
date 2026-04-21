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
