import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { listAccountUsers, type User } from "../api";
import { AddUserDialog } from "./components/AddUserDialog";

const initialsOf = (u: User) =>
  `${u.given_name?.[0] ?? "?"}${u.family_name?.[0] ?? "?"}`.toUpperCase();

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listAccountUsers();
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Stack spacing={2} sx={{ width: "100%", maxWidth: 720 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ fontWeight: 600, flex: 1 }}>
          Users
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add user
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No users yet.
        </Typography>
      ) : (
        <List disablePadding>
          {users.map((u) => (
            <ListItem key={u.id} divider>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "primary.main", fontSize: 14 }}>
                  {initialsOf(u)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${u.given_name} ${u.family_name}`}
                secondary={u.email}
              />
              <Chip size="small" label={u.role} />
            </ListItem>
          ))}
        </List>
      )}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => void refresh()}
      />
    </Stack>
  );
}
