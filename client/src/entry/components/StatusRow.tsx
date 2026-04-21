import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export type StatusDraft = {
  key: string;
  name: string;
  color: string;
};

type StatusRowProps = {
  status: StatusDraft;
  disabled: boolean;
  canRemove: boolean;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onRemove: () => void;
};

export function StatusRow({
  status,
  disabled,
  canRemove,
  onNameChange,
  onColorChange,
  onRemove,
}: StatusRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.key, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Stack
      ref={setNodeRef}
      direction="row"
      spacing={1}
      alignItems="center"
      style={style}
    >
      <Tooltip title="Drag to reorder">
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          disabled={disabled}
          sx={{ cursor: disabled ? "default" : "grab" }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <TextField
        label="Name"
        value={status.name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={disabled}
        size="small"
        sx={{ flex: 1 }}
        required
      />
      <Box
        component="input"
        type="color"
        value={status.color || "#999999"}
        onChange={(e) => onColorChange(e.target.value)}
        disabled={disabled}
        sx={{
          width: 36,
          height: 36,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          padding: 0,
          background: "none",
          cursor: disabled ? "default" : "pointer",
        }}
      />
      <IconButton
        size="small"
        onClick={onRemove}
        disabled={disabled || !canRemove}
        aria-label="Remove status"
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
