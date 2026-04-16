export interface User {
  id: string;
  account_id: string;
  given_name: string;
  family_name: string;
  email: string;
  role: string;
}

export interface SignUpRequest {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface Project {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}
