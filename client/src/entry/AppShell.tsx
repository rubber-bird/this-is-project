import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Outlet, useNavigate } from "react-router-dom";

import { signOut, createProject, createWorkflowStatuses } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ProjectsProvider, useProjects } from "./ProjectsContext";
import { BreadcrumbProvider } from "./BreadcrumbContext";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ProjectDialog } from "./components/ProjectDialog";
import type { StatusDraft } from "./components/StatusRow";
import { AppBreadcrumbs } from "./components/AppBreadcrumbs";

const DRAWER_WIDTH = 240;

export function AppShell() {
  return (
    <ProjectsProvider>
      <BreadcrumbProvider>
        <ShellLayout />
      </BreadcrumbProvider>
    </ProjectsProvider>
  );
}

function ShellLayout() {
  const { user, setUser } = useAuth();
  const { projects, loading, error, refresh } = useProjects();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatuses, setCreateStatuses] = useState<StatusDraft[]>([]);
  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const gn = user?.given_name?.[0] ?? "?";
  const fn = user?.family_name?.[0] ?? "?";
  const initials = `${gn}${fn}`.toUpperCase();

  const openCreate = () => {
    setCreateStep(1);
    setCreateName("");
    setCreateDescription("");
    setCreateStatuses([{ key: crypto.randomUUID(), name: "", color: "" }]);
    setCreateError("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createSubmitting) return;
    setCreateOpen(false);
  };

  const handleCreateNext = () => {
    setCreateError("");
    if (createName.trim() === "") {
      setCreateError("Name is required");
      return;
    }
    setCreateStep(2);
  };

  const handleCreateBack = () => {
    if (createSubmitting) return;
    setCreateError("");
    setCreateStep(1);
  };

  const handleCreateSubmit = async () => {
    setCreateError("");
    const name = createName.trim();
    if (!name) {
      setCreateError("Name is required");
      setCreateStep(1);
      return;
    }
    const rows = createStatuses
      .map((s) => ({ name: s.name.trim(), color: s.color || null }))
      .filter((s) => s.name !== "");
    if (rows.length === 0) {
      setCreateError("Add at least one status");
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await createProject({
        name,
        description: createDescription.trim() || null,
      });
      try {
        await createWorkflowStatuses(created.id, rows);
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Request failed");
        await refresh();
        navigate(`/projects/${created.id}`);
        setCreateSubmitting(false);
        return;
      }
      await refresh();
      setCreateOpen(false);
      navigate(`/projects/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
    navigate("/login", { replace: true });
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
            <MenuItem disabled>{user?.email}</MenuItem>
            <MenuItem onClick={handleLogout}>Log out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <ProjectSidebar
        drawerOpen={drawerOpen}
        drawerWidth={DRAWER_WIDTH}
        loading={loading}
        loadError={error}
        projects={projects}
        onCreate={openCreate}
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
          <AppBreadcrumbs />
          <Outlet />
        </Box>
      </Box>

      <ProjectDialog
        mode={createOpen ? "create" : null}
        step={createStep}
        name={createName}
        description={createDescription}
        statuses={createStatuses}
        error={createError}
        submitting={createSubmitting}
        onNameChange={setCreateName}
        onDescriptionChange={setCreateDescription}
        onStatusesChange={setCreateStatuses}
        onNext={handleCreateNext}
        onBack={handleCreateBack}
        onClose={closeCreate}
        onSubmit={() => void handleCreateSubmit()}
      />
    </Box>
  );
}
