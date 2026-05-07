import { Box } from "@mui/material";

import type { TaskPriority } from "../../api";
import {
  priorityMarkerColor,
  taskPriorityOrDefault,
} from "../utils/taskPriority";

type TaskPriorityDotProps = {
  priority: TaskPriority | string | null | undefined;
};

export function TaskPriorityDot({ priority }: TaskPriorityDotProps) {
  const p = taskPriorityOrDefault(priority);
  return (
    <Box
      component="span"
      title={`Priority: ${p}`}
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0,
        mt: 0.75,
        bgcolor: priorityMarkerColor(p),
        boxShadow: 1,
      }}
    />
  );
}
