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
  ListItemIcon,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import { Link as RouterLink, useMatch } from "react-router-dom";

import type { Project } from "../../api";

type ProjectSidebarProps = {
  drawerOpen: boolean;
  drawerWidth: number;
  loading: boolean;
  loadError: string;
  projects: Project[];
  onCreate: () => void;
};

export function ProjectSidebar({
  drawerOpen,
  drawerWidth,
  loading,
  loadError,
  projects,
  onCreate,
}: ProjectSidebarProps) {
  const match = useMatch("/projects/:projectId/*");
  const selectedId = match?.params.projectId ?? null;

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
          bgcolor: "background.paper",
        },
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 72, sm: 80 } }} />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1.5,
          pl: 2.5,
          py: 1.5,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.2px",
            color: "text.primary",
          }}
        >
          Projects
        </Typography>
        <IconButton
          size="small"
          aria-label="New project"
          onClick={onCreate}
          sx={{
            bgcolor: "rgba(8, 44, 246, 0.08)",
            color: "primary.main",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "rgba(8, 44, 246, 0.16)" },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : loadError ? (
        <Alert severity="error" sx={{ mx: 1.5 }}>
          {loadError}
        </Alert>
      ) : (
        <List disablePadding sx={{ px: 1, pt: 0.5 }}>
          {projects.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1 }}
            >
              No projects yet
            </Typography>
          ) : (
            projects.map((project) => {
              const isSelected = project.id === selectedId;
              return (
                <ListItemButton
                  key={project.id}
                  component={RouterLink}
                  to={`/projects/${project.id}`}
                  selected={isSelected}
                  sx={{
                    my: 0.25,
                    py: 1,
                    px: 1.25,
                    position: "relative",
                    "&.Mui-selected::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 2,
                      bgcolor: "primary.main",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isSelected ? "primary.main" : "text.secondary",
                    }}
                  >
                    <FolderRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={project.name}
                    secondary={project.description ?? undefined}
                    primaryTypographyProps={{
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "primary.main" : "text.primary",
                      noWrap: true,
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontSize: 12,
                    }}
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      )}
    </Drawer>
  );
}
