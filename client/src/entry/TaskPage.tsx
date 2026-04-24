import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useParams } from "react-router-dom";

import { getTask, type Task } from "../api";
import { useSetTaskBreadcrumb } from "./BreadcrumbContext";

export function TaskPage() {
  const { projectId = "", taskId = "" } = useParams();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const t = await getTask(projectId, taskId);
        if (!cancelled) setTask(t);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load task");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, taskId]);

  useSetTaskBreadcrumb(task?.title ?? null);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!task) {
    return (
      <Typography variant="h6" color="text.secondary">
        Task not found
      </Typography>
    );
  }

  return (
    <Stack spacing={2} alignItems="flex-start" maxWidth={720}>
      <Button
        component={RouterLink}
        to={`/projects/${projectId}`}
        startIcon={<ArrowBackIcon />}
        size="small"
      >
        Back to project
      </Button>
      <Typography variant="h4" component="h1" color="text.primary">
        {task.title}
      </Typography>
      {task.description ? (
        <Typography
          variant="body1"
          color="text.primary"
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {task.description}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No description
        </Typography>
      )}
    </Stack>
  );
}
