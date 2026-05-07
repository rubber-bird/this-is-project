import type { User } from './types';
import { apiRequest } from './http';

export function listAccountUsers(): Promise<User[]> {
  return apiRequest<User[]>('/account/users');
}

export function addAccountUser(body: {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}): Promise<User> {
  return apiRequest<User>('/account/users', {
    method: 'POST',
    body: JSON.stringify({
      given_name: body.givenName,
      family_name: body.familyName,
      email: body.email,
      password: body.password,
    }),
  });
}
