import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  createTask,
  deleteTask,
  listAccountUsers,
  listTasks,
  listWorkflowStatuses,
  updateTask,
  type Task,
  type TaskPriority,
  type User,
  type WorkflowStatus,
} from "../../api";
import { deadlineInputValue } from "../utils/deadlineInputValue";
import {
  mergeTaskResponse,
  normalizeTask,
  taskPriorityOrDefault,
} from "../utils/taskPriority";

function parseDndId(id: string): { kind: "task" | "col"; id: string } | null {
  if (id.startsWith("task:")) return { kind: "task", id: id.slice(5) };
  if (id.startsWith("col:")) return { kind: "col", id: id.slice(4) };
  return null;
}

export function useProjectBoard(projectId: string) {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saveError, setSaveError] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const tasksByStatusId = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const s of statuses) {
      map.set(s.id, []);
    }
    for (const t of tasks) {
      const list = map.get(t.workflow_status_id);
      if (list) {
        list.push(t);
      }
    }
    return map;
  }, [statuses, tasks]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [statusList, taskList, userList] = await Promise.all([
          listWorkflowStatuses(projectId),
          listTasks(projectId),
          listAccountUsers(),
        ]);
        if (!cancelled) {
          setStatuses(statusList);
          setTasks(taskList.map(normalizeTask));
          setUsers(userList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load board");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const openDialog = useCallback(() => {
    setDialogTitle("");
    setDialogError("");
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (dialogSubmitting) return;
    setDialogOpen(false);
  }, [dialogSubmitting]);

  const handleCreateSubmit = useCallback(
    async (title: string, blockNoteData: string) => {
      setDialogError("");
      if (!title.trim()) {
        setDialogError("Title is required");
        return;
      }

      setDialogSubmitting(true);
      try {
        const created = await createTask(projectId, {
          title,
          blockNoteData,
        });
        setTasks((prev) => [...prev, normalizeTask(created)]);
        setDialogOpen(false);
      } catch (e) {
        setDialogError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setDialogSubmitting(false);
      }
    },
    [projectId],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setMoveError("");
      const parsed = parseDndId(String(event.active.id));
      if (parsed?.kind === "task") {
        setActiveTask(tasks.find((t) => t.id === parsed.id) ?? null);
      }
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const activeParsed = parseDndId(String(active.id));
      if (!activeParsed || activeParsed.kind !== "task") return;

      const taskId = activeParsed.id;
      const fromTask = tasks.find((t) => t.id === taskId);
      if (!fromTask) return;

      const overParsed = parseDndId(String(over.id));
      let targetStatusId: string | null = null;
      if (overParsed?.kind === "col") {
        targetStatusId = overParsed.id;
      } else if (overParsed?.kind === "task") {
        const overTask = tasks.find((t) => t.id === overParsed.id);
        if (overTask) targetStatusId = overTask.workflow_status_id;
      }

      if (!targetStatusId || targetStatusId === fromTask.workflow_status_id) {
        return;
      }

      setMoving(true);
      const previous = tasks;
      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId ? { ...t, workflow_status_id: targetStatusId! } : t,
        ),
      );
      try {
        const updated = await updateTask(projectId, taskId, {
          workflow_status_id: targetStatusId,
        });
        const merged = mergeTaskResponse(updated, {
          deadline: fromTask.deadline ?? null,
          priority: taskPriorityOrDefault(fromTask.priority),
        });
        setTasks((ts) => ts.map((t) => (t.id === taskId ? merged : t)));
      } catch (e) {
        setTasks(previous);
        setMoveError(e instanceof Error ? e.message : "Failed to move task");
      } finally {
        setMoving(false);
      }
    },
    [projectId, tasks],
  );

  const openEditor = useCallback((task: Task) => {
    setSaveError("");
    setSelectedTask(task);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    if (savingTask || deletingTask) return;
    setEditorOpen(false);
    setSelectedTask(null);
    setSaveError("");
  }, [savingTask, deletingTask]);

  const handleDeadlineChange = useCallback(
    async (taskId: string, nextDeadline: string | null) => {
      const normalized = nextDeadline?.trim() || null;
      const prevRow = tasks.find((t) => t.id === taskId);
      if (!prevRow) return;
      const curNorm = deadlineInputValue(prevRow.deadline) || null;
      if (normalized === curNorm) return;

      const previousTasks = tasks;
      const previousSelected = selectedTask;

      setTasks((ts) =>
        ts.map((t) => (t.id === taskId ? { ...t, deadline: normalized } : t)),
      );
      setSelectedTask((prev) =>
        prev?.id === taskId ? { ...prev, deadline: normalized } : prev,
      );

      try {
        const updated = await updateTask(projectId, taskId, {
          deadline: normalized,
        });
        const merged = mergeTaskResponse(updated, {
          deadline: normalized,
          priority: taskPriorityOrDefault(prevRow.priority),
        });
        setTasks((ts) => ts.map((t) => (t.id === taskId ? merged : t)));
        setSelectedTask((prev) => (prev?.id === taskId ? merged : prev));
      } catch (e) {
        setTasks(previousTasks);
        setSelectedTask(previousSelected);
        setSaveError(
          e instanceof Error ? e.message : "Failed to update deadline",
        );
      }
    },
    [projectId, tasks, selectedTask],
  );

  const handlePriorityChange = useCallback(
    async (taskId: string, nextPriority: TaskPriority) => {
      const prevRow = tasks.find((t) => t.id === taskId);
      if (!prevRow) return;
      const cur = taskPriorityOrDefault(prevRow.priority);
      if (nextPriority === cur) return;

      const previousTasks = tasks;
      const previousSelected = selectedTask;

      setTasks((ts) =>
        ts.map((t) => (t.id === taskId ? { ...t, priority: nextPriority } : t)),
      );
      setSelectedTask((prev) =>
        prev?.id === taskId ? { ...prev, priority: nextPriority } : prev,
      );

      try {
        const updated = await updateTask(projectId, taskId, {
          priority: nextPriority,
        });
        const merged = mergeTaskResponse(updated, {
          deadline: prevRow.deadline ?? null,
          priority: nextPriority,
        });
        setTasks((ts) => ts.map((t) => (t.id === taskId ? merged : t)));
        setSelectedTask((prev) => (prev?.id === taskId ? merged : prev));
      } catch (e) {
        setTasks(previousTasks);
        setSelectedTask(previousSelected);
        setSaveError(
          e instanceof Error ? e.message : "Failed to update priority",
        );
      }
    },
    [projectId, tasks, selectedTask],
  );

  const handleStatusChange = useCallback(
    async (taskId: string, statusId: string) => {
      const previousTasks = tasks;
      const previousSelected = selectedTask;
      const prevRow = tasks.find((t) => t.id === taskId);
      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId ? { ...t, workflow_status_id: statusId } : t,
        ),
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, workflow_status_id: statusId });
      }
      try {
        const updated = await updateTask(projectId, taskId, {
          workflow_status_id: statusId,
        });
        const merged = mergeTaskResponse(updated, {
          deadline: prevRow?.deadline ?? null,
          priority: taskPriorityOrDefault(prevRow?.priority),
        });
        setTasks((ts) => ts.map((t) => (t.id === taskId ? merged : t)));
        if (previousSelected?.id === taskId) setSelectedTask(merged);
      } catch (e) {
        setTasks(previousTasks);
        setSelectedTask(previousSelected);
        setSaveError(
          e instanceof Error ? e.message : "Failed to change status",
        );
      }
    },
    [projectId, tasks, selectedTask],
  );

  const handleAssigneeChange = useCallback(
    async (taskId: string, assigneeId: string | null) => {
      const previousTasks = tasks;
      const previousSelected = selectedTask;
      const prevRow = tasks.find((t) => t.id === taskId);
      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId ? { ...t, assigned_to: assigneeId } : t,
        ),
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, assigned_to: assigneeId });
      }
      try {
        const updated = await updateTask(projectId, taskId, {
          assigned_to: assigneeId,
        });
        const merged = mergeTaskResponse(updated, {
          deadline: prevRow?.deadline ?? null,
          priority: taskPriorityOrDefault(prevRow?.priority),
        });
        setTasks((ts) => ts.map((t) => (t.id === taskId ? merged : t)));
        if (previousSelected?.id === taskId) setSelectedTask(merged);
      } catch (e) {
        setTasks(previousTasks);
        setSelectedTask(previousSelected);
        setSaveError(
          e instanceof Error ? e.message : "Failed to change assignee",
        );
      }
    },
    [projectId, tasks, selectedTask],
  );

  const handleSaveTask = useCallback(
    async (title: string, blockNoteData: string, deadline: string | null) => {
      if (!selectedTask) return;
      const trimmed = title.trim();
      if (!trimmed) {
        setSaveError("Title is required");
        return;
      }

      setSaveError("");
      setSavingTask(true);
      try {
        const updated = await updateTask(projectId, selectedTask.id, {
          title: trimmed,
          blockNoteData,
          deadline,
        });
        const merged = mergeTaskResponse(updated, {
          deadline,
          priority: taskPriorityOrDefault(selectedTask.priority),
        });
        setTasks((ts) => ts.map((t) => (t.id === merged.id ? merged : t)));
        setSelectedTask(merged);
        setEditorOpen(false);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save task");
      } finally {
        setSavingTask(false);
      }
    },
    [projectId, selectedTask],
  );

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    setSaveError("");
    setDeletingTask(true);
    try {
      await deleteTask(projectId, selectedTask.id);
      setTasks((ts) => ts.filter((t) => t.id !== selectedTask.id));
      setEditorOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete task");
    } finally {
      setDeletingTask(false);
    }
  }, [projectId, selectedTask]);

  return {
    statuses,
    tasks,
    users,
    tasksByStatusId,
    loading,
    error,
    moveError,
    moving,
    sensors,
    activeTask,
    handleDragStart,
    handleDragEnd,
    dialogOpen,
    dialogTitle,
    dialogError,
    dialogSubmitting,
    setDialogTitle,
    openDialog,
    closeDialog,
    handleCreateSubmit,
    editorOpen,
    selectedTask,
    saveError,
    savingTask,
    deletingTask,
    openEditor,
    closeEditor,
    handleSaveTask,
    handleDeleteTask,
    handleStatusChange,
    handleAssigneeChange,
    handleDeadlineChange,
    handlePriorityChange,
  };
}
