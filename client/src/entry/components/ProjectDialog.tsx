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

type ProjectDialogMode = "create" | "edit" | null;

type ProjectDialogProps = {
  mode: ProjectDialogMode;
  name: string;
  description: string;
  error: string;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ProjectDialog({
  mode,
  name,
  description,
  error,
  submitting,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: ProjectDialogProps) {
  return (
    <Dialog open={mode !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle color="text.primary">
        {mode === "create" ? "New project" : "Edit project"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            required
            fullWidth
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            disabled={submitting}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
