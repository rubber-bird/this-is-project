import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link, Stack, Typography } from "@mui/material";

import { SignUp } from "../auth/SignUp";

export function SignUpPage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <SignUp onSuccess={() => navigate("/login", { replace: true })} />
      <Typography>
        Already have an account?{" "}
        <Link component={RouterLink} to="/login">
          Sign in
        </Link>
      </Typography>
    </Stack>
  );
}
