import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useCreateBlockNote } from "@blocknote/react";
import { Link as RouterLink } from "react-router-dom";

import {
  type Task,
  type TaskPriority,
  type User,
  type WorkflowStatus,
} from "../../api";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import { TaskMetaSidebar } from "./TaskMetaSidebar";
import { blocksFromStoredDescription } from "../utils/taskDescriptionBlocks";
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
}: TaskEditorModalProps) {
  const [title, setTitle] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const editor = useCreateBlockNote({}, [task?.id ?? ""]);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setMode("view");
    const blocks = blocksFromStoredDescription(task.blockNoteData);
    editorRef.current.replaceBlocks(editorRef.current.document, blocks);
  }, [task?.id, task?.title, task?.blockNoteData]);

  useEffect(() => {
    if (!task) {
      setDeadlineDraft("");
      return;
    }
    setDeadlineDraft(deadlineInputValue(task.deadline));
  }, [task?.id]);

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
      const blocks = blocksFromStoredDescription(task.blockNoteData);
      editor.replaceBlocks(editor.document, blocks);
    }
    setMode("view");
  };

  const isEdit = mode === "edit";

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
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
          disabled={saving}
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
                  disabled={saving}
                />
              ) : null}
              <TaskDescriptionEditor
                editor={editor}
                editable={isEdit && !saving}
                variant="page"
              />
            </Stack>
            <TaskMetaSidebar
              statuses={statuses}
              workflowStatusId={task?.workflow_status_id ?? ""}
              priority={task?.priority}
              deadlineDraft={deadlineDraft}
              statusSelectDisabled={saving || !task || statuses.length === 0}
              priorityDeadlineDisabled={saving || !task}
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
              assigneeDisabled={saving || !task}
              onAssigneeChange={(id) => {
                if (task) void onAssigneeChange(task.id, id);
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      {isEdit ? (
        <DialogActions>
          <Button onClick={handleCancelEdit} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
