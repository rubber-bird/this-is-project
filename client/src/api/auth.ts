import type { User, SignUpRequest, SignInRequest } from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.ok) {
    const err = data.error;
    const msg = typeof err === 'string'
      ? err
      : (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message)
      : 'Something went wrong';
    throw new Error(msg);
  }

  return data as T;
}

export function signUp(body: SignUpRequest): Promise<User> {
  return request<User>(`${BASE}/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      given_name: body.givenName,
      family_name: body.familyName,
      email: body.email,
      password: body.password,
    }),
  });
}

export function signIn(body: SignInRequest): Promise<User> {
  return request<User>(`${BASE}/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function whoami(): Promise<User> {
  return request<User>(`${BASE}/whoami`);
}

export function signOut(): Promise<{ message: string }> {
  return request<{ message: string }>(`${BASE}/sign-out`, { method: 'POST' });
}
