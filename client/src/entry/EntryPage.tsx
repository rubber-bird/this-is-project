import { useCallback, useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Box,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import type { User, Project } from "../api";
import {
  signOut,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ProjectDetails } from "./components/ProjectDetails";
import { ProjectDialog } from "./components/ProjectDialog";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";

const DRAWER_WIDTH = 240;

type ProjectDialogMode = "create" | "edit" | null;

export const EntryPage = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<ProjectDialogMode>(null);
  const [dialogName, setDialogName] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const gn = user.given_name?.[0] ?? "?";
  const fn = user.family_name?.[0] ?? "?";
  const initials = `${gn}${fn}`.toUpperCase();

  const refreshProjects = useCallback(async () => {
    setLoadError("");
    const list = await listProjects();
    setProjects(list);
    setSelectedId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        await refreshProjects();
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load projects",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProjects]);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const openCreateDialog = () => {
    setDialogMode("create");
    setDialogName("");
    setDialogDescription("");
    setDialogError("");
  };

  const openEditDialog = () => {
    if (!selected) return;
    setDialogMode("edit");
    setDialogName(selected.name);
    setDialogDescription(selected.description ?? "");
    setDialogError("");
  };

  const closeDialog = () => {
    if (dialogSubmitting) return;
    setDialogMode(null);
  };

  const handleDialogSubmit = async () => {
    setDialogError("");
    const name = dialogName.trim();
    if (!name) {
      setDialogError("Name is required");
      return;
    }
    setDialogSubmitting(true);
    try {
      if (dialogMode === "create") {
        const created = await createProject({
          name,
          description: dialogDescription.trim() || null,
        });
        await refreshProjects();
        setSelectedId(created.id);
      } else if (dialogMode === "edit" && selected) {
        await updateProject(selected.id, {
          name,
          description: dialogDescription.trim() || null,
        });
        await refreshProjects();
      }
      setDialogMode(null);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDialogSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteSubmitting(true);
    try {
      await deleteProject(selected.id);
      setDeleteOpen(false);
      await refreshProjects();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to delete");
      setDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    onLogout();
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            sx={{ mr: 2 }}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 36,
                height: 36,
                fontSize: 14,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>{user.email}</MenuItem>
            <MenuItem onClick={handleLogout}>Log out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <ProjectSidebar
        drawerOpen={drawerOpen}
        drawerWidth={DRAWER_WIDTH}
        loading={loading}
        loadError={loadError}
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={openCreateDialog}
      />

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
          <ProjectDetails
            loading={loading}
            project={selected}
            onEdit={openEditDialog}
            onDelete={() => setDeleteOpen(true)}
          />
        </Box>
      </Box>

      <ProjectDialog
        mode={dialogMode}
        name={dialogName}
        description={dialogDescription}
        error={dialogError}
        submitting={dialogSubmitting}
        onNameChange={setDialogName}
        onDescriptionChange={setDialogDescription}
        onClose={closeDialog}
        onSubmit={() => void handleDialogSubmit()}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        projectName={selected?.name}
        submitting={deleteSubmitting}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </Box>
  );
};
