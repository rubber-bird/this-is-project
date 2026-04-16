import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type DeleteProjectDialogProps = {
  open: boolean;
  projectName?: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProjectDialog({
  open,
  projectName,
  submitting,
  onClose,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle color="text.primary">Delete project?</DialogTitle>
      <DialogContent>
        <Typography>
          This will permanently remove &ldquo;{projectName}&rdquo;. This cannot be
          undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
