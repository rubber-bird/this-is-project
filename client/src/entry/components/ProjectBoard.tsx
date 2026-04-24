import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";

import {
  createTask,
  listTasks,
  listWorkflowStatuses,
  type Task,
  type WorkflowStatus,
} from "../../api";
import { TaskDialog } from "./TaskDialog";

type ProjectBoardProps = {
  projectId: string;
};

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [statusList, taskList] = await Promise.all([
          listWorkflowStatuses(projectId),
          listTasks(projectId),
        ]);
        if (!cancelled) {
          setStatuses(statusList);
          setTasks(taskList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load board");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const openDialog = () => {
    setDialogTitle("");
    setDialogDescription("");
    setDialogError("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (dialogSubmitting) return;
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    setDialogError("");
    const title = dialogTitle.trim();
    if (!title) {
      setDialogError("Title is required");
      return;
    }

    setDialogSubmitting(true);
    try {
      const created = await createTask(projectId, {
        title,
        description: dialogDescription.trim() || null,
      });
      setTasks((prev) => [...prev, created]);
      setDialogOpen(false);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDialogSubmitting(false);
    }
  };

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
    <Stack spacing={2} alignItems="stretch">
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openDialog}
        sx={{ alignSelf: "flex-start" }}
      >
        Add task
      </Button>

      <Stack
        direction="row"
        spacing={2}
        sx={{ overflowX: "auto", pb: 1 }}
        alignItems="stretch"
      >
        {statuses.map((status) => {
          const statusTasks = tasks.filter(
            (t) => t.workflow_status_id === status.id,
          );
          return (
            <Paper
              key={status.id}
              variant="outlined"
              sx={{
                minWidth: 240,
                maxWidth: 240,
                p: 1.5,
                borderTop: 4,
                borderTopColor: status.color ?? "grey.400",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {status.name}
              </Typography>
              <Stack spacing={1}>
                {statusTasks.map((task) => (
                  <Paper
                    key={task.id}
                    variant="outlined"
                    onClick={() =>
                      navigate(`/projects/${projectId}/tasks/${task.id}`)
                    }
                    sx={{
                      p: 1,
                      bgcolor: "background.default",
                      cursor: "pointer",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {task.title}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <TaskDialog
        open={dialogOpen}
        title={dialogTitle}
        description={dialogDescription}
        error={dialogError}
        submitting={dialogSubmitting}
        onTitleChange={setDialogTitle}
        onDescriptionChange={setDialogDescription}
        onClose={closeDialog}
        onSubmit={() => void handleSubmit()}
      />
    </Stack>
  );
}
