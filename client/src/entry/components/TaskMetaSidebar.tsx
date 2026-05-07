import { MenuItem, Stack, TextField, Typography } from "@mui/material";

import type { TaskPriority, User, WorkflowStatus } from "../../api";
import { TaskDeadlineField } from "./TaskDeadlineField";
import { TaskPrioritySelect } from "./TaskPrioritySelect";

export type TaskMetaSidebarProps = {
  statuses: WorkflowStatus[];
  workflowStatusId: string;
  priority: TaskPriority | string | null | undefined;
  deadlineDraft: string;
  statusSelectDisabled: boolean;
  priorityDeadlineDisabled: boolean;
  onWorkflowStatusChange: (statusId: string) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onDeadlineDraftChange: (nextDraft: string) => void;
  users?: User[];
  assigneeId?: string | null;
  assigneeDisabled?: boolean;
  onAssigneeChange?: (assigneeId: string | null) => void;
};

export function TaskMetaSidebar({
  statuses,
  workflowStatusId,
  priority,
  deadlineDraft,
  statusSelectDisabled,
  priorityDeadlineDisabled,
  onWorkflowStatusChange,
  onPriorityChange,
  onDeadlineDraftChange,
  users,
  assigneeId,
  assigneeDisabled,
  onAssigneeChange,
}: TaskMetaSidebarProps) {
  return (
    <Stack spacing={1} sx={{ width: 220, flexShrink: 0 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Status
      </Typography>
      <TextField
        select
        size="small"
        value={workflowStatusId}
        onChange={(e) => onWorkflowStatusChange(e.target.value)}
        disabled={statusSelectDisabled}
        fullWidth
      >
        {statuses.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
      <TaskPrioritySelect
        priority={priority}
        disabled={priorityDeadlineDisabled}
        onChange={onPriorityChange}
      />
      <TaskDeadlineField
        value={deadlineDraft}
        disabled={priorityDeadlineDisabled}
        onChange={onDeadlineDraftChange}
      />
      {users && onAssigneeChange ? (
        <>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ pt: 1 }}
          >
            Assignee
          </Typography>
          <TextField
            select
            size="small"
            value={assigneeId ?? ""}
            onChange={(e) => onAssigneeChange(e.target.value || null)}
            disabled={assigneeDisabled}
            fullWidth
          >
            <MenuItem value="">
              <em>Unassigned</em>
            </MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.given_name} {u.family_name}
              </MenuItem>
            ))}
          </TextField>
        </>
      ) : null}
    </Stack>
  );
}
