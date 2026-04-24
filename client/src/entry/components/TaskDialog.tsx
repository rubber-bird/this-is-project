import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

type TaskDialogProps = {
  open: boolean;
  title: string;
  description: string;
  error: string;
  submitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function TaskDialog({
  open,
  title,
  description,
  error,
  submitting,
  onTitleChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: TaskDialogProps) {
  const canSubmit = !submitting && title.trim() !== "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle color="text.primary">New task</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Title"
            required
            fullWidth
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            disabled={submitting}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
