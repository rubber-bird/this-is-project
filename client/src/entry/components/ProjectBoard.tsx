import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
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
import { useCreateBlockNote } from "@blocknote/react";

import { type Task, type WorkflowStatus } from "../../api";
import { TaskDialog } from "./TaskDialog";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import { blocksFromStoredDescription } from "../utils/taskDescriptionBlocks";
import { useProjectBoard } from "../hooks/useProjectBoard";

type ProjectBoardProps = {
  projectId: string;
};

const dndTaskId = (id: string) => `task:${id}`;
const dndColId = (id: string) => `col:${id}`;

function DraggableTaskCard({
  task,
  onOpen,
  disabled,
}: {
  task: Task;
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
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, pt: 0.25 }}>
        {task.title}
      </Typography>
    </Paper>
  );
}

function StatusColumn({
  status,
  columnTasks,
  onOpenTask,
  moving,
}: {
  status: WorkflowStatus;
  columnTasks: Task[];
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
            onOpen={onOpenTask}
            disabled={moving}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function TaskEditorModal({
  open,
  task,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  task: Task | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState("");
  const editor = useCreateBlockNote({}, [task?.id ?? ""]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    const blocks = blocksFromStoredDescription(task.description);
    editor.replaceBlocks(editor.document, blocks);
  }, [task, editor]);

  const handleSave = () => {
    onSave(title, JSON.stringify(editor.document));
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle color="text.primary">Edit task</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            disabled={saving}
          />
          <TaskDescriptionEditor
            editor={editor}
            editable={!saving}
            variant="page"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
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
    openEditor,
    closeEditor,
    handleSaveTask,
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
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ flex: 1, pt: 0.25 }}
              >
                {activeTask.title}
              </Typography>
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
        onSubmit={(title, description) =>
          void handleCreateSubmit(title, description)
        }
      />
      <TaskEditorModal
        open={editorOpen}
        task={selectedTask}
        saving={savingTask}
        error={saveError}
        onClose={closeEditor}
        onSave={handleSaveTask}
      />
    </Stack>
  );
}
