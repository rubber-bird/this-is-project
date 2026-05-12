import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
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
      {...attributes}
      style={style}
      sx={{
        p: 1.25,
        display: "flex",
        gap: 0.5,
        alignItems: "flex-start",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        opacity: isDragging ? 0.5 : 1,
        cursor: "pointer",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
        },
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
            sx={{ mt: -0.25, cursor: "grab", color: "text.secondary" }}
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

  const accentColor = status.color ?? "#94a3b8";
  const tintedBg = alpha(accentColor, 0.08);

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        minWidth: 280,
        maxWidth: 280,
        p: 0,
        border: "1px solid",
        borderColor: "divider",
        borderTop: `4px solid ${accentColor}`,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        outline: isOver ? "2px dashed" : "none",
        outlineColor: "primary.main",
        outlineOffset: 2,
        bgcolor: "background.paper",
        transition: "box-shadow 120ms ease",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.75,
          py: 1.25,
          bgcolor: tintedBg,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: "text.primary", flex: 1 }}
        >
          {status.name}
        </Typography>
        <Chip
          size="small"
          label={columnTasks.length}
          sx={{
            height: 22,
            minWidth: 28,
            bgcolor: alpha(accentColor, 0.18),
            color: accentColor,
            fontWeight: 700,
            "& .MuiChip-label": { px: 1 },
          }}
        />
      </Box>
      <Stack
        spacing={1}
        sx={{
          minHeight: 140,
          flex: 1,
          p: 1.5,
          bgcolor: isOver ? "action.hover" : "transparent",
          transition: "background-color 120ms ease",
        }}
      >
        {columnTasks.length === 0 ? (
          <Stack
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
            sx={{
              flex: 1,
              py: 3,
              color: "text.secondary",
              textAlign: "center",
            }}
          >
            <InboxRoundedIcon sx={{ fontSize: 28, opacity: 0.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              No tasks
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Tasks in this status will appear here.
            </Typography>
          </Stack>
        ) : (
          columnTasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              users={users}
              onOpen={onOpenTask}
              disabled={moving}
            />
          ))
        )}
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
        size="large"
        startIcon={<AddIcon />}
        onClick={openDialog}
        sx={{
          alignSelf: "flex-start",
          px: 2.5,
          py: 1.1,
          fontSize: 14,
          fontWeight: 700,
        }}
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
