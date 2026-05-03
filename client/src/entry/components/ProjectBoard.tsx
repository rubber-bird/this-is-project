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
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  createTask,
  listTasks,
  listWorkflowStatuses,
  updateTask,
  type Task,
  type WorkflowStatus,
} from "../../api";
import { TaskDialog } from "./TaskDialog";

type ProjectBoardProps = {
  projectId: string;
};

type TaskCardProps = {
  task: Task;
  onOpen: () => void;
};

function TaskCard({ task, onOpen }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", statusId: task.workflow_status_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      onClick={onOpen}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 1,
        bgcolor: "background.default",
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <Typography variant="body2" fontWeight={500}>
        {task.title}
      </Typography>
    </Paper>
  );
}

type ColumnProps = {
  status: WorkflowStatus;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
};

function Column({ status, tasks, onOpenTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status.id}`,
    data: { type: "column", statusId: status.id },
  });

  return (
    <Paper
      ref={setNodeRef}
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
        bgcolor: isOver ? "action.hover" : undefined,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600}>
        {status.name}
      </Typography>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack spacing={1} sx={{ minHeight: 40 }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  );
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moveError, setMoveError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const sourceStatusId = active.data.current?.statusId as string | undefined;
    if (!sourceStatusId) return;

    const overData = over.data.current as
      | { type?: string; statusId?: string }
      | undefined;
    let targetStatusId: string | undefined;
    if (overData?.type === "column") {
      targetStatusId = overData.statusId;
    } else if (overData?.type === "task") {
      targetStatusId = overData.statusId;
    }
    if (!targetStatusId || targetStatusId === sourceStatusId) return;

    const snapshot = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, workflow_status_id: targetStatusId! } : t,
      ),
    );
    setMoveError("");

    void (async () => {
      try {
        const updated = await updateTask(projectId, taskId, {
          workflow_status_id: targetStatusId,
        });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch (e) {
        setTasks(snapshot);
        setMoveError(e instanceof Error ? e.message : "Failed to move task");
      }
    })();
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

  const draggedTask = tasks.find((t) => t.id === draggingId) ?? null;

  return (
    <Stack spacing={2} alignItems="stretch">
      {moveError && <Alert severity="error">{moveError}</Alert>}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openDialog}
        sx={{ alignSelf: "flex-start" }}
      >
        Add task
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ overflowX: "auto", pb: 1 }}
          alignItems="stretch"
        >
          {statuses.map((status) => (
            <Column
              key={status.id}
              status={status}
              tasks={tasks.filter((t) => t.workflow_status_id === status.id)}
              onOpenTask={(taskId) =>
                navigate(`/projects/${projectId}/tasks/${taskId}`)
              }
            />
          ))}
        </Stack>
        <DragOverlay>
          {draggedTask ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                bgcolor: "background.default",
                boxShadow: 3,
                minWidth: 216,
                maxWidth: 216,
              }}
            >
              <Typography variant="body2" fontWeight={500}>
                {draggedTask.title}
              </Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

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
