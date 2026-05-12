import {
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Outlet } from "react-router-dom";

const PLANS: Array<{
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
}> = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Up to 3 projects",
      "Up to 50 tasks per project",
      "Community support",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    features: [
      "Unlimited projects",
      "Unlimited tasks",
      "Priority email support",
      "Advanced workflow controls",
    ],
    highlight: true,
  },
];

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="stretch"
        >
          <Stack
            spacing={3}
            sx={{ flex: 1.1, minWidth: 0 }}
          >
            <Stack spacing={1.5}>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  letterSpacing: 1.2,
                }}
              >
                CSC 350 — Project Management Tool
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  color: "text.primary",
                  lineHeight: 1.1,
                }}
              >
                Run your projects, your way.
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 480 }}
              >
                A simple Kanban-style project tracker for teams. Pick the plan
                that fits — upgrade or downgrade anytime.
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {PLANS.map((p) => (
                <Paper
                  key={p.name}
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: p.highlight ? "primary.main" : "divider",
                    boxShadow: p.highlight
                      ? "0 4px 24px rgba(8, 44, 246, 0.10)"
                      : "0 1px 2px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {p.name}
                      </Typography>
                      {p.highlight ? (
                        <Chip
                          label="Recommended"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : null}
                    </Stack>
                    <Stack direction="row" alignItems="baseline" spacing={0.75}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                      >
                        {p.price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.period}
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack spacing={0.75}>
                      {p.features.map((f) => (
                        <Stack
                          key={f}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <CheckCircleRoundedIcon
                            fontSize="small"
                            color={p.highlight ? "primary" : "success"}
                          />
                          <Typography variant="body2">{f}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: 0.9,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: { xs: "stretch", md: "flex-end" },
            }}
          >
            <Paper
              sx={{
                width: "100%",
                maxWidth: 420,
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 32px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Outlet />
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
