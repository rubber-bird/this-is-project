import { useEffect } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCreateBlockNote } from "@blocknote/react";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import { emptyTaskDescriptionBlocks } from "../utils/taskDescriptionBlocks";

type TaskDialogProps = {
  open: boolean;
  title: string;
  error: string;
  submitting: boolean;
  onTitleChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (title: string, blockNoteData: string) => void;
};

export function TaskDialog({
  open,
  title,
  error,
  submitting,
  onTitleChange,
  onClose,
  onSubmit,
}: TaskDialogProps) {
  const editor = useCreateBlockNote({});

  useEffect(() => {
    if (!open) return;
    editor.replaceBlocks(editor.document, emptyTaskDescriptionBlocks);
  }, [open, editor]);

  const canSubmit = !submitting && title.trim() !== "";

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed, JSON.stringify(editor.document));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle color="text.primary">New task</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Title"
            required
            fullWidth
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={submitting}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: -0.5 }}>
            Description
          </Typography>
          <TaskDescriptionEditor
            editor={editor}
            editable={!submitting}
            variant="dialog"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
