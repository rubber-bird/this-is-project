import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";

import { StatusRow, type StatusDraft } from "./StatusRow";

type ProjectDialogMode = "create" | "edit" | null;

type ProjectDialogProps = {
  mode: ProjectDialogMode;
  step: 1 | 2;
  name: string;
  description: string;
  statuses: StatusDraft[];
  error: string;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusesChange: (next: StatusDraft[]) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ProjectDialog({
  mode,
  step,
  name,
  description,
  statuses,
  error,
  submitting,
  onNameChange,
  onDescriptionChange,
  onStatusesChange,
  onNext,
  onBack,
  onClose,
  onSubmit,
}: ProjectDialogProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isCreate = mode === "create";
  const showStep2 = isCreate && step === 2;

  const title = isCreate
    ? showStep2
      ? "Add statuses"
      : "New project"
    : "Edit project";

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = statuses.findIndex((s) => s.key === active.id);
    const newIndex = statuses.findIndex((s) => s.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onStatusesChange(arrayMove(statuses, oldIndex, newIndex));
  };

  const updateStatus = (key: string, patch: Partial<StatusDraft>) => {
    onStatusesChange(
      statuses.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  };

  const removeStatus = (key: string) => {
    onStatusesChange(statuses.filter((s) => s.key !== key));
  };

  const addStatus = () => {
    onStatusesChange([
      ...statuses,
      { key: crypto.randomUUID(), name: "", color: "" },
    ]);
  };

  const nonEmptyCount = statuses.filter((s) => s.name.trim() !== "").length;
  const canFinish = !submitting && nonEmptyCount >= 1;
  const canNext = name.trim() !== "";
  const dragged = statuses.find((s) => s.key === draggingId) ?? null;

  return (
    <Dialog open={mode !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle color="text.primary">{title}</DialogTitle>
      <DialogContent>
        {!showStep2 ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Name"
              required
              fullWidth
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={submitting}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              disabled={submitting}
            />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Define the stages tasks will move through in this project. Drag
              to reorder.
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={statuses.map((s) => s.key)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1}>
                  {statuses.map((status) => (
                    <StatusRow
                      key={status.key}
                      status={status}
                      disabled={submitting}
                      canRemove={statuses.length > 1}
                      onNameChange={(value) =>
                        updateStatus(status.key, { name: value })
                      }
                      onColorChange={(value) =>
                        updateStatus(status.key, { color: value })
                      }
                      onRemove={() => removeStatus(status.key)}
                    />
                  ))}
                </Stack>
              </SortableContext>
              <DragOverlay>
                {dragged ? (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      boxShadow: 3,
                    }}
                  >
                    <Typography variant="body2">
                      {dragged.name || "Untitled status"}
                    </Typography>
                  </Box>
                ) : null}
              </DragOverlay>
            </DndContext>
            <Button
              startIcon={<AddIcon />}
              onClick={addStatus}
              disabled={submitting}
              sx={{ alignSelf: "flex-start" }}
            >
              Add status
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {showStep2 ? (
          <>
            <Button onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={!canFinish}
            >
              {submitting ? "Creating…" : "Finish"}
            </Button>
          </>
        ) : isCreate ? (
          <>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={onNext}
              disabled={!canNext || submitting}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={submitting || name.trim() === ""}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
