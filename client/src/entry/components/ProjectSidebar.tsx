import {
  Drawer,
  Toolbar,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import type { Project } from "../../api";

type ProjectSidebarProps = {
  drawerOpen: boolean;
  drawerWidth: number;
  loading: boolean;
  loadError: string;
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export function ProjectSidebar({
  drawerOpen,
  drawerWidth,
  loading,
  loadError,
  projects,
  selectedId,
  onSelect,
  onCreate,
}: ProjectSidebarProps) {
  return (
    <Drawer
      variant="persistent"
      open={drawerOpen}
      sx={{
        width: drawerOpen ? drawerWidth : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
          pl: 2,
          py: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Projects
        </Typography>
        <IconButton size="small" aria-label="New project" onClick={onCreate}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : loadError ? (
        <Alert severity="error" sx={{ mx: 1 }}>
          {loadError}
        </Alert>
      ) : (
        <List disablePadding>
          {projects.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1 }}
            >
              No projects yet
            </Typography>
          ) : (
            projects.map((project) => (
              <ListItemButton
                key={project.id}
                selected={project.id === selectedId}
                onClick={() => onSelect(project.id)}
              >
                <ListItemText
                  primary={project.name}
                  secondary={project.description ?? undefined}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      )}
    </Drawer>
  );
}
