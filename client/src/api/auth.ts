import type { User, SignUpRequest, SignInRequest } from './types';
import { apiRequest } from './http';

export function signUp(body: SignUpRequest): Promise<User> {
  return apiRequest<User>('/sign-up', {
    method: 'POST',
    body: JSON.stringify({
      given_name: body.givenName,
      family_name: body.familyName,
      email: body.email,
      password: body.password,
    }),
  });
}

export function signIn(body: SignInRequest): Promise<User> {
  return apiRequest<User>('/sign-in', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function whoami(): Promise<User> {
  return apiRequest<User>('/whoami');
}

export function signOut(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/sign-out', { method: 'POST' });
}
