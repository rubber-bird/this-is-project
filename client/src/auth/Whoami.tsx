import { Card, CardContent, Typography, Button, Stack } from "@mui/material";

import { type User, signOut } from "../api";

export const Whoami = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) => {
  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // session might already be gone — still clear local state
    }
    onLogout();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1} alignItems="center">
          <Typography variant="h5">Welcome, {user.given_name}</Typography>
          <Typography color="text.secondary">Email: {user.email}</Typography>
          <Typography color="text.secondary">Role: {user.role}</Typography>
          <Button variant="outlined" onClick={handleLogout} sx={{ mt: 1 }}>
            Log out
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
