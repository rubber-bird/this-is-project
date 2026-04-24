import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link, Stack, Typography } from "@mui/material";

import { Login } from "../auth/Login";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Login
        onSuccess={(user) => {
          setUser(user);
          navigate("/projects", { replace: true });
        }}
      />
      <Typography>
        No account?{" "}
        <Link component={RouterLink} to="/signup">
          Sign up
        </Link>
      </Typography>
    </Stack>
  );
}
