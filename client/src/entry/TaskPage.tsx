import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
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
  listWorkflowStatuses,
  updateTask,
  type Task,
  type WorkflowStatus,
} from "../api";
import { useSetTaskBreadcrumb } from "./BreadcrumbContext";
import { TaskDescriptionEditor } from "./components/TaskDescriptionEditor";
import { blocksFromStoredDescription } from "./utils/taskDescriptionBlocks";

function TaskEditor({
  task,
  statuses,
  onSaved,
}: {
  task: Task;
  statuses: WorkflowStatus[];
  onSaved: (t: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const editor = useCreateBlockNote({}, [task.id]);

  useEffect(() => {
    setTitle(task.title);
    setMode("view");
    const blocks = blocksFromStoredDescription(task.blockNoteData);
    editor.replaceBlocks(editor.document, blocks);
  }, [task.id, task.title, task.blockNoteData, editor]);

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
      });
      onSaved(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editor, task.id, task.project_id, title, onSaved]);

  const handleCancelEdit = useCallback(() => {
    setTitle(task.title);
    const blocks = blocksFromStoredDescription(task.blockNoteData);
    editor.replaceBlocks(editor.document, blocks);
    setSaveError("");
    setMode("view");
  }, [task.title, task.blockNoteData, editor]);

  const handleStatusChange = useCallback(
    async (statusId: string) => {
      if (statusId === task.workflow_status_id) return;
      setSaveError("");
      setSaving(true);
      try {
        const updated = await updateTask(task.project_id, task.id, {
          workflow_status_id: statusId,
        });
        onSaved(updated);
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Failed to change status",
        );
      } finally {
        setSaving(false);
      }
    },
    [task.id, task.project_id, task.workflow_status_id, onSaved],
  );

  const isEdit = mode === "edit";

  return (
    <Stack spacing={2} alignItems="stretch" sx={{ width: "100%" }}>
      {isEdit ? (
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          disabled={saving}
        />
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {task.title}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setMode("edit")}
            aria-label="Edit task"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <TaskDescriptionEditor
            editor={editor}
            editable={isEdit && !saving}
            variant="page"
          />
        </Stack>
        <Stack spacing={1} sx={{ width: 220, flexShrink: 0 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <TextField
            select
            size="small"
            value={task.workflow_status_id}
            onChange={(e) => void handleStatusChange(e.target.value)}
            disabled={saving || statuses.length === 0}
            fullWidth
          >
            {statuses.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [t, statusList] = await Promise.all([
          getTask(projectId, taskId),
          listWorkflowStatuses(projectId),
        ]);
        if (!cancelled) {
          setTask(t);
          setStatuses(statusList);
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
        onSaved={setTask}
      />
    </Stack>
  );
}
