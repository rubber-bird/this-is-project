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

export interface WorkflowStatus {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  position: number;
  created_at: string | null;
  updated_at: string | null;
}

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  project_id: string;
  workflow_status_id: string;
  title: string;
  blockNoteData: string | null;
  deadline: string | null;
  priority: TaskPriority;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  project_id: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string | null;
}

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantChatResponse {
  assistant_message: string;
  executed_actions: string[];
  errors: string[];
}
