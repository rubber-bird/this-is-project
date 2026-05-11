import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

import { type Task, type User, type WorkflowStatus } from "../../api";
import { TaskBoardCardRow } from "./TaskBoardCardRow";
import { TaskDialog } from "./TaskDialog";
import { TaskEditorModal } from "./TaskEditorModal";
import { useProjectBoard } from "../hooks/useProjectBoard";

type ProjectBoardProps = {
  projectId: string;
};

const dndTaskId = (id: string) => `task:${id}`;
const dndColId = (id: string) => `col:${id}`;

const userInitials = (u: User) =>
  `${u.given_name?.[0] ?? "?"}${u.family_name?.[0] ?? "?"}`.toUpperCase();
const userFullName = (u: User) => `${u.given_name} ${u.family_name}`;

function DraggableTaskCard({
  task,
  users,
  onOpen,
  disabled,
}: {
  task: Task;
  users: User[];
  onOpen: (task: Task) => void;
  disabled: boolean;
}) {
  const id = dndTaskId(task.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1,
      }
    : undefined;

  const assignee = task.assigned_to
    ? users.find((u) => u.id === task.assigned_to) ?? null
    : null;

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      {...attributes}
      style={style}
      sx={{
        p: 1,
        display: "flex",
        gap: 0.5,
        alignItems: "flex-start",
        bgcolor: "background.default",
        opacity: isDragging ? 0.45 : 1,
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main" },
      }}
      onClick={() => onOpen(task)}
    >
      <TaskBoardCardRow
        title={task.title}
        priority={task.priority}
        leading={
          <IconButton
            size="small"
            {...listeners}
            aria-label="Drag to move task"
            onClick={(e) => e.stopPropagation()}
            sx={{ mt: -0.25, cursor: "grab" }}
            disabled={disabled}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        }
        trailing={
          assignee ? (
            <Tooltip title={userFullName(assignee)}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: 11,
                  bgcolor: "primary.main",
                }}
              >
                {userInitials(assignee)}
              </Avatar>
            </Tooltip>
          ) : null
        }
      />
    </Paper>
  );
}

function StatusColumn({
  status,
  columnTasks,
  users,
  onOpenTask,
  moving,
}: {
  status: WorkflowStatus;
  columnTasks: Task[];
  users: User[];
  onOpenTask: (task: Task) => void;
  moving: boolean;
}) {
  const colId = dndColId(status.id);
  const { setNodeRef, isOver } = useDroppable({
    id: colId,
    disabled: moving,
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
        outline: isOver ? "2px dashed" : "none",
        outlineColor: "primary.main",
        outlineOffset: 2,
        bgcolor: isOver ? "action.hover" : "background.paper",
      }}
    >
      <Typography variant="subtitle2" fontWeight={600}>
        {status.name}
      </Typography>
      <Stack spacing={1} sx={{ minHeight: 120, flex: 1 }}>
        {columnTasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            users={users}
            onOpen={onOpenTask}
            disabled={moving}
          />
        ))}
      </Stack>
    </Paper>
  );
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const {
    statuses,
    tasksByStatusId,
    loading,
    error,
    moveError,
    moving,
    sensors,
    activeTask,
    handleDragStart,
    handleDragEnd,
    dialogOpen,
    dialogTitle,
    dialogError,
    dialogSubmitting,
    setDialogTitle,
    openDialog,
    closeDialog,
    handleCreateSubmit,
    editorOpen,
    selectedTask,
    saveError,
    savingTask,
    deletingTask,
    openEditor,
    closeEditor,
    handleSaveTask,
    handleDeleteTask,
    handleStatusChange,
    handleAssigneeChange,
    handleDeadlineChange,
    handlePriorityChange,
    users,
  } = useProjectBoard(projectId);

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
      {moveError ? <Alert severity="error">{moveError}</Alert> : null}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openDialog}
        sx={{ alignSelf: "flex-start" }}
        disabled={moving}
      >
        Add task
      </Button>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ overflowX: "auto", pb: 1 }}
          alignItems="stretch"
        >
          {statuses.map((status) => (
            <StatusColumn
              key={status.id}
              status={status}
              columnTasks={tasksByStatusId.get(status.id) ?? []}
              users={users}
              onOpenTask={openEditor}
              moving={moving}
            />
          ))}
        </Stack>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                display: "flex",
                gap: 0.5,
                alignItems: "flex-start",
                minWidth: 200,
                bgcolor: "background.default",
                boxShadow: 3,
              }}
            >
              <TaskBoardCardRow
                title={activeTask.title}
                priority={activeTask.priority}
                leading={
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: "action.active",
                      pl: 0.25,
                      pt: 0.25,
                    }}
                    aria-hidden
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Box>
                }
              />
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        title={dialogTitle}
        error={dialogError}
        submitting={dialogSubmitting}
        onTitleChange={setDialogTitle}
        onClose={closeDialog}
        onSubmit={(title, blockNoteData) =>
          void handleCreateSubmit(title, blockNoteData)
        }
      />
      <TaskEditorModal
        open={editorOpen}
        task={selectedTask}
        statuses={statuses}
        users={users}
        saving={savingTask}
        error={saveError}
        onClose={closeEditor}
        onSave={handleSaveTask}
        onStatusChange={(taskId, statusId) =>
          void handleStatusChange(taskId, statusId)
        }
        onDeadlineChange={(taskId, deadline) =>
          void handleDeadlineChange(taskId, deadline)
        }
        onPriorityChange={(taskId, priority) =>
          void handlePriorityChange(taskId, priority)
        }
        onAssigneeChange={(taskId, assigneeId) =>
          void handleAssigneeChange(taskId, assigneeId)
        }
        onDelete={() => void handleDeleteTask()}
        deleting={deletingTask}
      />
    </Stack>
  );
}
