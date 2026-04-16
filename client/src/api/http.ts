const BASE = '/api';

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.ok) {
    const err = data.error;
    const msg = typeof err === 'string'
      ? err
      : (err && typeof err === 'object' && 'message' in err)
        ? String((err as { message: unknown }).message)
        : 'Something went wrong';
    throw new Error(msg);
  }

  return data as T;
}
