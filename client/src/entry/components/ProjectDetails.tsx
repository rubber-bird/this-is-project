import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { Project } from "../../api";

type ProjectDetailsProps = {
  loading: boolean;
  project: Project | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProjectDetails({
  loading,
  project,
  onEdit,
  onDelete,
}: ProjectDetailsProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!project) {
    return (
      <Typography variant="h6" color="text.secondary">
        Select or create a project
      </Typography>
    );
  }

  return (
    <Stack spacing={2} alignItems="flex-start" maxWidth={560}>
      <Typography variant="h4" component="h1" color="text.primary">
        {project.name}
      </Typography>
      {project.description ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {project.description}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No description
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>
          Edit
        </Button>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDelete}
        >
          Delete
        </Button>
      </Stack>
    </Stack>
  );
}
