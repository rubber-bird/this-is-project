import type { TaskAttachment } from './types';

const BASE = '/api';

function attachmentPath(
  projectId: string,
  taskId: string,
  attachmentId?: string,
): string {
  const base = `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/attachments`;
  return attachmentId
    ? `${base}/${encodeURIComponent(attachmentId)}`
    : base;
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const err = data.error;
    const msg =
      typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : fallback;
    throw new Error(msg);
  } catch (e) {
    if (e instanceof Error && e.message !== fallback) {
      throw e;
    }
    throw new Error(text || fallback);
  }
}

export function listTaskAttachments(
  projectId: string,
  taskId: string,
): Promise<TaskAttachment[]> {
  return fetch(`${BASE}${attachmentPath(projectId, taskId)}`, {
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      return parseError(res, 'Failed to load attachments');
    }
    return res.json() as Promise<TaskAttachment[]>;
  });
}

export function uploadTaskAttachment(
  projectId: string,
  taskId: string,
  file: File,
): Promise<TaskAttachment> {
  const form = new FormData();
  form.append('file', file);

  return fetch(`${BASE}${attachmentPath(projectId, taskId)}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      return parseError(res, 'Upload failed');
    }
    return res.json() as Promise<TaskAttachment>;
  });
}

export function deleteTaskAttachment(
  projectId: string,
  taskId: string,
  attachmentId: string,
): Promise<{ message: string }> {
  return fetch(`${BASE}${attachmentPath(projectId, taskId, attachmentId)}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      return parseError(res, 'Failed to delete attachment');
    }
    return res.json() as Promise<{ message: string }>;
  });
}

export function taskAttachmentDownloadUrl(
  projectId: string,
  taskId: string,
  attachmentId: string,
): string {
  return `${BASE}${attachmentPath(projectId, taskId, attachmentId)}`;
}
