import { useEffect, useState } from "react";
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

import { addAccountUser, type User } from "../../api";

type AddUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdded: (user: User) => void;
};

export function AddUserDialog({
  open,
  onClose,
  onAdded,
}: AddUserDialogProps) {
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setGivenName("");
    setFamilyName("");
    setEmail("");
    setPassword("");
    setError("");
  }, [open]);

  const handleSubmit = async () => {
    setError("");
    if (
      givenName.trim() === "" ||
      familyName.trim() === "" ||
      email.trim() === "" ||
      password === ""
    ) {
      setError("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      const created = await addAccountUser({
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        email: email.trim(),
        password,
      });
      onAdded(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add user</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" spacing={1}>
            <TextField
              label="Given name"
              size="small"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              disabled={submitting}
              fullWidth
            />
            <TextField
              label="Family name"
              size="small"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              disabled={submitting}
              fullWidth
            />
          </Stack>
          <TextField
            label="Email"
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            fullWidth
          />
          <TextField
            label="Password"
            size="small"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            fullWidth
            helperText="At least 6 characters"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
