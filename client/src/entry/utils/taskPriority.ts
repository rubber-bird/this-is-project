import type { Task, TaskPriority } from "../../api/types";
import { mergeTaskDeadline } from "./deadlineInputValue";
import { coerceTaskDescriptionString } from "./taskDescriptionBlocks";

export function taskPriorityOrDefault(
  p: string | null | undefined,
): TaskPriority {
  const s = p?.toLowerCase();
  if (s === "low" || s === "medium" || s === "high") return s;
  return "medium";
}

export function normalizeTask(t: Task): Task {
  const body = t as Task & { blockNoteData?: unknown };
  return {
    ...t,
    blockNoteData: coerceTaskDescriptionString(body.blockNoteData),
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
  return normalizeTask({
    ...mergedDeadline,
    priority: fallback.priority,
  } as Task);
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
