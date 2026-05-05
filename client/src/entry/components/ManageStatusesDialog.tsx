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
  Stack,
  Typography,
} from "@mui/material";
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

import {
  deleteWorkflowStatus,
  listWorkflowStatuses,
  reorderWorkflowStatuses,
  updateWorkflowStatus,
  type WorkflowStatus,
} from "../../api";
import { StatusRow, type StatusDraft } from "./StatusRow";

type ManageStatusesDialogProps = {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type Row = StatusDraft & {
  originalName: string;
  originalColor: string;
};

function toRow(s: WorkflowStatus): Row {
  const color = s.color ?? "";
  return {
    key: s.id,
    name: s.name,
    color,
    originalName: s.name,
    originalColor: color,
  };
}

export function ManageStatusesDialog({
  open,
  projectId,
  onClose,
  onSaved,
}: ManageStatusesDialogProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const list = await listWorkflowStatuses(projectId);
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.position - b.position);
        setRows(sorted.map(toRow));
        setInitialOrder(sorted.map((s) => s.id));
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
  }, [open, projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.key === active.id);
    const newIndex = rows.findIndex((r) => r.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setRows(arrayMove(rows, oldIndex, newIndex));
  };

  const updateRow = (key: string, patch: Partial<StatusDraft>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };

  const handleRemove = async (key: string) => {
    setError("");
    setSubmitting(true);
    try {
      const updated = await deleteWorkflowStatus(projectId, key);
      const sorted = [...updated].sort((a, b) => a.position - b.position);
      setRows(sorted.map(toRow));
      setInitialOrder(sorted.map((s) => s.id));
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    setError("");

    const trimmed = rows.map((r) => ({ ...r, name: r.name.trim() }));
    const empty = trimmed.find((r) => r.name === "");
    if (empty) {
      setError("Status names cannot be empty");
      return;
    }
    const lowerNames = trimmed.map((r) => r.name.toLowerCase());
    const dup = lowerNames.find((n, i) => lowerNames.indexOf(n) !== i);
    if (dup) {
      setError(`Duplicate status name: ${dup}`);
      return;
    }

    const changed = trimmed.filter(
      (r) => r.name !== r.originalName || r.color !== r.originalColor,
    );
    const newOrder = trimmed.map((r) => r.key);
    const orderChanged =
      newOrder.length !== initialOrder.length ||
      newOrder.some((id, i) => id !== initialOrder[i]);

    if (changed.length === 0 && !orderChanged) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      for (const row of changed) {
        const patch: { name?: string; color?: string | null } = {};
        if (row.name !== row.originalName) patch.name = row.name;
        if (row.color !== row.originalColor) patch.color = row.color || null;
        await updateWorkflowStatus(projectId, row.key, patch);
      }
      if (orderChanged) {
        await reorderWorkflowStatuses(projectId, newOrder);
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      await onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const dragged = rows.find((r) => r.key === draggingId) ?? null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle color="text.primary">Manage statuses</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
          <Typography variant="body2" color="text.secondary">
            Edit names and colors, or drag to reorder.
          </Typography>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((r) => r.key)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1}>
                {rows.map((row) => (
                  <StatusRow
                    key={row.key}
                    status={row}
                    disabled={submitting}
                    canRemove={rows.length > 1}
                    onNameChange={(value) => updateRow(row.key, { name: value })}
                    onColorChange={(value) =>
                      updateRow(row.key, { color: value })
                    }
                    onRemove={() => void handleRemove(row.key)}
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
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || loading || rows.length === 0}
        >
          {submitting ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
