import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";

import { getTask, updateTask, type Task } from "../api";
import { useSetTaskBreadcrumb } from "./BreadcrumbContext";
import { TaskDescriptionEditor } from "./components/TaskDescriptionEditor";
import { blocksFromStoredDescription } from "./utils/taskDescriptionBlocks";

function TaskEditor({
  task,
  onSaved,
}: {
  task: Task;
  onSaved: (t: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const editor = useCreateBlockNote({}, [task.id]);

  useEffect(() => {
    setTitle(task.title);
    const blocks = blocksFromStoredDescription(task.description);
    editor.replaceBlocks(editor.document, blocks);
  }, [task.id, task.title, task.description, editor]);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setSaveError("Title is required");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const description = JSON.stringify(editor.document);
      const updated = await updateTask(task.project_id, task.id, {
        title: trimmed,
        description,
      });
      onSaved(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editor, task.id, task.project_id, title, onSaved]);

  return (
    <Stack spacing={2} alignItems="stretch" maxWidth={900}>
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        disabled={saving}
      />
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      <TaskDescriptionEditor
        editor={editor}
        editable={!saving}
        variant="page"
      />
      <Button
        variant="contained"
        onClick={() => void handleSave()}
        disabled={saving}
        sx={{ alignSelf: "flex-start" }}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Stack>
  );
}

export function TaskPage() {
  const { projectId = "", taskId = "" } = useParams();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const t = await getTask(projectId, taskId);
        if (!cancelled) setTask(t);
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
    <Stack spacing={2} alignItems="flex-start" maxWidth={920}>
      <Button
        component={RouterLink}
        to={`/projects/${projectId}`}
        startIcon={<ArrowBackIcon />}
        size="small"
      >
        Back to project
      </Button>
      <TaskEditor key={task.id} task={task} onSaved={setTask} />
    </Stack>
  );
}
