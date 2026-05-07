import { MenuItem, TextField, Typography } from "@mui/material";

import type { TaskPriority } from "../../api";
import { taskPriorityOrDefault } from "../utils/taskPriority";

type TaskPrioritySelectProps = {
  priority: TaskPriority | string | null | undefined;
  disabled: boolean;
  onChange: (priority: TaskPriority) => void;
};

export function TaskPrioritySelect({
  priority,
  disabled,
  onChange,
}: TaskPrioritySelectProps) {
  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Priority
      </Typography>
      <TextField
        select
        size="small"
        value={taskPriorityOrDefault(priority)}
        onChange={(e) => onChange(e.target.value as TaskPriority)}
        disabled={disabled}
        fullWidth
      >
        <MenuItem value="low">Low</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="high">High</MenuItem>
      </TextField>
    </>
  );
}
