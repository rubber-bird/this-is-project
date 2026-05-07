import type { Task } from "../../api";

export function deadlineInputValue(
  deadline: string | null | undefined,
): string {
  if (deadline == null || deadline === "") return "";
  const s = String(deadline);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

export function mergeTaskDeadline(
  updated: Task,
  fallbackDeadline: string | null,
): Task {
  const parsed = deadlineInputValue(updated.deadline);
  if (parsed !== "") {
    return { ...updated, deadline: parsed };
  }
  return { ...updated, deadline: fallbackDeadline };
}
