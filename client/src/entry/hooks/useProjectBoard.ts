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
  listTasks,
  listWorkflowStatuses,
  updateTask,
  type Task,
  type WorkflowStatus,
} from "../../api";

function parseDndId(id: string): { kind: "task" | "col"; id: string } | null {
  if (id.startsWith("task:")) return { kind: "task", id: id.slice(5) };
  if (id.startsWith("col:")) return { kind: "col", id: id.slice(4) };
  return null;
}

export function useProjectBoard(projectId: string) {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
        const [statusList, taskList] = await Promise.all([
          listWorkflowStatuses(projectId),
          listTasks(projectId),
        ]);
        if (!cancelled) {
          setStatuses(statusList);
          setTasks(taskList);
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
    async (title: string, description: string) => {
      setDialogError("");
      if (!title.trim()) {
        setDialogError("Title is required");
        return;
      }

      setDialogSubmitting(true);
      try {
        const created = await createTask(projectId, {
          title,
          description,
        });
        setTasks((prev) => [...prev, created]);
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
        setTasks((ts) => ts.map((t) => (t.id === taskId ? updated : t)));
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
    if (savingTask) return;
    setEditorOpen(false);
    setSelectedTask(null);
    setSaveError("");
  }, [savingTask]);

  const handleSaveTask = useCallback(
    async (title: string, description: string) => {
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
          description,
        });
        setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
        setSelectedTask(updated);
        setEditorOpen(false);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save task");
      } finally {
        setSavingTask(false);
      }
    },
    [projectId, selectedTask],
  );

  return {
    statuses,
    tasks,
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
    openEditor,
    closeEditor,
    handleSaveTask,
  };
}
