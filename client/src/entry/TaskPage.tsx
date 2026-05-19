import { useCallback, useEffect, useState, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";

import {
  getTask,
  listAccountUsers,
  listWorkflowStatuses,
  updateTask,
  type Task,
  type TaskPriority,
  type User,
  type WorkflowStatus,
} from "../api";
import { useSetTaskBreadcrumb } from "./BreadcrumbContext";
import { TaskAttachments } from "./components/TaskAttachments";
import { TaskDescriptionEditor } from "./components/TaskDescriptionEditor";
import { TaskMetaSidebar } from "./components/TaskMetaSidebar";
import { applyTaskDescriptionToEditor } from "./utils/taskDescriptionBlocks";
import { deadlineInputValue } from "./utils/deadlineInputValue";
import {
  mergeTaskResponse,
  normalizeTask,
  taskPriorityOrDefault,
} from "./utils/taskPriority";

function TaskEditor({
  task,
  statuses,
  users,
  onSaved,
}: {
  task: Task;
  statuses: WorkflowStatus[];
  users: User[];
  onSaved: (t: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const editor = useCreateBlockNote({}, [task.id]);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    setTitle(task.title);
    setMode("view");
    applyTaskDescriptionToEditor(editorRef.current, task.blockNoteData);
  }, [task.id, task.title, task.blockNoteData]);

  useEffect(() => {
    setDeadlineDraft(deadlineInputValue(task.deadline));
  }, [task.id]);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setSaveError("Title is required");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const blockNoteData = JSON.stringify(editor.document);
      const updated = await updateTask(task.project_id, task.id, {
        title: trimmed,
        blockNoteData,
        deadline: deadlineInputValue(deadlineDraft) || null,
      });
      onSaved(
        mergeTaskResponse(updated, {
          deadline: deadlineInputValue(deadlineDraft) || null,
          priority: taskPriorityOrDefault(task.priority),
        }),
      );
      setMode("view");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editor, task.id, task.project_id, task.priority, deadlineDraft, title, onSaved]);

  const handleCancelEdit = useCallback(() => {
    setTitle(task.title);
    setDeadlineDraft(deadlineInputValue(task.deadline));
    applyTaskDescriptionToEditor(editor, task.blockNoteData);
    setSaveError("");
    setMode("view");
  }, [task.title, task.blockNoteData, task.deadline, editor]);

  const handleStatusChange = useCallback(
    async (statusId: string) => {
      if (statusId === task.workflow_status_id) return;
      setSaveError("");
      setSaving(true);
      try {
        const updated = await updateTask(task.project_id, task.id, {
          workflow_status_id: statusId,
        });
        onSaved(
          mergeTaskResponse(updated, {
            deadline: task.deadline ?? null,
            priority: taskPriorityOrDefault(task.priority),
          }),
        );
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Failed to change status",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      task.id,
      task.project_id,
      task.workflow_status_id,
      task.deadline,
      task.priority,
      onSaved,
    ],
  );

  const handlePriorityChange = useCallback(
    async (nextPriority: TaskPriority) => {
      if (nextPriority === taskPriorityOrDefault(task.priority)) return;
      setSaveError("");
      const previous = task;
      onSaved({ ...task, priority: nextPriority });
      try {
        const updated = await updateTask(task.project_id, task.id, {
          priority: nextPriority,
        });
        onSaved(
          mergeTaskResponse(updated, {
            deadline: task.deadline ?? null,
            priority: nextPriority,
          }),
        );
      } catch (e) {
        onSaved(previous);
        setSaveError(
          e instanceof Error ? e.message : "Failed to update priority",
        );
      }
    },
    [task, onSaved],
  );

  const handleDeadlineChange = useCallback(
    async (nextDeadline: string | null) => {
      const normalized = nextDeadline?.trim() || null;
      const current = deadlineInputValue(task.deadline) || null;
      if (normalized === current) return;
      setSaveError("");
      const previous = task;
      onSaved({ ...task, deadline: normalized });
      try {
        const updated = await updateTask(task.project_id, task.id, {
          deadline: normalized,
        });
        onSaved(
          mergeTaskResponse(updated, {
            deadline: normalized,
            priority: taskPriorityOrDefault(previous.priority),
          }),
        );
      } catch (e) {
        onSaved(previous);
        setSaveError(
          e instanceof Error ? e.message : "Failed to update deadline",
        );
      }
    },
    [task, onSaved],
  );

  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      if (assigneeId === task.assigned_to) return;
      setSaveError("");
      const previous = task;
      onSaved({ ...task, assigned_to: assigneeId });
      try {
        const updated = await updateTask(task.project_id, task.id, {
          assigned_to: assigneeId,
        });
        onSaved(
          mergeTaskResponse(updated, {
            deadline: previous.deadline ?? null,
            priority: taskPriorityOrDefault(previous.priority),
          }),
        );
      } catch (e) {
        onSaved(previous);
        setSaveError(
          e instanceof Error ? e.message : "Failed to change assignee",
        );
      }
    },
    [task, onSaved],
  );

  const isEdit = mode === "edit";

  return (
    <Stack spacing={2} alignItems="stretch" sx={{ width: "100%" }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {isEdit ? (
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            disabled={saving}
          />
        ) : (
          <>
            <Typography variant="h5" component="h1" color="text.primary">
              {task.title}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setMode("edit")}
              aria-label="Edit title and description"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Stack>
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <TaskDescriptionEditor
            editor={editor}
            editable={isEdit && !saving}
            variant="page"
          />
          <TaskAttachments
            projectId={task.project_id}
            taskId={task.id}
            disabled={saving}
          />
        </Stack>
        <TaskMetaSidebar
          statuses={statuses}
          workflowStatusId={task.workflow_status_id}
          priority={task.priority}
          deadlineDraft={deadlineDraft}
          statusSelectDisabled={saving || statuses.length === 0}
          priorityDeadlineDisabled={saving}
          onWorkflowStatusChange={(id) => void handleStatusChange(id)}
          onPriorityChange={(p) => void handlePriorityChange(p)}
          onDeadlineDraftChange={(v) => {
            setDeadlineDraft(v);
            void handleDeadlineChange(v ? v : null);
          }}
          users={users}
          assigneeId={task.assigned_to}
          assigneeDisabled={saving}
          onAssigneeChange={(id) => void handleAssigneeChange(id)}
        />
      </Stack>
      {isEdit ? (
        <Stack direction="row" spacing={1}>
          <Button onClick={handleCancelEdit} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

export function TaskPage() {
  const { projectId = "", taskId = "" } = useParams();

  const [task, setTask] = useState<Task | null>(null);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [t, statusList, userList] = await Promise.all([
          getTask(projectId, taskId),
          listWorkflowStatuses(projectId),
          listAccountUsers(),
        ]);
        if (!cancelled) {
          setTask(normalizeTask(t));
          setStatuses(statusList);
          setUsers(userList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load task");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, taskId]);

  useSetTaskBreadcrumb(task?.title ?? null);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!task) {
    return (
      <Typography variant="h6" color="text.secondary">
        Task not found
      </Typography>
    );
  }

  return (
    <Stack spacing={2} alignItems="flex-start" sx={{ width: "100%" }}>
      <Button
        component={RouterLink}
        to={`/projects/${projectId}`}
        startIcon={<ArrowBackIcon />}
        size="small"
      >
        Back to project
      </Button>
      <TaskEditor
        key={task.id}
        task={task}
        statuses={statuses}
        users={users}
        onSaved={setTask}
      />
    </Stack>
  );
}
