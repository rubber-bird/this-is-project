import { TextField, Typography } from "@mui/material";

type TaskDeadlineFieldProps = {
  value: string;
  disabled: boolean;
  onChange: (nextValue: string) => void;
};

export function TaskDeadlineField({
  value,
  disabled,
  onChange,
}: TaskDeadlineFieldProps) {
  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Deadline
      </Typography>
      <TextField
        type="date"
        size="small"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </>
  );
}
