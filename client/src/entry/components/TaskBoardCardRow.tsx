import { Typography } from "@mui/material";
import type { ReactNode } from "react";

import type { TaskPriority } from "../../api";
import { TaskPriorityDot } from "./TaskPriorityDot";

type TaskBoardCardRowProps = {
  title: string;
  priority: TaskPriority | string | null | undefined;
  leading: ReactNode;
  trailing?: ReactNode;
};

export function TaskBoardCardRow({
  title,
  priority,
  leading,
  trailing,
}: TaskBoardCardRowProps) {
  return (
    <>
      {leading}
      <TaskPriorityDot priority={priority} />
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, pt: 0.25 }}>
        {title}
      </Typography>
      {trailing}
    </>
  );
}
