import { Breadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink, useMatch } from "react-router-dom";

import { useProjects } from "../ProjectsContext";
import { useTaskBreadcrumb } from "../BreadcrumbContext";

export function AppBreadcrumbs() {
  const projectMatch = useMatch("/projects/:projectId/*");
  const taskMatch = useMatch("/projects/:projectId/tasks/:taskId");
  const { projects } = useProjects();
  const taskTitle = useTaskBreadcrumb();

  const projectId = projectMatch?.params.projectId ?? null;
  const taskId = taskMatch?.params.taskId ?? null;
  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  const projectsIsTerminal = projectId === null;
  const projectIsTerminal = projectId !== null && taskId === null;

  return (
    <Breadcrumbs sx={{ mb: 2 }}>
      {projectsIsTerminal ? (
        <Typography color="text.primary">Projects</Typography>
      ) : (
        <Link component={RouterLink} to="/projects" underline="hover">
          Projects
        </Link>
      )}
      {projectId &&
        (projectIsTerminal ? (
          <Typography color="text.primary">
            {project?.name ?? projectId}
          </Typography>
        ) : (
          <Link
            component={RouterLink}
            to={`/projects/${projectId}`}
            underline="hover"
          >
            {project?.name ?? projectId}
          </Link>
        ))}
      {taskId && (
        <Typography color="text.primary">{taskTitle ?? taskId}</Typography>
      )}
    </Breadcrumbs>
  );
}
