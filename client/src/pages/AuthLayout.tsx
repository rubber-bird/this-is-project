import { Container, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" fontWeight={500}>
          CSC 350 - Project 1
        </Typography>
        <Outlet />
      </Stack>
    </Container>
  );
}
