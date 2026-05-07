import type { Task, TaskPriority } from "../../api/types";
import { mergeTaskDeadline } from "./deadlineInputValue";

export function taskPriorityOrDefault(
  p: string | null | undefined,
): TaskPriority {
  const s = p?.toLowerCase();
  if (s === "low" || s === "medium" || s === "high") return s;
  return "medium";
}

export function normalizeTask(t: Task): Task {
  return {
    ...t,
    priority: taskPriorityOrDefault(
      (t as { priority?: string | null }).priority,
    ),
  };
}

export function mergeTaskResponse(
  updated: Task,
  fallback: { deadline: string | null; priority: TaskPriority },
): Task {
  const mergedDeadline = mergeTaskDeadline(updated, fallback.deadline);
  return { ...mergedDeadline, priority: fallback.priority };
}

export function priorityMarkerColor(priority: TaskPriority): string {
  switch (priority) {
    case "low":
      return "success.main";
    case "high":
      return "error.main";
    default:
      return "warning.main";
  }
}
