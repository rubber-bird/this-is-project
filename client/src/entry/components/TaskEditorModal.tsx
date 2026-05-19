import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import { useCreateBlockNote } from "@blocknote/react";
import { Link as RouterLink } from "react-router-dom";

import {
  type Task,
  type TaskPriority,
  type User,
  type WorkflowStatus,
} from "../../api";
import { TaskAttachments } from "./TaskAttachments";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import { TaskMetaSidebar } from "./TaskMetaSidebar";
import { applyTaskDescriptionToEditor } from "../utils/taskDescriptionBlocks";
import { deadlineInputValue } from "../utils/deadlineInputValue";

export type TaskEditorModalProps = {
  open: boolean;
  task: Task | null;
  statuses: WorkflowStatus[];
  users: User[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (
    title: string,
    blockNoteData: string,
    deadline: string | null,
  ) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeadlineChange: (taskId: string, deadline: string | null) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
};

export function TaskEditorModal({
  open,
  task,
  statuses,
  users,
  saving,
  error,
  onClose,
  onSave,
  onStatusChange,
  onPriorityChange,
  onDeadlineChange,
  onAssigneeChange,
  onDelete,
  deleting = false,
}: TaskEditorModalProps) {
  const [title, setTitle] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const editor = useCreateBlockNote({}, [task?.id ?? ""]);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setMode("view");
    applyTaskDescriptionToEditor(editorRef.current, task.blockNoteData);
  }, [task?.id, task?.title, task?.blockNoteData]);

  useEffect(() => {
    if (!task) {
      setDeadlineDraft("");
      return;
    }
    setDeadlineDraft(deadlineInputValue(task.deadline));
  }, [task?.id]);

  useEffect(() => {
    if (!open) setDeleteConfirmOpen(false);
  }, [open]);

  const busy = saving || deleting;
  const canDelete = Boolean(task && onDelete);

  const handleSave = () => {
    onSave(
      title,
      JSON.stringify(editor.document),
      deadlineInputValue(deadlineDraft) || null,
    );
  };

  const handleCancelEdit = () => {
    if (task) {
      setTitle(task.title);
      setDeadlineDraft(deadlineInputValue(task.deadline));
      applyTaskDescriptionToEditor(editor, task.blockNoteData);
    }
    setMode("view");
  };

  const isEdit = mode === "edit";

  const deleteButton = canDelete ? (
    <Button
      color="error"
      variant="outlined"
      size="small"
      startIcon={<DeleteOutlineIcon />}
      onClick={() => setDeleteConfirmOpen(true)}
      disabled={busy}
      aria-label="Delete task"
    >
      Delete task
    </Button>
  ) : null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle
        color="text.primary"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        {isEdit ? (
          <Box component="span">Edit task</Box>
        ) : task ? (
          <Box
            component={RouterLink}
            to={`/projects/${task.project_id}/tasks/${task.id}`}
            sx={{
              color: "inherit",
              textDecoration: "underline",
              textDecorationStyle: "dotted",
              textUnderlineOffset: 4,
              "&:hover": { textDecorationStyle: "solid" },
            }}
          >
            {title}
          </Box>
        ) : (
          <Box component="span">{title}</Box>
        )}
        {!isEdit && (
          <IconButton
            size="small"
            onClick={() => setMode("edit")}
            aria-label="Edit task"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
              {isEdit ? (
                <TextField
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  disabled={busy}
                />
              ) : null}
              <TaskDescriptionEditor
                editor={editor}
                editable={isEdit && !busy}
                variant="page"
              />
              {task ? (
                <TaskAttachments
                  projectId={task.project_id}
                  taskId={task.id}
                  disabled={busy}
                />
              ) : null}
            </Stack>
            <TaskMetaSidebar
              statuses={statuses}
              workflowStatusId={task?.workflow_status_id ?? ""}
              priority={task?.priority}
              deadlineDraft={deadlineDraft}
              statusSelectDisabled={busy || !task || statuses.length === 0}
              priorityDeadlineDisabled={busy || !task}
              onWorkflowStatusChange={(statusId) => {
                if (task) void onStatusChange(task.id, statusId);
              }}
              onPriorityChange={(p) => {
                if (task) void onPriorityChange(task.id, p);
              }}
              onDeadlineDraftChange={(v) => {
                setDeadlineDraft(v);
                if (task) void onDeadlineChange(task.id, v ? v : null);
              }}
              users={users}
              assigneeId={task?.assigned_to ?? null}
              assigneeDisabled={busy || !task}
              onAssigneeChange={(id) => {
                if (task) void onAssigneeChange(task.id, id);
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      {!isEdit && deleteButton ? (
        <DialogActions
          sx={{
            justifyContent: "flex-start",
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "action.hover"
                : "grey.50",
          }}
        >
          {deleteButton}
        </DialogActions>
      ) : null}
      {isEdit ? (
        <DialogActions
          sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>{deleteButton}</Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleCancelEdit} disabled={busy}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={busy}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Stack>
        </DialogActions>
      ) : null}
      <Dialog
        open={deleteConfirmOpen}
        onClose={deleting ? undefined : () => setDeleteConfirmOpen(false)}
      >
        <DialogTitle
          color="text.primary"
          sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}
        >
          <DeleteOutlineIcon color="error" fontSize="small" />
          Delete this task?
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" variant="outlined" sx={{ mt: 0.5 }}>
            This will permanently remove &ldquo;{title}&rdquo;. You cannot undo
            this action.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress color="inherit" size={18} />
              ) : (
                <DeleteForeverIcon fontSize="small" />
              )
            }
            onClick={() => {
              void (async () => {
                try {
                  await onDelete?.();
                } finally {
                  setDeleteConfirmOpen(false);
                }
              })();
            }}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
