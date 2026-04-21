import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { listWorkflowStatuses, type WorkflowStatus } from "../../api";

type ProjectBoardProps = {
  projectId: string;
};

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const list = await listWorkflowStatuses(projectId);
        if (!cancelled) setStatuses(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load statuses");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (statuses.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No statuses for this project.
      </Typography>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ overflowX: "auto", pb: 1 }}
      alignItems="stretch"
    >
      {statuses.map((status) => (
        <Paper
          key={status.id}
          variant="outlined"
          sx={{
            minWidth: 240,
            maxWidth: 240,
            p: 1.5,
            borderTop: 4,
            borderTopColor: status.color ?? "grey.400",
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {status.name}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
