import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";
import { useNavigate, useParams } from "react-router-dom";

import { deleteProject, updateProject } from "../api";
import { useProjects } from "./ProjectsContext";
import { ProjectBoard } from "./components/ProjectBoard";
import { ProjectDialog } from "./components/ProjectDialog";
import type { StatusDraft } from "./components/StatusRow";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";
import { ManageStatusesDialog } from "./components/ManageStatusesDialog";

export function ProjectPage() {
  const { projectId = "" } = useParams();
  const { projects, loading, refresh } = useProjects();
  const navigate = useNavigate();

  const project = projects.find((p) => p.id === projectId) ?? null;

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const openEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSubmitting) return;
    setEditOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!project) return;
    setEditError("");
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required");
      return;
    }

    setEditSubmitting(true);
    try {
      await updateProject(project.id, {
        name,
        description: editDescription.trim() || null,
      });
      await refresh();
      setEditOpen(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setDeleteSubmitting(true);
    try {
      await deleteProject(project.id);
      await refresh();
      setDeleteOpen(false);
      navigate("/projects", { replace: true });
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to delete");
      setDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading && !project) {
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
        Project not found
      </Typography>
    );
  }

  return (
    <Stack spacing={2} alignItems="stretch">
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
          <Button variant="outlined" startIcon={<EditIcon />} onClick={openEdit}>
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={() => setManageOpen(true)}
          >
            Manage statuses
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </Stack>
      </Stack>
      <Divider />
      <ProjectBoard key={boardKey} projectId={project.id} />

      <ProjectDialog
        mode={editOpen ? "edit" : null}
        step={1}
        name={editName}
        description={editDescription}
        statuses={[] as StatusDraft[]}
        error={editError}
        submitting={editSubmitting}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onStatusesChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onClose={closeEdit}
        onSubmit={() => void handleEditSubmit()}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        projectName={project.name}
        submitting={deleteSubmitting}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <ManageStatusesDialog
        open={manageOpen}
        projectId={project.id}
        onClose={() => setManageOpen(false)}
        onSaved={() => setBoardKey((k) => k + 1)}
      />
    </Stack>
  );
}
